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
 * Component rules ported from `@atlaskit/eslint-plugin-design-system`. Raw
 * HTML and hand-rolled patterns are pointed at the schema's own components,
 * and each rule is only enabled when the schema defines a replacement.
 */

import type {
  ComponentRole,
  CoreRuleId,
  HtmlElementRuleId,
  ManifestComponent
} from "../../types";
import type { Node, RuleContext, RuleModule, Visitors } from "../ast";
import {
  hasSpreadAttribute,
  isHostElement,
  jsxAttribute,
  jsxAttributeName,
  jsxElementName,
  mergeVisitors,
  staticAttributeValue,
  staticString,
  unwrap
} from "../ast";
import type { ComponentIndex } from "../components";
import { createComponentResolver } from "../components";
import { readSettings } from "../settings";
import { isStyledFactory, styledTag } from "../sources";

/** `<input type>` values handled by `no-html-text-input` (and a missing type). */
const TEXT_INPUT_TYPES = new Set([
  "",
  "text",
  "email",
  "password",
  "search",
  "tel",
  "url",
  "number"
]);

interface HtmlElementRule {
  role: ComponentRole;
  tags: string[];
  /** For `<input>`: the `type` values the rule covers. */
  inputTypes?: ReadonlySet<string>;
}

export const HTML_ELEMENT_RULES: Readonly<
  Record<HtmlElementRuleId, HtmlElementRule>
> = {
  "no-html-anchor": { role: "link", tags: ["a"] },
  "no-html-button": { role: "button", tags: ["button"] },
  "no-html-checkbox": {
    role: "checkbox",
    tags: ["input"],
    inputTypes: new Set(["checkbox"])
  },
  "no-html-code": { role: "code", tags: ["code"] },
  "no-html-heading": {
    role: "heading",
    tags: ["h1", "h2", "h3", "h4", "h5", "h6"]
  },
  "no-html-image": { role: "image", tags: ["img"] },
  "no-html-radio": {
    role: "radio",
    tags: ["input"],
    inputTypes: new Set(["radio"])
  },
  "no-html-range": {
    role: "range",
    tags: ["input"],
    inputTypes: new Set(["range"])
  },
  "no-html-select": { role: "select", tags: ["select"] },
  "no-html-text-input": {
    role: "text-input",
    tags: ["input"],
    inputTypes: TEXT_INPUT_TYPES
  },
  "no-html-textarea": { role: "textarea", tags: ["textarea"] }
};

/** Host elements `prefer-primitives` points at layout primitives. */
const PRIMITIVE_ELEMENTS = new Set([
  "div",
  "span",
  "article",
  "aside",
  "dialog",
  "footer",
  "header",
  "li",
  "main",
  "nav",
  "ol",
  "section",
  "ul"
]);

const LABEL_ATTRIBUTES = [
  "label",
  "aria-label",
  "aria-labelledby",
  "aria-hidden",
  "title",
  "alt"
];

const DISABLED_ATTRIBUTES = [
  "disabled",
  "readOnly",
  "isDisabled",
  "isReadOnly"
];

/** `type` of an `<input>`: `""` when missing, `undefined` when dynamic. */
function inputType(opening: Node): string | undefined {
  const attribute = jsxAttribute(opening, "type");
  if (!attribute) {
    return "";
  }
  const value = staticAttributeValue(attribute);

  return value.kind === "string" ? value.value.toLowerCase() : undefined;
}

function isTextOnly(element: Node): boolean {
  const children = element.children as Node[];

  return (
    children.length > 0 &&
    children.every(
      child =>
        child.type === "JSXText" ||
        (child.type === "JSXExpressionContainer" &&
          staticString(child.expression as Node) !== undefined)
    )
  );
}

/**
 * Visitor factory: calls `visit` with each JSX opening element's
 * design-system component (resolved through imports) or host tag.
 */
function elements(
  context: RuleContext,
  index: ComponentIndex,
  visit: (element: {
    opening: Node;
    tag?: string;
    component?: ManifestComponent;
    icon?: string;
    name: string;
  }) => void
): Visitors {
  const resolver = createComponentResolver(readSettings(context));

  return mergeVisitors(resolver.visitors, {
    JSXOpeningElement(node) {
      const name = jsxElementName(node.name as Node);
      if (isHostElement(name)) {
        visit({ opening: node, tag: name, name });
        return;
      }
      const resolved = resolver.resolve(node.name as Node);
      if (!resolved) {
        return;
      }
      const component = index.byJsx.get(resolved.name);
      const icon = index.icons.has(resolved.name) ? resolved.name : undefined;
      if (component || icon) {
        visit({ opening: node, component, icon, name: resolved.local });
      }
    }
  });
}

function hasRole(
  component: ManifestComponent | undefined,
  ...roles: ComponentRole[]
): boolean {
  return !!component?.roles.some(role => roles.includes(role));
}

function htmlElementRule(
  id: HtmlElementRuleId,
  index: ComponentIndex
): RuleModule {
  const { role, tags, inputTypes } = HTML_ELEMENT_RULES[id];
  const tagSet = new Set(tags);
  const components = index.names(role);

  return {
    meta: {
      type: "suggestion",
      docs: {
        description: `Discourage raw HTML ${tags.map(tag => `<${tag}>`).join(", ")} elements in favour of the design system's ${role} component`
      },
      messages: {
        noHtmlElement: `This <{{element}}> should be replaced with a design system component: ${components}`
      },
      schema: []
    },
    create(context) {
      const report = (node: Node, element: string) =>
        context.report({ node, messageId: "noHtmlElement", data: { element } });
      const onStyled = (node: Node, factory: Node) => {
        const tag = styledTag(factory);
        if (tag && tagSet.has(tag) && !inputTypes) {
          report(node, tag);
        }
      };

      return {
        JSXOpeningElement(node) {
          const name = jsxElementName(node.name as Node);
          if (!name || !tagSet.has(name)) {
            return;
          }
          if (inputTypes) {
            const type = inputType(node);
            if (type === undefined || !inputTypes.has(type)) {
              return;
            }
          }
          report(node, name);
        },
        CallExpression(node) {
          if (isStyledFactory(node.callee as Node)) {
            onStyled(node, node.callee as Node);
          }
        },
        TaggedTemplateExpression(node) {
          if (isStyledFactory(node.tag as Node)) {
            onStyled(node, node.tag as Node);
          }
        }
      };
    }
  };
}

/**
 * Build the component rules for a schema-derived manifest.
 */
export function createComponentRules(
  index: ComponentIndex
): Partial<Record<CoreRuleId, RuleModule>> {
  const htmlRules = Object.fromEntries(
    (Object.keys(HTML_ELEMENT_RULES) as HtmlElementRuleId[]).map(id => [
      id,
      htmlElementRule(id, index)
    ])
  ) as Record<HtmlElementRuleId, RuleModule>;

  return {
    ...htmlRules,

    "use-primitives-text": {
      meta: {
        type: "suggestion",
        docs: {
          description:
            "Encourage the usage of the design system's text component"
        },
        messages: {
          useText: `This <{{element}}> holds text. Use the design system text component: ${index.names("text")}`
        },
        schema: []
      },
      create(context) {
        return {
          JSXElement(node) {
            const opening = node.openingElement as Node;
            const name = jsxElementName(opening.name as Node);
            if ((name === "p" || name === "span") && isTextOnly(node)) {
              context.report({
                node: opening,
                messageId: "useText",
                data: { element: name }
              });
            }
          }
        };
      }
    },

    "prefer-primitives": {
      meta: {
        type: "suggestion",
        docs: {
          description:
            "Increase awareness of the design system's layout primitives for styled host elements"
        },
        messages: {
          preferPrimitives: `This styled <{{element}}> may be replaceable with a design system primitive: ${index.names("primitive")}`
        },
        schema: []
      },
      create(context) {
        const settings = readSettings(context);
        const report = (node: Node, element: string) =>
          context.report({
            node,
            messageId: "preferPrimitives",
            data: { element }
          });
        const onStyled = (node: Node, factory: Node) => {
          const tag = styledTag(factory);
          if (tag && PRIMITIVE_ELEMENTS.has(tag)) {
            report(node, tag);
          }
        };

        return {
          JSXOpeningElement(node) {
            const name = jsxElementName(node.name as Node);
            if (
              name &&
              PRIMITIVE_ELEMENTS.has(name) &&
              settings.styleAttributes.some(attribute =>
                jsxAttribute(node, attribute)
              )
            ) {
              report(node, name);
            }
          },
          CallExpression(node) {
            if (isStyledFactory(node.callee as Node)) {
              onStyled(node, node.callee as Node);
            }
          },
          TaggedTemplateExpression(node) {
            if (isStyledFactory(node.tag as Node)) {
              onStyled(node, node.tag as Node);
            }
          }
        };
      }
    },

    "no-unsafe-style-overrides": {
      meta: {
        type: "problem",
        docs: {
          description:
            "Discourage unsafe style overrides on design system components"
        },
        messages: {
          noUnsafeOverrides:
            "The {{prop}} prop overrides {{component}}'s styles, which breaks when its internals change. Use its props and variants instead",
          noUnsafeStyledOverride:
            "Wrapping {{component}} in styled() overrides its styles, which breaks when its internals change. Use its props and variants instead"
        },
        schema: []
      },
      create(context) {
        const settings = readSettings(context);
        const unsafe = new Set(settings.unsafeStyleProps);
        const resolver = createComponentResolver(settings);
        const onFactory = (factory: Node | undefined) => {
          const target = unwrap(factory);
          if (target?.type !== "CallExpression") {
            return;
          }
          const callee = unwrap(target.callee as Node);
          const [argument] = target.arguments as Node[];
          if (callee?.type !== "Identifier" || callee.name !== "styled") {
            return;
          }
          const resolved = resolver.resolve(argument);
          if (resolved && index.byJsx.has(resolved.name)) {
            context.report({
              node: argument!,
              messageId: "noUnsafeStyledOverride",
              data: { component: resolved.local }
            });
          }
        };

        return mergeVisitors(
          elements(context, index, ({ opening, component, name }) => {
            if (!component) {
              return;
            }
            for (const attribute of opening.attributes as Node[]) {
              const prop =
                attribute.type === "JSXAttribute"
                  ? jsxAttributeName(attribute)
                  : undefined;
              if (prop && unsafe.has(prop)) {
                context.report({
                  node: attribute,
                  messageId: "noUnsafeOverrides",
                  data: { prop, component: name }
                });
              }
            }
          }),
          resolver.visitors,
          {
            CallExpression(node) {
              onFactory(node.callee as Node);
            },
            TaggedTemplateExpression(node) {
              onFactory(node.tag as Node);
            }
          }
        );
      }
    },

    "icon-label": {
      meta: {
        type: "problem",
        docs: {
          description: "Enforces accessible labelling of design system icons"
        },
        messages: {
          missingLabelProp:
            '<{{name}}> needs a label describing the icon, or aria-hidden / label="" when it is decorative'
        },
        schema: []
      },
      create(context) {
        return elements(
          context,
          index,
          ({ opening, component, icon, name }) => {
            if (
              (icon || hasRole(component, "icon")) &&
              !hasSpreadAttribute(opening) &&
              !LABEL_ATTRIBUTES.some(attribute =>
                jsxAttribute(opening, attribute)
              )
            ) {
              context.report({
                node: opening,
                messageId: "missingLabelProp",
                data: { name }
              });
            }
          }
        );
      }
    },

    "no-empty-icon-button-label": {
      meta: {
        type: "problem",
        docs: {
          description:
            "Ensures icon-only design system buttons have an accessible name"
        },
        messages: {
          emptyLabel:
            "<{{name}}> renders only an icon; its {{attribute}} must describe the action",
          missingLabel:
            "<{{name}}> renders only an icon; give it a label describing the action"
        },
        schema: []
      },
      create(context) {
        return elements(context, index, ({ opening, component, name }) => {
          if (!hasRole(component, "icon-button")) {
            return;
          }
          const labels = ["label", "aria-label", "aria-labelledby", "title"]
            .map(attribute => ({
              attribute,
              node: jsxAttribute(opening, attribute)
            }))
            .filter(label => label.node);
          if (labels.length === 0) {
            if (!hasSpreadAttribute(opening)) {
              context.report({
                node: opening,
                messageId: "missingLabel",
                data: { name }
              });
            }
            return;
          }
          for (const label of labels) {
            const value = staticAttributeValue(label.node!);
            if (value.kind === "string" && value.value.trim() === "") {
              context.report({
                node: label.node!,
                messageId: "emptyLabel",
                data: { name, attribute: label.attribute }
              });
            }
          }
        });
      }
    },

    "no-placeholder": {
      meta: {
        type: "suggestion",
        docs: {
          description:
            "Placeholders disappear on input; put format guidance in a helper message instead"
        },
        messages: {
          noPlaceholder:
            "Do not use placeholder on <{{name}}>. It disappears while typing and fails contrast; describe the expected format in a helper message"
        },
        schema: []
      },
      create(context) {
        return elements(context, index, ({ opening, tag, component, name }) => {
          const applies =
            tag === "textarea" ||
            (tag === "input" &&
              TEXT_INPUT_TYPES.has(inputType(opening) ?? "")) ||
            hasRole(component, "text-input", "textarea");
          const placeholder = applies
            ? jsxAttribute(opening, "placeholder")
            : undefined;
          if (placeholder) {
            context.report({
              node: placeholder,
              messageId: "noPlaceholder",
              data: { name }
            });
          }
        });
      }
    },

    "no-readonly-or-disabled-inputs": {
      meta: {
        type: "suggestion",
        docs: {
          description:
            "Inputs should be interactive; replace disabled and read-only inputs with a clearer pattern"
        },
        messages: {
          noDisabled:
            "{{attribute}} makes <{{name}}> non-interactive, which is hard to perceive and explain. Prefer validation messages or plain text"
        },
        schema: []
      },
      create(context) {
        return elements(context, index, ({ opening, tag, component, name }) => {
          const applies =
            tag === "input" ||
            tag === "textarea" ||
            tag === "select" ||
            hasRole(
              component,
              "text-input",
              "textarea",
              "select",
              "checkbox",
              "radio",
              "range"
            );
          if (!applies) {
            return;
          }
          for (const attribute of DISABLED_ATTRIBUTES) {
            const node = jsxAttribute(opening, attribute);
            const value = node ? staticAttributeValue(node) : undefined;
            if (node && value?.kind === "boolean" && value.value) {
              context.report({
                node,
                messageId: "noDisabled",
                data: { attribute, name }
              });
            }
          }
        });
      }
    },

    "no-deprecated-imports": {
      meta: {
        type: "problem",
        docs: {
          description: "Disallow importing deprecated design system components"
        },
        messages: {
          deprecatedComponent: "{{name}} is deprecated.{{replacement}}"
        },
        schema: []
      },
      create(context) {
        const resolver = createComponentResolver(readSettings(context));
        const report = (
          node: Node,
          component: ManifestComponent,
          name: string
        ) =>
          context.report({
            node,
            messageId: "deprecatedComponent",
            data: {
              name,
              replacement: component.replacements?.length
                ? ` Use ${component.replacements.join(" or ")} instead.`
                : ""
            }
          });

        return mergeVisitors(resolver.visitors, {
          ImportDeclaration(node) {
            if (
              !resolver.isDesignSystemModule(
                String((node.source as Node).value)
              )
            ) {
              return;
            }
            for (const specifier of node.specifiers as Node[]) {
              const name =
                specifier.type === "ImportSpecifier"
                  ? String(
                      (specifier.imported as Node).name ??
                        (specifier.imported as Node).value
                    )
                  : specifier.type === "ImportDefaultSpecifier"
                    ? String((specifier.local as Node).name)
                    : undefined;
              const component = name ? index.byJsx.get(name) : undefined;
              if (name && component?.deprecated) {
                report(specifier, component, name);
              }
            }
          },
          JSXOpeningElement(node) {
            const name = node.name as Node;
            if (name.type !== "JSXMemberExpression") {
              return;
            }
            const resolved = resolver.resolve(name);
            const component = resolved
              ? index.byJsx.get(resolved.name)
              : undefined;
            if (resolved && component?.deprecated) {
              report(node, component, resolved.local);
            }
          }
        });
      }
    },

    "no-banned-imports": {
      meta: {
        type: "problem",
        docs: { description: "Disallow importing banned modules" },
        messages: {
          bannedImport: '"{{source}}" is banned: {{reason}}'
        },
        schema: []
      },
      create(context): Visitors {
        const banned = Object.entries(readSettings(context).bannedImports);
        const check = (node: Node | undefined) => {
          const source = staticString(node);
          if (source === undefined) {
            return;
          }
          const match = banned.find(
            ([module]) => source === module || source.startsWith(`${module}/`)
          );
          if (match) {
            context.report({
              node: node!,
              messageId: "bannedImport",
              data: { source, reason: match[1] }
            });
          }
        };

        return banned.length === 0
          ? {}
          : {
              ImportDeclaration: node => check(node.source as Node),
              ExportNamedDeclaration: node => check(node.source as Node),
              ExportAllDeclaration: node => check(node.source as Node),
              ImportExpression: node => check(node.source as Node),
              CallExpression(node) {
                const callee = unwrap(node.callee as Node);
                if (
                  callee?.type === "Identifier" &&
                  callee.name === "require"
                ) {
                  check((node.arguments as Node[])[0]);
                }
              }
            };
      }
    }
  };
}
