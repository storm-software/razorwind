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
 * CSS-in-JS rules ported from `@atlaskit/eslint-plugin-design-system`. Where
 * a message points at a replacement (`no-margin`, `use-visually-hidden`) it
 * names the schema's own components.
 */

import type { CoreRuleId } from "../../types";
import type { FixFunction, Node, RuleContext, RuleModule } from "../ast";
import { propertyKeyName, unwrap } from "../ast";
import type { ComponentIndex } from "../components";
import { readSettings } from "../settings";
import type { StyleKind, StyleObject } from "../sources";
import {
  forEachNestedSelector,
  forEachStyleProperty,
  isStyledFactory,
  parseCssTemplate,
  styleSources
} from "../sources";
import {
  isEasingLiteral,
  parseDuration,
  PHYSICAL_PROPERTIES,
  PHYSICAL_VALUES,
  splitLayers,
  splitParts,
  toCamelCase,
  toKebabCase
} from "../values";

/** Allowed nested keys: at-rules and pseudo selectors on the element itself. */
function isAllowedNestedSelector(selector: string): boolean {
  if (selector.startsWith("@")) {
    return true;
  }

  return selector
    .split(",")
    .map(part => part.trim())
    .every(part => part.startsWith(":") || part.startsWith("&:"));
}

const NESTABLE_KINDS = new Set<StyleKind>(["css", "css-map", "styled"]);

/** Indentation of the line `node` starts on, when it starts the line. */
function lineIndent(node: Node, context: RuleContext): string | undefined {
  const text = context.sourceCode.getText();
  const start = node.range![0];
  const lineStart = text.lastIndexOf("\n", start - 1) + 1;
  const prefix = text.slice(lineStart, start);

  return /^\s*$/.test(prefix) ? prefix : undefined;
}

// ─── motion shorthand expansion ─────────────────────────────────────────────

const TRANSITION_DEFAULTS = {
  Property: "all",
  Duration: "0s",
  TimingFunction: "ease",
  Delay: "0s"
};

const ANIMATION_DEFAULTS = {
  Name: "none",
  Duration: "0s",
  TimingFunction: "ease",
  Delay: "0s",
  IterationCount: "1",
  Direction: "normal",
  FillMode: "none",
  PlayState: "running"
};

const ANIMATION_DIRECTIONS = new Set([
  "normal",
  "reverse",
  "alternate",
  "alternate-reverse"
]);
const ANIMATION_FILL_MODES = new Set(["none", "forwards", "backwards", "both"]);
const ANIMATION_PLAY_STATES = new Set(["running", "paused"]);

/** Assign each part of a shorthand layer to its longhand suffix. */
function classifyLayer(
  layer: string,
  property: "transition" | "animation"
): Record<string, string> {
  const result: Record<string, string> = {};
  const set = (key: string, value: string) => {
    if (!(key in result)) {
      result[key] = value;
      return true;
    }
    return false;
  };

  for (const { text } of splitParts(layer)) {
    if (parseDuration(text) !== undefined) {
      if (!set("Duration", text)) {
        set("Delay", text);
      }
    } else if (isEasingLiteral(text)) {
      set("TimingFunction", text);
    } else if (property === "transition") {
      set("Property", text);
    } else if (/^(?:\d+(?:\.\d+)?|infinite)$/.test(text)) {
      set("IterationCount", text);
    } else if (ANIMATION_DIRECTIONS.has(text) && !("Direction" in result)) {
      set("Direction", text);
    } else if (ANIMATION_FILL_MODES.has(text) && !("FillMode" in result)) {
      set("FillMode", text);
    } else if (ANIMATION_PLAY_STATES.has(text)) {
      set("PlayState", text);
    } else {
      set("Name", text);
    }
  }

  return result;
}

/** `transition: "opacity 200ms ease"` → longhand `[property, value]` pairs. */
export function expandMotionShorthand(
  property: "transition" | "animation",
  value: string
): [string, string][] | undefined {
  const defaults: Record<string, string> =
    property === "transition" ? TRANSITION_DEFAULTS : ANIMATION_DEFAULTS;
  const layers = splitLayers(value).map(layer =>
    classifyLayer(layer, property)
  );
  if (layers.length === 0) {
    return undefined;
  }

  const primary = property === "transition" ? "Property" : "Name";

  return Object.keys(defaults)
    .filter(key => key === primary || layers.some(layer => key in layer))
    .map(key => [
      `${property}${key}`,
      layers.map(layer => layer[key] ?? defaults[key]!).join(", ")
    ]);
}

// ─── visually hidden detection ──────────────────────────────────────────────

const VISUALLY_HIDDEN: Readonly<Record<string, string>> = {
  width: "1px",
  height: "1px",
  padding: "0",
  position: "absolute",
  border: "0",
  clip: "rect(1px, 1px, 1px, 1px)",
  overflow: "hidden",
  whiteSpace: "nowrap"
};

/**
 * Likeness (0+) of a set of declarations to the visually hidden pattern;
 * above 0.8 is a hand-rolled visually hidden style.
 */
export function visuallyHiddenLikeness(
  entries: { key: string; value?: string }[]
): number {
  if (entries.length < 5) {
    return 0;
  }

  return (
    entries
      .filter(entry => entry.key in VISUALLY_HIDDEN)
      .reduce(
        (score, entry) =>
          score + (VISUALLY_HIDDEN[entry.key] === entry.value ? 1.5 : 0.75),
        0
      ) / entries.length
  );
}

function literalText(node: Node | undefined): string | undefined {
  const target = unwrap(node);
  if (target?.type !== "Literal") {
    return undefined;
  }
  if (typeof target.value === "number") {
    return target.value === 0 ? "0" : `${target.value}px`;
  }

  return typeof target.value === "string" ? target.value : undefined;
}

/** Style blocks of an object style: variant values, or the object itself. */
function styleBlocks(style: StyleObject): Node[] {
  if (
    style.kind !== "css-map" &&
    style.kind !== "stylesheet" &&
    style.kind !== "keyframes"
  ) {
    return [style.node];
  }

  return (style.node.properties as Node[]).flatMap(property => {
    const value =
      property.type === "Property" ? unwrap(property.value as Node) : undefined;

    return value?.type === "ObjectExpression" ? [value] : [];
  });
}

// ─── tagged template conversion ─────────────────────────────────────────────

type TemplateFamily = "css" | "styled" | "keyframes";

function objectKey(key: string): string {
  return /^[a-z_$][\w$]*$/i.test(key) ? key : JSON.stringify(key);
}

function renderObject(
  entries: [string, string | [string, string][]][],
  indent: string
): string {
  const inner = `${indent}  `;
  const lines = entries.map(([key, value]) =>
    typeof value === "string"
      ? `${inner}${objectKey(key)}: ${JSON.stringify(value)}`
      : `${inner}${objectKey(key)}: ${renderObject(value, inner)}`
  );

  return `{\n${lines.join(",\n")}\n${indent}}`;
}

/**
 * Object form of a CSS template with no expressions: flat declarations, or
 * frame blocks of declarations for keyframes.
 */
function templateToObject(
  template: Node,
  family: TemplateFamily,
  indent: string
): string | undefined {
  if ((template.expressions as Node[]).length > 0) {
    return undefined;
  }

  const parsed = parseCssTemplate(template);
  const declaration = ({ name, value }: { name: string; value: string }) =>
    [name, value] as [string, string];

  if (family !== "keyframes") {
    return parsed.blocks.length === 0
      ? renderObject(parsed.declarations.map(declaration), indent)
      : undefined;
  }

  if (
    parsed.blocks.some(block => block.parents.length > 0) ||
    parsed.declarations.some(item => item.selectors.length !== 1)
  ) {
    return undefined;
  }

  return renderObject(
    parsed.blocks.map(block => [
      block.selector,
      parsed.declarations
        .filter(item => item.selectors[0] === block.selector)
        .map(declaration)
    ]),
    indent
  );
}

function taggedTemplateRule(
  family: TemplateFamily,
  description: string
): RuleModule {
  return {
    meta: {
      type: "suggestion",
      docs: { description },
      messages: {
        noTaggedTemplate: `Use an object argument instead of a ${family} tagged template expression`
      },
      schema: [],
      fixable: "code"
    },
    create(context) {
      const settings = readSettings(context);
      const cssCallees = new Set(
        settings.styleCallees.filter(
          name =>
            name !== "keyframes" &&
            name !== "injectGlobal" &&
            name !== "createGlobalStyle"
        )
      );

      return {
        TaggedTemplateExpression(node) {
          const tag = unwrap(node.tag as Node);
          const name = tag?.type === "Identifier" ? (tag.name as string) : "";
          const matches =
            family === "styled"
              ? isStyledFactory(tag)
              : family === "keyframes"
                ? name === "keyframes"
                : cssCallees.has(name);
          if (!matches) {
            return;
          }

          const object = templateToObject(
            node.quasi as Node,
            family,
            lineIndent(node, context) ?? ""
          );
          context.report({
            node,
            messageId: "noTaggedTemplate",
            fix: object
              ? fixer =>
                  fixer.replaceText(
                    node,
                    `${context.sourceCode.getText(node.tag as Node)}(${object})`
                  )
              : undefined
          });
        }
      };
    }
  };
}

// ─── exported style rules ───────────────────────────────────────────────────

function exportedStyleRule(
  callees: (context: RuleContext) => Set<string>,
  description: string,
  message: string
): RuleModule {
  return {
    meta: {
      type: "problem",
      docs: { description },
      messages: { noExport: message },
      schema: []
    },
    create(context) {
      const names = callees(context);
      const isStyleCall = (node: Node | undefined | null) => {
        const target = unwrap(node);
        const callee = unwrap(
          (target?.type === "TaggedTemplateExpression"
            ? target.tag
            : target?.type === "CallExpression"
              ? target.callee
              : undefined) as Node | undefined
        );

        return (
          callee?.type === "Identifier" && names.has(callee.name as string)
        );
      };
      const resolve = (node: Node, name: string) => {
        for (
          let scope = context.sourceCode.getScope?.(node) ?? null;
          scope;
          scope = scope.upper
        ) {
          const variable = scope.set.get(name);
          if (variable) {
            return variable.defs[0]?.node;
          }
        }
        return undefined;
      };
      const report = (node: Node) =>
        context.report({ node, messageId: "noExport" });

      return {
        ExportNamedDeclaration(node) {
          const declaration = node.declaration as Node | null;
          if (declaration?.type === "VariableDeclaration") {
            for (const declarator of declaration.declarations as Node[]) {
              if (isStyleCall(declarator.init as Node)) {
                report(declarator);
              }
            }
            return;
          }
          if (declaration || node.source) {
            return;
          }
          for (const specifier of node.specifiers as Node[]) {
            const local = specifier.local as Node;
            const definition =
              local.type === "Identifier"
                ? resolve(node, local.name as string)
                : undefined;
            if (
              definition?.type === "VariableDeclarator" &&
              isStyleCall(definition.init as Node)
            ) {
              report(specifier);
            }
          }
        },
        ExportDefaultDeclaration(node) {
          if (isStyleCall(node.declaration as Node)) {
            report(node);
          }
        }
      };
    }
  };
}

/**
 * Build the CSS-in-JS rules for a schema-derived manifest.
 */
export function createStyleRules(
  components: ComponentIndex
): Partial<Record<CoreRuleId, RuleModule>> {
  const primitives = components.names("primitive");
  const visuallyHidden = components.names("visually-hidden");

  return {
    "no-margin": {
      meta: {
        type: "problem",
        docs: { description: "Disallow using the margin CSS property" },
        messages: {
          noMargin: `margin breaks the component model. Control layout from the parent with ${
            primitives ? `${primitives} or ` : ""
          }gap in a flex or grid container`
        },
        schema: []
      },
      create(context) {
        return styleSources(context, {
          object: style =>
            forEachStyleProperty(style, property => {
              if (property.name.startsWith("margin")) {
                context.report({
                  node: property.property,
                  messageId: "noMargin"
                });
              }
            }),
          template(style) {
            const parsed = parseCssTemplate(style.node);
            for (const declaration of parsed.declarations) {
              if (declaration.name.startsWith("margin")) {
                context.report({
                  node: parsed.locate(declaration.propertyOffset),
                  messageId: "noMargin"
                });
              }
            }
          }
        });
      }
    },

    "no-physical-properties": {
      meta: {
        type: "problem",
        docs: {
          description:
            "Disallow physical properties and values in styles; use logical properties that follow the reading direction"
        },
        messages: {
          noPhysicalProperties:
            "Physical property {{physical}} does not follow the reading direction. Use {{logical}}",
          noPhysicalValues:
            '{{property}}: "{{physical}}" does not follow the reading direction. Use "{{logical}}"'
        },
        schema: [],
        fixable: "code"
      },
      create(context) {
        return styleSources(context, {
          object: style =>
            forEachStyleProperty(style, property => {
              const logical = PHYSICAL_PROPERTIES[property.name];
              if (logical) {
                const key = property.key;
                const kebab =
                  key.type === "Literal" && String(key.value).includes("-");
                const text = kebab ? toKebabCase(logical) : logical;
                context.report({
                  node: key,
                  messageId: "noPhysicalProperties",
                  data: { physical: property.name, logical },
                  fix: fixer =>
                    fixer.replaceText(
                      key,
                      key.type === "Literal"
                        ? `${context.sourceCode.getText(key)[0]}${text}${context.sourceCode.getText(key)[0]}`
                        : text
                    )
                });
              }

              const value = unwrap(property.value);
              const values = PHYSICAL_VALUES[property.name];
              const logicalValue =
                value?.type === "Literal" && typeof value.value === "string"
                  ? values?.[value.value]
                  : undefined;
              if (value && logicalValue) {
                const quote = context.sourceCode.getText(value)[0];
                context.report({
                  node: value,
                  messageId: "noPhysicalValues",
                  data: {
                    property: property.name,
                    physical: String(value.value),
                    logical: logicalValue
                  },
                  fix: fixer =>
                    fixer.replaceText(value, `${quote}${logicalValue}${quote}`)
                });
              }
            }),
          template(style) {
            const parsed = parseCssTemplate(style.node);
            for (const declaration of parsed.declarations) {
              const logical = PHYSICAL_PROPERTIES[declaration.name];
              if (logical) {
                const range = parsed.range(
                  declaration.propertyOffset,
                  declaration.propertyOffset + declaration.property.length
                );
                context.report({
                  node: parsed.locate(declaration.propertyOffset),
                  messageId: "noPhysicalProperties",
                  data: {
                    physical: declaration.property,
                    logical: toKebabCase(logical)
                  },
                  fix: range
                    ? fixer =>
                        fixer.replaceTextRange(range, toKebabCase(logical))
                    : undefined
                });
              }

              const logicalValue =
                PHYSICAL_VALUES[declaration.name]?.[declaration.value];
              if (logicalValue) {
                const range = parsed.range(
                  declaration.valueOffset,
                  declaration.valueOffset + declaration.value.length
                );
                context.report({
                  node: parsed.locate(declaration.valueOffset),
                  messageId: "noPhysicalValues",
                  data: {
                    property: declaration.property,
                    physical: declaration.value,
                    logical: logicalValue
                  },
                  fix: range
                    ? fixer => fixer.replaceTextRange(range, logicalValue)
                    : undefined
                });
              }
            }
          }
        });
      }
    },

    "no-nested-styles": {
      meta: {
        type: "problem",
        docs: {
          description: "Disallows use of nested styles in CSS-in-JS styles"
        },
        messages: {
          noNestedStyles:
            'Nested selector "{{selector}}" changes unexpectedly when child markup changes. Style the element itself; only pseudo-classes, pseudo-elements and at-rules may nest'
        },
        schema: []
      },
      create(context) {
        return styleSources(context, {
          object(style) {
            if (!NESTABLE_KINDS.has(style.kind)) {
              return;
            }
            forEachNestedSelector(style, (selector, property) => {
              if (!isAllowedNestedSelector(selector)) {
                context.report({
                  node: property.key as Node,
                  messageId: "noNestedStyles",
                  data: { selector }
                });
              }
            });
          },
          template(style) {
            if (!NESTABLE_KINDS.has(style.kind)) {
              return;
            }
            const parsed = parseCssTemplate(style.node);
            for (const block of parsed.blocks) {
              if (!isAllowedNestedSelector(block.selector)) {
                context.report({
                  node: parsed.locate(block.offset),
                  messageId: "noNestedStyles",
                  data: { selector: block.selector }
                });
              }
            }
          }
        });
      }
    },

    "no-exported-css": exportedStyleRule(
      context =>
        new Set(
          readSettings(context).styleCallees.filter(
            name =>
              name !== "keyframes" &&
              name !== "injectGlobal" &&
              name !== "createGlobalStyle"
          )
        ),
      "Forbid exporting css function calls, which is not statically analyzable",
      "Exported css() styles cannot be statically analysed. Define styles next to the component that uses them"
    ),

    "no-exported-keyframes": exportedStyleRule(
      () => new Set(["keyframes"]),
      "Forbid exporting keyframes function calls, which is not statically analyzable",
      "Exported keyframes() cannot be statically analysed. Define keyframes next to the styles that use them"
    ),

    "no-empty-styled-expression": {
      meta: {
        type: "problem",
        docs: {
          description:
            "Forbids styled expressions with empty arguments; render the element directly"
        },
        messages: {
          noEmptyStyledExpression:
            "Empty styled expression. Render the element directly instead of styling it with nothing"
        },
        schema: []
      },
      create(context) {
        return {
          CallExpression(node) {
            const args = node.arguments as Node[];
            if (
              isStyledFactory(node.callee as Node) &&
              args.every(
                argument =>
                  argument.type === "ObjectExpression" &&
                  (argument.properties as Node[]).length === 0
              )
            ) {
              context.report({ node, messageId: "noEmptyStyledExpression" });
            }
          }
        };
      }
    },

    "no-css-tagged-template-expression": taggedTemplateRule(
      "css",
      "Disallows css tagged template expressions; use object styles"
    ),
    "no-styled-tagged-template-expression": taggedTemplateRule(
      "styled",
      "Disallows styled tagged template expressions; use object styles"
    ),
    "no-keyframes-tagged-template-expression": taggedTemplateRule(
      "keyframes",
      "Disallows keyframes tagged template expressions; use object styles"
    ),

    "expand-motion-shorthand": {
      meta: {
        type: "suggestion",
        docs: {
          description:
            "Expands transition and animation shorthands so each value can use a motion token"
        },
        messages: {
          expandShorthand:
            "Expand the {{property}} shorthand into longhand properties so durations and easings can use motion tokens"
        },
        schema: [],
        fixable: "code"
      },
      create(context) {
        return styleSources(context, {
          object: style =>
            forEachStyleProperty(style, property => {
              if (
                property.name !== "transition" &&
                property.name !== "animation"
              ) {
                return;
              }
              const value = unwrap(property.value);
              if (
                value?.type !== "Literal" ||
                typeof value.value !== "string" ||
                /^(?:none|inherit|initial|unset|revert)$/i.test(
                  value.value.trim()
                )
              ) {
                return;
              }
              const longhands = expandMotionShorthand(
                property.name,
                value.value
              );
              if (!longhands) {
                return;
              }

              const quote = context.sourceCode.getText(value)[0]!;
              const keyQuote =
                property.key.type === "Literal"
                  ? context.sourceCode.getText(property.key)[0]
                  : undefined;
              const indent = lineIndent(property.property, context);
              const text = longhands
                .map(
                  ([key, longhand]) =>
                    `${keyQuote ? `${keyQuote}${key}${keyQuote}` : key}: ${quote}${longhand}${quote}`
                )
                .join(indent === undefined ? ", " : `,\n${indent}`);
              const fix: FixFunction = fixer =>
                fixer.replaceText(property.property, text);
              context.report({
                node: property.property,
                messageId: "expandShorthand",
                data: { property: property.name },
                fix
              });
            })
        });
      }
    },

    "use-visually-hidden": {
      meta: {
        type: "suggestion",
        docs: {
          description:
            "Enforce usage of the design system's visually hidden component over hand-rolled styles"
        },
        messages: {
          useVisuallyHidden: `Use ${visuallyHidden || "the visually hidden component"} instead of hand-rolled visually hidden styles`
        },
        schema: []
      },
      create(context) {
        return styleSources(context, {
          object: style => {
            for (const block of styleBlocks(style)) {
              const entries = (block.properties as Node[]).flatMap(property => {
                const key =
                  property.type === "Property"
                    ? propertyKeyName(property)
                    : undefined;

                return key === undefined
                  ? []
                  : [
                      {
                        key: toCamelCase(key),
                        value: literalText(property.value as Node)
                      }
                    ];
              });
              if (visuallyHiddenLikeness(entries) > 0.8) {
                context.report({ node: block, messageId: "useVisuallyHidden" });
              }
            }
          },
          template(style) {
            const parsed = parseCssTemplate(style.node);
            const entries = parsed.declarations
              .filter(declaration => declaration.selectors.length === 0)
              .map(declaration => ({
                key: declaration.name,
                value: declaration.value
              }));
            if (visuallyHiddenLikeness(entries) > 0.8) {
              context.report({
                node: style.tagged,
                messageId: "useVisuallyHidden"
              });
            }
          }
        });
      }
    }
  };
}
