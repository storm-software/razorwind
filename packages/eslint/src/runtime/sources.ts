/* -------------------------------------------------------------------

                    🗲 Storm Software - Razorwind

 This code was released as part of the Razorwind project. Razorwind
 is maintained by Storm Software under the Apache-2.0 license, and is
 free for commercial and private use. For more information, please visit
 our licensing page at https://stormsoftware.com/licenses/projects/razorwind.

 Website:                  https://stormsoftware.com
 Repository:               https://github.com/storm-software/razorwind
 Documentation:            https://docs.stormsoftware.com/projects/razorwind
 Contact:                  https://stormsoftware.com/contact

 SPDX-License-Identifier:  Apache-2.0

 ------------------------------------------------------------------- */

/*
 * Style source discovery: object styles (`style={{…}}`, `css({…})`,
 * `styled.div({…})`, `StyleSheet.create({…})`) and CSS tagged templates
 * (`css\`…\``, `styled.div\`…\``). Tamagui's `styled(View, {…})` config is
 * left to the `tamagui-*` rules.
 */

import type { Node, RuleContext, Visitors } from "./ast";
import { propertyKeyName, unwrap } from "./ast";
import type { ResolvedSettings } from "./settings";
import { readSettings } from "./settings";
import { toCamelCase } from "./values";

/**
 * Where a style object or template came from. `css-map`, `stylesheet` and
 * `keyframes` nest styles one level down under variant / frame keys.
 */
export type StyleKind =
  | "inline"
  | "css"
  | "css-map"
  | "keyframes"
  | "global"
  | "styled"
  | "stylesheet";

export interface StyleObject {
  node: Node;
  kind: StyleKind;
}

export interface StyleTemplate {
  /** The `TemplateLiteral`. */
  node: Node;
  /** The `TaggedTemplateExpression`. */
  tagged: Node;
  kind: StyleKind;
}

export interface StyleHandlers {
  object?: (style: StyleObject) => void;
  template?: (style: StyleTemplate) => void;
}

const CALLEE_KINDS: Readonly<Record<string, StyleKind>> = {
  cssMap: "css-map",
  keyframes: "keyframes",
  injectGlobal: "global",
  createGlobalStyle: "global"
};

function calleeKind(name: string): StyleKind {
  return CALLEE_KINDS[name] ?? "css";
}

/**
 * True for a styled factory: `styled.div`, `styled(Button)`, and their
 * `.attrs(…)` / `.withConfig(…)` chains.
 */
export function isStyledFactory(node: Node | undefined): boolean {
  const target = unwrap(node);
  if (!target) {
    return false;
  }
  if (target.type === "MemberExpression") {
    const object = target.object as Node;

    return object.type === "Identifier" && object.name === "styled";
  }
  if (target.type === "CallExpression") {
    const callee = unwrap(target.callee as Node);
    if (callee?.type === "Identifier") {
      return callee.name === "styled";
    }
    if (callee?.type === "MemberExpression") {
      const property = callee.property as Node;

      return (
        property.type === "Identifier" &&
        (property.name === "attrs" || property.name === "withConfig") &&
        isStyledFactory(callee.object as Node)
      );
    }
  }

  return false;
}

/** `styled.button` → `"button"`, `styled("button")` → `"button"`. */
export function styledTag(factory: Node | undefined): string | undefined {
  const target = unwrap(factory);
  if (target?.type === "MemberExpression") {
    const object = target.object as Node;
    const property = target.property as Node;
    if (object.type === "Identifier" && object.name === "styled") {
      return property.type === "Identifier"
        ? (property.name as string)
        : undefined;
    }
    return undefined;
  }
  if (target?.type === "CallExpression") {
    const callee = unwrap(target.callee as Node);
    if (callee?.type === "Identifier" && callee.name === "styled") {
      const [argument] = target.arguments as Node[];

      return argument?.type === "Literal" && typeof argument.value === "string"
        ? argument.value
        : undefined;
    }
    if (callee?.type === "MemberExpression") {
      return styledTag(callee.object as Node);
    }
  }

  return undefined;
}

function isStyleSheetCreate(node: Node): boolean {
  const callee = unwrap(node.callee as Node);

  return (
    callee?.type === "MemberExpression" &&
    (callee.object as Node).type === "Identifier" &&
    (callee.object as Node).name === "StyleSheet" &&
    (callee.property as Node).type === "Identifier" &&
    (callee.property as Node).name === "create"
  );
}

function styleObjects(node: Node | undefined): Node[] {
  const target = unwrap(node);
  if (target?.type === "ObjectExpression") {
    return [target];
  }
  if (target?.type === "ArrayExpression") {
    return (target.elements as (Node | null)[]).flatMap(element =>
      styleObjects(element ?? undefined)
    );
  }

  return [];
}

/**
 * Visitor factory: calls `handlers.object` for every style object and
 * `handlers.template` for every CSS tagged template.
 */
export function styleSources(
  context: RuleContext,
  handlers: StyleHandlers,
  settings: ResolvedSettings = readSettings(context)
): Visitors {
  const attributes = new Set(settings.styleAttributes);
  const callees = new Set(settings.styleCallees);

  const visitObjects = (nodes: Node[], kind: StyleKind) => {
    for (const node of nodes) {
      handlers.object?.({ node, kind });
    }
  };

  const visitors: Visitors = {};

  if (handlers.object) {
    visitors.JSXAttribute = node => {
      const name = node.name as Node;
      if (
        name.type !== "JSXIdentifier" ||
        !attributes.has(name.name as string)
      ) {
        return;
      }
      const value = node.value as Node | null;
      if (value?.type === "JSXExpressionContainer") {
        visitObjects(
          styleObjects(value.expression as Node),
          name.name === "style" ? "inline" : "css"
        );
      }
    };
    visitors.CallExpression = node => {
      const args = node.arguments as Node[];
      if (isStyledFactory(node.callee as Node)) {
        visitObjects(args.flatMap(styleObjects), "styled");
        return;
      }
      if (isStyleSheetCreate(node)) {
        visitObjects(styleObjects(args[0]), "stylesheet");
        return;
      }
      const callee = unwrap(node.callee as Node);
      if (callee?.type === "Identifier" && callees.has(callee.name as string)) {
        visitObjects(
          args.flatMap(styleObjects),
          calleeKind(callee.name as string)
        );
      }
    };
  }

  if (handlers.template) {
    visitors.TaggedTemplateExpression = node => {
      const quasi = node.quasi as Node;
      if (isStyledFactory(node.tag as Node)) {
        handlers.template?.({ node: quasi, tagged: node, kind: "styled" });
        return;
      }
      const tag = unwrap(node.tag as Node);
      const name = tag?.type === "Identifier" ? (tag.name as string) : "";
      if (callees.has(name)) {
        handlers.template?.({
          node: quasi,
          tagged: node,
          kind: calleeKind(name)
        });
      }
    };
  }

  return visitors;
}

/** True for kinds whose first level holds variant / frame keys, not styles. */
function isVariantKind(kind: StyleKind): boolean {
  return kind === "css-map" || kind === "stylesheet" || kind === "keyframes";
}

export interface StyleProperty {
  /** camelCase CSS property (`backgroundColor`). */
  name: string;
  /** The `Property` node. */
  property: Node;
  key: Node;
  value: Node;
  /** Selector / at-rule keys the property is nested under. */
  selectors: string[];
}

/**
 * Visit every style declaration in a style object, descending into nested
 * selectors, at-rules and variant keys.
 */
export function forEachStyleProperty(
  style: StyleObject,
  visit: (property: StyleProperty) => void
): void {
  const walk = (node: Node, selectors: string[], variants: boolean) => {
    for (const property of node.properties as Node[]) {
      if (property.type !== "Property") {
        continue;
      }
      const key = propertyKeyName(property);
      const value = unwrap(property.value as Node);
      if (value?.type === "ObjectExpression") {
        walk(
          value,
          variants || key === undefined ? selectors : [...selectors, key],
          false
        );
      } else if (key !== undefined && !variants && value) {
        visit({
          name: toCamelCase(key),
          property,
          key: property.key as Node,
          value: property.value as Node,
          selectors
        });
      }
    }
  };

  walk(style.node, [], isVariantKind(style.kind));
}

/** Visit every nested selector / at-rule key of a style object. */
export function forEachNestedSelector(
  style: StyleObject,
  visit: (selector: string, property: Node) => void
): void {
  const walk = (node: Node, variants: boolean) => {
    for (const property of node.properties as Node[]) {
      const value =
        property.type === "Property"
          ? unwrap(property.value as Node)
          : undefined;
      if (value?.type !== "ObjectExpression") {
        continue;
      }
      const key = propertyKeyName(property);
      if (!variants && key !== undefined) {
        visit(key, property);
      }
      walk(value, false);
    }
  };

  walk(style.node, isVariantKind(style.kind));
}

/** Placeholder standing in for `${…}` expressions in CSS text. */
export const EXPRESSION_PLACEHOLDER = "var(--__expression)";

export type ValueLeaf =
  | { node: Node; kind: "string"; text: string }
  | { node: Node; kind: "number"; value: number }
  | { node: Node; kind: "template"; text: string };

/**
 * Static value leaves of a style value: literals, template literals (with
 * expressions as placeholders) and both branches of conditional / logical
 * expressions. Calls and identifiers are dynamic and not inspected.
 */
export function valueLeaves(
  node: Node | undefined | null,
  out: ValueLeaf[] = []
): ValueLeaf[] {
  const target = unwrap(node);
  if (!target) {
    return out;
  }

  switch (target.type) {
    case "Literal":
      if (typeof target.value === "string") {
        out.push({ node: target, kind: "string", text: target.value });
      } else if (typeof target.value === "number") {
        out.push({ node: target, kind: "number", value: target.value });
      }
      break;
    case "TemplateLiteral":
      out.push({
        node: target,
        kind: "template",
        text: (target.quasis as Node[])
          .map(quasi => (quasi.value as { cooked?: string }).cooked ?? "")
          .join(EXPRESSION_PLACEHOLDER)
      });
      break;
    case "UnaryExpression": {
      const argument = target.argument as Node;
      if (
        target.operator === "-" &&
        argument.type === "Literal" &&
        typeof argument.value === "number"
      ) {
        out.push({ node: target, kind: "number", value: -argument.value });
      }
      break;
    }
    case "JSXExpressionContainer":
      valueLeaves(target.expression as Node, out);
      break;
    case "ConditionalExpression":
      valueLeaves(target.consequent as Node, out);
      valueLeaves(target.alternate as Node, out);
      break;
    case "LogicalExpression":
      valueLeaves(target.left as Node, out);
      valueLeaves(target.right as Node, out);
      break;
    default:
      break;
  }

  return out;
}

export interface CssDeclaration {
  /** camelCase CSS property. */
  name: string;
  /** Property as written (`background-color`). */
  property: string;
  value: string;
  /** Offset of the property name in the template text. */
  propertyOffset: number;
  /** Offset of the value in the template text. */
  valueOffset: number;
  selectors: string[];
}

export interface CssBlock {
  selector: string;
  offset: number;
  /** Enclosing selectors. */
  parents: string[];
}

export interface ParsedTemplate {
  /** Cooked CSS text with expressions replaced by the placeholder. */
  text: string;
  declarations: CssDeclaration[];
  blocks: CssBlock[];
  /** Template element holding a text offset. */
  locate: (offset: number) => Node;
  /** Absolute source range of a text range inside a single quasi. */
  range: (start: number, end: number) => [number, number] | undefined;
}

const PROPERTY_NAME = /^-{0,2}[a-z][\w-]*$/i;

/** Parse the declarations and nested blocks of a CSS template literal. */
export function parseCssTemplate(template: Node): ParsedTemplate {
  const quasis = template.quasis as Node[];
  const segments: { start: number; end: number; quasi: Node }[] = [];
  let text = "";
  quasis.forEach((quasi, index) => {
    const cooked = (quasi.value as { cooked?: string }).cooked ?? "";
    segments.push({
      start: text.length,
      end: text.length + cooked.length,
      quasi
    });
    text += cooked;
    if (index < quasis.length - 1) {
      text += EXPRESSION_PLACEHOLDER;
    }
  });

  // Blank comments out, keeping offsets stable.
  const source = text.replaceAll(/\/\*[\s\S]*?\*\//g, match =>
    " ".repeat(match.length)
  );

  const declarations: CssDeclaration[] = [];
  const blocks: CssBlock[] = [];
  const stack: string[] = [];
  let depth = 0;
  let quote: string | undefined;
  let start = 0;

  const flush = (end: number) => {
    const chunk = source.slice(start, end);
    const colon = chunk.indexOf(":");
    if (colon < 0) {
      return;
    }
    const property = chunk.slice(0, colon).trim();
    if (!PROPERTY_NAME.test(property)) {
      return;
    }
    const rawValue = chunk.slice(colon + 1);
    const value = rawValue.trim();
    if (!value) {
      return;
    }
    declarations.push({
      name: toCamelCase(property.toLowerCase()),
      property,
      value,
      propertyOffset: start + chunk.indexOf(property),
      valueOffset:
        start + colon + 1 + (rawValue.length - rawValue.trimStart().length),
      selectors: [...stack]
    });
  };

  for (let index = 0; index < source.length; index++) {
    const char = source[index]!;
    if (quote) {
      if (char === quote) {
        quote = undefined;
      }
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
    } else if (char === "(") {
      depth++;
    } else if (char === ")") {
      depth = Math.max(depth - 1, 0);
    } else if (depth === 0 && char === "{") {
      const raw = source.slice(start, index);
      const selector = raw.trim();
      blocks.push({
        selector,
        offset: start + (raw.length - raw.trimStart().length),
        parents: [...stack]
      });
      stack.push(selector);
      start = index + 1;
    } else if (depth === 0 && char === "}") {
      flush(index);
      stack.pop();
      start = index + 1;
    } else if (depth === 0 && char === ";") {
      flush(index);
      start = index + 1;
    }
  }
  flush(source.length);

  const segmentAt = (offset: number) =>
    segments.find(
      segment => offset >= segment.start && offset <= segment.end
    ) ?? segments.at(-1)!;

  return {
    text,
    declarations,
    blocks,
    locate: offset => segmentAt(offset).quasi,
    range(rangeStart, rangeEnd) {
      const segment = segmentAt(rangeStart);
      const value = segment.quasi.value as { raw: string; cooked?: string };
      if (
        rangeEnd > segment.end ||
        value.raw !== value.cooked ||
        !segment.quasi.range
      ) {
        return undefined;
      }

      // Template element ranges include the leading "`" or "}" delimiter.
      const base = segment.quasi.range[0] + 1 - segment.start;

      return [base + rangeStart, base + rangeEnd];
    }
  };
}
