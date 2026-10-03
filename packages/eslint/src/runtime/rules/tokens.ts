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
 * Token rules ported from `@atlaskit/eslint-plugin-design-system`
 * (`ensure-design-token-usage`, `no-unsafe-design-token-usage`,
 * `no-deprecated-design-token-usage`, `use-tokens-*`). Allowlists,
 * suggestions and examples come from the schema's own tokens.
 */

import type {
  CoreRuleId,
  DesignSystemManifest,
  ManifestToken,
  TokenCategory
} from "../../types";
import type {
  FixFunction,
  Node,
  RuleContext,
  RuleModule,
  Visitors
} from "../ast";
import {
  cookedRange,
  isHostElement,
  jsxElementName,
  mergeVisitors,
  staticString,
  unwrap
} from "../ast";
import { leafReplacementFix, templateReplacementFix } from "../fix";
import type { ResolvedSettings } from "../settings";
import { readSettings } from "../settings";
import type { ValueLeaf } from "../sources";
import {
  forEachStyleProperty,
  parseCssTemplate,
  styleSources,
  valueLeaves
} from "../sources";
import type { TokenIndex } from "../tokens";
import {
  findColorLiterals,
  isEasingLiteral,
  isFunctionCall,
  isKeyword,
  isLengthLiteral,
  isReference,
  normalizeFontFamily,
  parseDuration,
  splitParts
} from "../values";

/** A literal a value rule reports, with offsets into the value text. */
interface ValueIssue {
  start: number;
  end: number;
  messageId: string;
  data: Record<string, string>;
  /** Tokens whose value equals the literal, offered as suggestions. */
  tokens: ManifestToken[];
}

type Analyzer = (property: string, value: string | number) => ValueIssue[];

interface AnalyzerContext {
  settings: ResolvedSettings;
  examples: (categories: TokenCategory[]) => string;
}

interface Span {
  start: number;
  end: number;
  text: string;
}

const SUGGEST_TOKEN = "Replace with {{reference}} ({{token}})";

/**
 * A rule that runs `analyzer` over every style declaration (object styles,
 * CSS templates and, optionally, host element attributes) and suggests the
 * tokens whose value matches each reported literal.
 */
function valueRule(
  index: TokenIndex,
  options: {
    description: string;
    messages: Record<string, string>;
    /** Host element attributes (`fill`) read as a CSS property. */
    hostAttributes?: ReadonlySet<string>;
    analyzer: (context: AnalyzerContext) => Analyzer;
  }
): RuleModule {
  return {
    meta: {
      type: "problem",
      docs: { description: options.description },
      messages: { ...options.messages, suggestToken: SUGGEST_TOKEN },
      schema: [],
      hasSuggestions: true
    },
    create(context) {
      const settings = readSettings(context);
      const analyze = options.analyzer({
        settings,
        examples: categories => index.examples(categories, settings)
      });
      const suggest = (
        issue: ValueIssue,
        fix: (reference: string) => FixFunction | undefined
      ) =>
        issue.tokens.flatMap(token => {
          const reference = index.reference(token, settings);
          const fn = fix(reference);

          return fn
            ? [
                {
                  messageId: "suggestToken",
                  data: { reference, token: token.path },
                  fix: fn
                }
              ]
            : [];
        });

      const checkLeaf = (property: string, leaf: ValueLeaf) => {
        const value = leaf.kind === "number" ? leaf.value : leaf.text;
        for (const issue of analyze(property, value)) {
          context.report({
            node: leaf.node,
            messageId: issue.messageId,
            data: issue.data,
            suggest: suggest(issue, reference =>
              leafReplacementFix(
                leaf,
                [{ start: issue.start, end: issue.end, reference }],
                settings.tokenReference,
                context.sourceCode
              )
            )
          });
        }
      };

      const hostAttributes: Visitors = options.hostAttributes
        ? {
            JSXAttribute(node) {
              const name = node.name as Node;
              const opening = node.parent;
              if (
                name.type === "JSXIdentifier" &&
                options.hostAttributes!.has(name.name as string) &&
                isHostElement(jsxElementName(opening?.name as Node))
              ) {
                for (const leaf of valueLeaves(node.value as Node)) {
                  checkLeaf(name.name as string, leaf);
                }
              }
            }
          }
        : {};

      return mergeVisitors(
        styleSources(
          context,
          {
            object: style =>
              forEachStyleProperty(style, property => {
                for (const leaf of valueLeaves(property.value)) {
                  checkLeaf(property.name, leaf);
                }
              }),
            template(style) {
              const parsed = parseCssTemplate(style.node);
              for (const declaration of parsed.declarations) {
                for (const issue of analyze(
                  declaration.name,
                  declaration.value
                )) {
                  const start = declaration.valueOffset + issue.start;
                  const end = declaration.valueOffset + issue.end;
                  context.report({
                    node: parsed.locate(start),
                    messageId: issue.messageId,
                    data: issue.data,
                    suggest: suggest(issue, reference =>
                      templateReplacementFix(
                        parsed,
                        [{ start, end, reference }],
                        settings.tokenReference
                      )
                    )
                  });
                }
              }
            }
          },
          settings
        ),
        hostAttributes
      );
    }
  };
}

/**
 * Literal parts of a value accepted by `accept` (lengths by default),
 * skipping references, functions, keywords and zero.
 */
function literalSpans(
  value: string | number,
  accept: (part: string) => boolean = isLengthLiteral
): Span[] {
  if (typeof value === "number") {
    return value === 0
      ? []
      : [{ start: 0, end: String(value).length, text: String(value) }];
  }

  return splitParts(value)
    .filter(
      ({ text }) =>
        !isReference(text) &&
        !isFunctionCall(text) &&
        !isKeyword(text) &&
        accept(text)
    )
    .map(({ text, start }) => ({ start, end: start + text.length, text }));
}

function wholeSpan(value: string | number): Span {
  const text = String(value);
  const start = text.length - text.trimStart().length;

  return { start, end: start + text.trim().length, text: text.trim() };
}

const COLOR_PROPERTY =
  /^(?:color|fill|stroke|background\w*|border\w*|outline\w*|columnRule\w*|textDecoration\w*|\w+Color)$/;

const SHADOW_PROPERTIES = new Set(["boxShadow", "textShadow"]);

const COLOR_ATTRIBUTES = new Set([
  "fill",
  "stroke",
  "color",
  "stopColor",
  "floodColor",
  "lightingColor"
]);

const SPACE_PROPERTIES = new Set([
  ...["padding", "margin", "scrollPadding", "scrollMargin", "inset"].flatMap(
    base =>
      [
        "",
        "Top",
        "Right",
        "Bottom",
        "Left",
        "Block",
        "BlockStart",
        "BlockEnd",
        "Inline",
        "InlineStart",
        "InlineEnd",
        "Horizontal",
        "Vertical",
        "Start",
        "End"
      ].map(suffix => `${base}${suffix}`)
  ),
  "gap",
  "rowGap",
  "columnGap",
  "gridGap",
  "gridRowGap",
  "gridColumnGap",
  "top",
  "right",
  "bottom",
  "left"
]);

const BORDER_SIDES =
  "(?:Top|Right|Bottom|Left|Block|BlockStart|BlockEnd|Inline|InlineStart|InlineEnd)?";

const RADIUS_PROPERTY =
  /^border(?:(?:Top|Bottom)(?:Left|Right)|(?:Start|End)(?:Start|End))?Radius$/;

const BORDER_WIDTH_PROPERTY = new RegExp(
  `^(?:border${BORDER_SIDES}Width|outlineWidth)$`
);

const BORDER_SHORTHAND = new RegExp(`^(?:border${BORDER_SIDES}|outline)$`);

const DURATION_PROPERTIES = new Set([
  "transitionDuration",
  "transitionDelay",
  "animationDuration",
  "animationDelay"
]);

const EASING_PROPERTIES = new Set([
  "transitionTimingFunction",
  "animationTimingFunction"
]);

function hasShadowLiteral(value: string): boolean {
  return findColorLiterals(value).length > 0 || literalSpans(value).length > 0;
}

function isWeightLiteral(part: string): boolean {
  return /^(?:\d+|bold|bolder|lighter)$/i.test(part);
}

function isDurationLiteral(part: string): boolean {
  const ms = parseDuration(part);

  return ms !== undefined && ms !== 0;
}

/** A reference to a token: a token function call or a `var(--…)` string. */
type TokenReference =
  | { kind: "call"; node: Node; argument?: Node; path?: string; name: string }
  | {
      kind: "var";
      node: Node;
      name: string;
      start: number;
      end: number;
      /** The string is exactly `var(--name)`. */
      whole: boolean;
    };

const VAR_REFERENCE = /var\(\s*(--[\w-]+)\s*[,)]/g;

const NON_VALUE_PARENTS = new Set([
  "ImportDeclaration",
  "ExportAllDeclaration",
  "ExportNamedDeclaration",
  "ImportExpression"
]);

/** Visitor factory: calls `visit` for every token reference in the file. */
function tokenReferences(
  settings: ResolvedSettings,
  visit: (reference: TokenReference) => void
): Visitors {
  const functions = new Set(settings.tokenFunctions);
  const scan = (node: Node, text: string) => {
    for (const match of text.matchAll(VAR_REFERENCE)) {
      const name = match[1]!;
      const start = text.indexOf(name, match.index);
      visit({
        kind: "var",
        node,
        name,
        start,
        end: start + name.length,
        whole: text.trim() === `var(${name})`
      });
    }
  };

  return {
    CallExpression(node) {
      const callee = unwrap(node.callee as Node);
      if (
        callee?.type === "Identifier" &&
        functions.has(callee.name as string)
      ) {
        const [argument] = node.arguments as Node[];
        visit({
          kind: "call",
          node,
          argument,
          path: staticString(argument),
          name: callee.name as string
        });
      }
    },
    Literal(node) {
      const parent = node.parent;
      if (
        typeof node.value === "string" &&
        !NON_VALUE_PARENTS.has(parent?.type ?? "") &&
        !(parent?.type === "Property" && parent.key === node)
      ) {
        scan(node, node.value);
      }
    },
    TemplateElement(node) {
      scan(node, (node.value as { cooked?: string }).cooked ?? "");
    }
  };
}

/** Parents where a string can be swapped for a call expression. */
const EXPRESSION_PARENTS = new Set([
  "Property",
  "JSXAttribute",
  "JSXExpressionContainer",
  "VariableDeclarator",
  "ArrayExpression",
  "ConditionalExpression",
  "LogicalExpression",
  "ReturnStatement",
  "AssignmentExpression",
  "CallExpression"
]);

function replaceCallArgument(
  argument: Node | undefined,
  path: string,
  context: RuleContext
): FixFunction | undefined {
  if (!argument || argument.type !== "Literal") {
    return undefined;
  }
  const quote = context.sourceCode.getText(argument)[0]!;

  return fixer => fixer.replaceText(argument, `${quote}${path}${quote}`);
}

/**
 * Build the token rules for a schema-derived manifest.
 */
export function createTokenRules(
  manifest: DesignSystemManifest,
  index: TokenIndex
): Partial<Record<CoreRuleId, RuleModule>> {
  const fontFamilies = new Set(
    manifest.fonts.map(font => normalizeFontFamily(font.family))
  );
  const fontList = manifest.fonts.map(font => font.family).join(", ");

  return {
    "ensure-design-token-usage": valueRule(index, {
      description:
        "Enforces usage of design tokens rather than hard-coded colors and shadows",
      messages: {
        hardCodedColor:
          'Hard-coded color "{{value}}". Use a color token{{examples}}; a missing value is a token to add, not a literal to inline',
        hardCodedShadow:
          'Hard-coded shadow "{{value}}". Use a shadow token{{examples}}'
      },
      hostAttributes: COLOR_ATTRIBUTES,
      analyzer: ({ examples }) => {
        const colorExamples = examples(["color"]);
        const shadowExamples = examples(["shadow"]);

        return (property, value) => {
          if (typeof value !== "string" || property.startsWith("--")) {
            return [];
          }
          if (SHADOW_PROPERTIES.has(property)) {
            if (!index.has("shadow") || !hasShadowLiteral(value)) {
              return [];
            }
            const span = wholeSpan(value);

            return [
              {
                ...span,
                messageId: "hardCodedShadow",
                data: { value: span.text, examples: shadowExamples },
                tokens: index.find(["shadow"], span.text)
              }
            ];
          }
          if (!index.has("color") || !COLOR_PROPERTY.test(property)) {
            return [];
          }

          return findColorLiterals(value).map(match => ({
            start: match.start,
            end: match.end,
            messageId: "hardCodedColor",
            data: { value: match.text, examples: colorExamples },
            tokens: index.find(["color"], match.text)
          }));
        };
      }
    }),

    "use-tokens-space": valueRule(index, {
      description:
        "Enforces usage of space design tokens rather than hard-coded values",
      messages: {
        noRawSpacingValues:
          'Hard-coded spacing "{{value}}" in {{property}}. Use a space token{{examples}}'
      },
      analyzer: ({ examples }) => {
        const spaceExamples = examples(["space"]);

        return (property, value) =>
          SPACE_PROPERTIES.has(property)
            ? literalSpans(value).map(span => ({
                ...span,
                messageId: "noRawSpacingValues",
                data: { value: span.text, property, examples: spaceExamples },
                tokens: index.find(["space"], span.text)
              }))
            : [];
      }
    }),

    "use-tokens-shape": valueRule(index, {
      description:
        "Enforces usage of shape (radius and border width) design tokens rather than hard-coded values",
      messages: {
        noRawRadiusValues:
          'Hard-coded radius "{{value}}" in {{property}}. Use a radius token{{examples}}; a new radius becomes a token first',
        noRawBorderWidthValues:
          'Hard-coded border width "{{value}}" in {{property}}. Use a border width token{{examples}}'
      },
      analyzer: ({ examples }) => {
        const radiusExamples = examples(["radius"]);
        const widthExamples = examples(["borderWidth"]);

        return (property, value) => {
          let category: TokenCategory | undefined;
          if (RADIUS_PROPERTY.test(property)) {
            category = "radius";
          } else if (
            BORDER_WIDTH_PROPERTY.test(property) ||
            BORDER_SHORTHAND.test(property)
          ) {
            category = "borderWidth";
          }
          if (!category || !index.has(category)) {
            return [];
          }

          return literalSpans(value).map(span => ({
            ...span,
            messageId:
              category === "radius"
                ? "noRawRadiusValues"
                : "noRawBorderWidthValues",
            data: {
              value: span.text,
              property,
              examples: category === "radius" ? radiusExamples : widthExamples
            },
            tokens: index.find([category], span.text)
          }));
        };
      }
    }),

    "use-tokens-typography": valueRule(index, {
      description:
        "Enforces usage of typography design tokens rather than hard-coded font values",
      messages: {
        noRawTypographyValues:
          'Hard-coded {{property}} "{{value}}". Use a typography token{{examples}}',
        unknownFontFamily:
          'Font family "{{value}}" is not part of the design system. Use one of: {{fonts}}'
      },
      analyzer: ({ examples }) => {
        const issue = (
          span: Span,
          property: string,
          categories: TokenCategory[]
        ): ValueIssue => ({
          ...span,
          messageId: "noRawTypographyValues",
          data: {
            value: span.text,
            property,
            examples: examples([...categories, "typography"])
          },
          tokens: index.find(categories, span.text)
        });

        return (property, value) => {
          switch (property) {
            case "fontSize":
            case "letterSpacing":
              return index.has(property)
                ? literalSpans(value).map(span =>
                    issue(span, property, [property])
                  )
                : [];
            case "lineHeight":
              return index.has("lineHeight")
                ? literalSpans(value, part => /^\d|^\./.test(part)).map(span =>
                    issue(span, property, ["lineHeight"])
                  )
                : [];
            case "fontWeight":
              return index.has("fontWeight")
                ? literalSpans(value, isWeightLiteral).map(span =>
                    issue(span, property, ["fontWeight"])
                  )
                : [];
            case "fontFamily": {
              if (
                typeof value !== "string" ||
                isKeyword(value.trim()) ||
                isReference(value.trim())
              ) {
                return [];
              }
              const span = wholeSpan(value);
              if (index.has("fontFamily")) {
                return [issue(span, property, ["fontFamily"])];
              }
              return fontFamilies.size > 0 &&
                !fontFamilies.has(normalizeFontFamily(value))
                ? [
                    {
                      ...span,
                      messageId: "unknownFontFamily",
                      data: { value: span.text, fonts: fontList },
                      tokens: []
                    }
                  ]
                : [];
            }
            case "font":
              return index.has("typography", "fontSize", "fontFamily") &&
                typeof value === "string" &&
                literalSpans(value).length > 0
                ? [issue(wholeSpan(value), property, [])]
                : [];
            default:
              return [];
          }
        };
      }
    }),

    "use-tokens-motion": valueRule(index, {
      description:
        "Enforces usage of motion design tokens rather than hard-coded durations and easings",
      messages: {
        noRawDuration:
          'Hard-coded duration "{{value}}" in {{property}}. Use a duration token{{examples}}',
        noRawEasing:
          'Hard-coded easing "{{value}}" in {{property}}. Use an easing token{{examples}}'
      },
      analyzer: ({ examples }) => {
        const durationExamples = examples(["duration"]);
        const easingExamples = examples(["easing"]);

        return (property, value) => {
          if (typeof value !== "string") {
            return [];
          }
          const shorthand =
            property === "transition" || property === "animation";
          const issues: ValueIssue[] = [];
          if (
            index.has("duration") &&
            (shorthand || DURATION_PROPERTIES.has(property))
          ) {
            issues.push(
              ...literalSpans(value, isDurationLiteral).map(span => ({
                ...span,
                messageId: "noRawDuration",
                data: {
                  value: span.text,
                  property,
                  examples: durationExamples
                },
                tokens: index.find(["duration"], span.text)
              }))
            );
          }
          if (
            index.has("easing") &&
            (shorthand || EASING_PROPERTIES.has(property))
          ) {
            issues.push(
              ...splitParts(value)
                .filter(({ text }) => isEasingLiteral(text))
                .map(({ text, start }) => ({
                  start,
                  end: start + text.length,
                  messageId: "noRawEasing",
                  data: { value: text, property, examples: easingExamples },
                  tokens: index.find(["easing"], text)
                }))
            );
          }

          return issues.sort((a, b) => a.start - b.start);
        };
      }
    }),

    "no-unsafe-design-token-usage": {
      meta: {
        type: "problem",
        docs: {
          description:
            "Enforces design token usage is statically analyzable and references tokens the design system defines"
        },
        messages: {
          staticToken:
            "Pass the token path to {{name}}() as a string literal so it can be checked against the design system",
          invalidToken:
            'The token "{{name}}" does not exist in the design system.{{suggestion}}',
          invalidCssVar:
            "The custom property {{name}} is not a design-system token.{{suggestion}}",
          directTokenUsage:
            "Access design tokens through the token function: {{reference}}",
          suggestToken: "Replace with {{replacement}}"
        },
        schema: [],
        fixable: "code",
        hasSuggestions: true
      },
      create(context) {
        const settings = readSettings(context);
        const didYouMean = (names: string[]) =>
          names.length > 0
            ? ` Did you mean ${names.map(name => `"${name}"`).join(", ")}?`
            : "";

        return tokenReferences(settings, reference => {
          if (reference.kind === "call") {
            if (reference.path === undefined) {
              context.report({
                node: reference.argument ?? reference.node,
                messageId: "staticToken",
                data: { name: reference.name }
              });
              return;
            }
            if (!index.byPath.has(reference.path)) {
              const similar = index.similar(reference.path);
              context.report({
                node: reference.argument!,
                messageId: "invalidToken",
                data: { name: reference.path, suggestion: didYouMean(similar) },
                suggest: similar.flatMap(path => {
                  const fix = replaceCallArgument(
                    reference.argument,
                    path,
                    context
                  );

                  return fix
                    ? [
                        {
                          messageId: "suggestToken",
                          data: { replacement: path },
                          fix
                        }
                      ]
                    : [];
                })
              });
            }
            return;
          }

          if (!index.isDesignSystemVar(reference.name)) {
            return;
          }
          const token = index.byCssVar.get(reference.name);
          if (!token) {
            const similar = index.similar(reference.name, "cssVar");
            const range = cookedRange(
              reference.node,
              reference.start,
              reference.end,
              context.sourceCode
            );
            context.report({
              node: reference.node,
              messageId: "invalidCssVar",
              data: { name: reference.name, suggestion: didYouMean(similar) },
              suggest: range
                ? similar.map(name => ({
                    messageId: "suggestToken",
                    data: { replacement: name },
                    fix: fixer => fixer.replaceTextRange(range, name)
                  }))
                : []
            });
            return;
          }
          if (settings.tokenReference !== "function") {
            return;
          }

          const call = index.reference(token, settings);
          const parent = reference.node.parent;
          const fixable =
            reference.whole &&
            reference.node.type === "Literal" &&
            EXPRESSION_PARENTS.has(parent?.type ?? "") &&
            !(parent?.type === "Property" && parent.key === reference.node);
          context.report({
            node: reference.node,
            messageId: "directTokenUsage",
            data: { reference: call },
            fix: fixable
              ? fixer =>
                  fixer.replaceText(
                    reference.node,
                    parent?.type === "JSXAttribute" ? `{${call}}` : call
                  )
              : undefined
          });
        });
      }
    },

    "no-deprecated-design-token-usage": {
      meta: {
        type: "problem",
        docs: { description: "Disallow using deprecated design tokens" },
        messages: {
          tokenDeprecated: 'The token "{{name}}" is deprecated{{note}}',
          tokenRenamed:
            'The token "{{name}}" is deprecated in favour of "{{replacement}}"',
          suggestReplacement: 'Replace with "{{replacement}}"'
        },
        schema: [],
        hasSuggestions: true
      },
      create(context) {
        const settings = readSettings(context);

        return tokenReferences(settings, reference => {
          const token =
            reference.kind === "call"
              ? reference.path === undefined
                ? undefined
                : index.byPath.get(reference.path)
              : index.byCssVar.get(reference.name);
          if (!token?.deprecated) {
            return;
          }

          const replacement = token.replacement
            ? index.byPath.get(token.replacement)
            : undefined;
          if (!replacement) {
            context.report({
              node: reference.node,
              messageId: "tokenDeprecated",
              data: {
                name: token.path,
                note:
                  typeof token.deprecated === "string"
                    ? `: ${token.deprecated}`
                    : ""
              }
            });
            return;
          }

          let fix: FixFunction | undefined;
          if (reference.kind === "call") {
            fix = replaceCallArgument(
              reference.argument,
              replacement.path,
              context
            );
          } else {
            const range = cookedRange(
              reference.node,
              reference.start,
              reference.end,
              context.sourceCode
            );
            fix = range
              ? fixer => fixer.replaceTextRange(range, replacement.cssVar)
              : undefined;
          }
          context.report({
            node: reference.node,
            messageId: "tokenRenamed",
            data: { name: token.path, replacement: replacement.path },
            suggest: fix
              ? [
                  {
                    messageId: "suggestReplacement",
                    data: {
                      replacement:
                        reference.kind === "call"
                          ? replacement.path
                          : replacement.cssVar
                    },
                    fix
                  }
                ]
              : []
          });
        });
      }
    }
  };
}
