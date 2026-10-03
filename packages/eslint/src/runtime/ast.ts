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
 * The subset of ESLint's rule API the design-system rules use, typed locally
 * so the runtime entry stays free of a dependency on eslint's types.
 */

export interface Node {
  type: string;
  parent?: Node;
  range?: [number, number];
  [key: string]: unknown;
}

export interface Fix {
  range: [number, number];
  text: string;
}

export interface Fixer {
  replaceText: (node: Node, text: string) => Fix;
  replaceTextRange: (range: [number, number], text: string) => Fix;
}

export type FixFunction = (fixer: Fixer) => Fix | Fix[] | null;

export interface SuggestionDescriptor {
  messageId: string;
  data?: Record<string, string>;
  fix: FixFunction;
}

export interface ReportDescriptor {
  node: Node;
  messageId: string;
  data?: Record<string, string>;
  fix?: FixFunction;
  suggest?: SuggestionDescriptor[];
}

interface Variable {
  defs: { node: Node }[];
}

export interface Scope {
  set: Map<string, Variable>;
  upper: Scope | null;
}

export interface SourceCode {
  getText: (node?: Node) => string;
  getScope?: (node: Node) => Scope;
}

export interface RuleContext {
  report: (descriptor: ReportDescriptor) => void;
  settings?: Record<string, unknown>;
  sourceCode: SourceCode;
}

export type Visitors = Record<string, (node: Node) => void>;

export interface RuleModule {
  meta: {
    type: "problem" | "suggestion";
    docs: { description: string };
    messages: Record<string, string>;
    schema: [];
    fixable?: "code";
    hasSuggestions?: boolean;
  };
  create: (context: RuleContext) => Visitors;
}

export function isNode(value: unknown): value is Node {
  return !!value && typeof value === "object" && "type" in value;
}

/** Strip TypeScript-only wrappers (`x as T`, `x satisfies T`, `x!`). */
export function unwrap(node: Node | undefined | null): Node | undefined {
  let current = node ?? undefined;
  while (
    current &&
    (current.type === "TSAsExpression" ||
      current.type === "TSSatisfiesExpression" ||
      current.type === "TSNonNullExpression" ||
      current.type === "TSTypeAssertion")
  ) {
    current = current.expression as Node | undefined;
  }

  return current;
}

/** Static key of an object property (`color`, `"background-color"`). */
export function propertyKeyName(property: Node): string | undefined {
  const key = property.key as Node | undefined;
  if (!key) {
    return undefined;
  }
  if (!property.computed && key.type === "Identifier") {
    return key.name as string;
  }
  if (key.type === "Literal" && typeof key.value === "string") {
    return key.value;
  }
  if (
    key.type === "TemplateLiteral" &&
    (key.expressions as Node[]).length === 0
  ) {
    const [quasi] = key.quasis as Node[];

    return (quasi?.value as { cooked?: string } | undefined)?.cooked;
  }

  return undefined;
}

/** Static string value of a literal or expression-free template. */
export function staticString(
  node: Node | undefined | null
): string | undefined {
  const target = unwrap(node);
  if (target?.type === "Literal" && typeof target.value === "string") {
    return target.value;
  }
  if (
    target?.type === "TemplateLiteral" &&
    (target.expressions as Node[]).length === 0
  ) {
    const [quasi] = target.quasis as Node[];

    return (quasi?.value as { cooked?: string } | undefined)?.cooked;
  }

  return undefined;
}

/** Name of a called identifier or the property of a called member. */
export function calleeName(node: Node): string | undefined {
  const callee = unwrap(
    (node.type === "TaggedTemplateExpression" ? node.tag : node.callee) as Node
  );
  if (callee?.type === "Identifier") {
    return callee.name as string;
  }
  if (callee?.type === "MemberExpression") {
    const property = callee.property as Node | undefined;
    if (property?.type === "Identifier") {
      return property.name as string;
    }
  }

  return undefined;
}

/** `div`, `Button`, `DS.Button` → the element's full JSX name. */
export function jsxElementName(node: Node | undefined): string | undefined {
  if (node?.type === "JSXIdentifier") {
    return node.name as string;
  }
  if (node?.type === "JSXMemberExpression") {
    const object = jsxElementName(node.object as Node);
    const property = jsxElementName(node.property as Node);

    return object && property ? `${object}.${property}` : undefined;
  }

  return undefined;
}

export function isHostElement(name: string | undefined): name is string {
  return !!name && /^[a-z]/.test(name) && !name.includes(".");
}

/** Attribute of a JSX opening element by name. */
export function jsxAttribute(opening: Node, name: string): Node | undefined {
  return (opening.attributes as Node[]).find(
    attribute =>
      attribute.type === "JSXAttribute" &&
      (attribute.name as Node).type === "JSXIdentifier" &&
      (attribute.name as Node).name === name
  );
}

export function jsxAttributeName(attribute: Node): string | undefined {
  const name = attribute.name as Node | undefined;

  return name?.type === "JSXIdentifier" ? (name.name as string) : undefined;
}

export function hasSpreadAttribute(opening: Node): boolean {
  return (opening.attributes as Node[]).some(
    attribute => attribute.type === "JSXSpreadAttribute"
  );
}

export type StaticAttributeValue =
  | { kind: "string"; value: string }
  | { kind: "boolean"; value: boolean }
  | { kind: "number"; value: number }
  | { kind: "dynamic" };

/** Statically known value of a JSX attribute (`disabled` → `true`). */
export function staticAttributeValue(attribute: Node): StaticAttributeValue {
  const value = attribute.value as Node | null;
  if (!value) {
    return { kind: "boolean", value: true };
  }

  const expression =
    value.type === "JSXExpressionContainer"
      ? unwrap(value.expression as Node)
      : value;
  const text = staticString(expression);
  if (text !== undefined) {
    return { kind: "string", value: text };
  }
  if (expression?.type === "Literal") {
    if (typeof expression.value === "boolean") {
      return { kind: "boolean", value: expression.value };
    }
    if (typeof expression.value === "number") {
      return { kind: "number", value: expression.value };
    }
  }

  return { kind: "dynamic" };
}

/** Chain visitor maps so several rule parts can listen to the same node. */
export function mergeVisitors(...maps: Visitors[]): Visitors {
  const merged: Visitors = {};
  for (const map of maps) {
    for (const [selector, handler] of Object.entries(map)) {
      const previous = merged[selector];
      merged[selector] = previous
        ? node => {
            previous(node);
            handler(node);
          }
        : handler;
    }
  }

  return merged;
}

/**
 * Absolute source range of `[start, end)` inside the cooked text of a string
 * literal or template element, or `undefined` when escapes make the raw and
 * cooked text differ.
 */
export function cookedRange(
  node: Node,
  start: number,
  end: number,
  sourceCode: SourceCode
): [number, number] | undefined {
  if (!node.range) {
    return undefined;
  }

  if (node.type === "Literal" && typeof node.value === "string") {
    const raw = sourceCode.getText(node);
    if (raw.slice(1, -1) !== node.value) {
      return undefined;
    }

    return [node.range[0] + 1 + start, node.range[0] + 1 + end];
  }

  if (node.type === "TemplateElement") {
    const value = node.value as { raw: string; cooked?: string };
    if (value.raw !== value.cooked) {
      return undefined;
    }

    // Template element ranges include the leading "`" or "}" delimiter.
    return [node.range[0] + 1 + start, node.range[0] + 1 + end];
  }

  return undefined;
}
