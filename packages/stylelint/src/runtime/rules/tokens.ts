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
 * Token rules: the `@atlaskit/stylelint-design-system` rules
 * (`ensure-design-token-usage`, `no-unsafe-design-token-usage`,
 * `no-deprecated-design-token-usage`) and the `@razorwind/eslint`
 * `use-tokens-*` rules, applied to stylesheet declarations. Allowlists,
 * matches and examples come from the schema's own tokens.
 */

import type {
  CoreRuleId,
  DesignSystemManifest,
  FallbackUsage,
  ManifestToken,
  TokenCategory,
  TokenUsageDomains
} from "../../types";
import type { StylelintRule } from "../postcss";
import { createRule, createValueEdits, isCustomProperty } from "../postcss";
import type { TokenIndex } from "../tokens";
import {
  findColorLiterals,
  findVarCalls,
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
  /** Tokens whose value equals the literal; a single match is autofixed. */
  tokens: ManifestToken[];
}

/** Issues in a declaration (lowercased property, raw value). */
type Analyzer = (property: string, value: string) => ValueIssue[];

interface Span {
  start: number;
  end: number;
  text: string;
}

const MESSAGES = {
  hardCodedColor:
    'Hard-coded color "{{value}}". Use a color token{{hint}}; a missing value is a token to add, not a literal to inline',
  hardCodedShadow: 'Hard-coded shadow "{{value}}". Use a shadow token{{hint}}',
  noRawSpacingValues:
    'Hard-coded spacing "{{value}}" in {{property}}. Use a space token{{hint}}',
  noRawRadiusValues:
    'Hard-coded radius "{{value}}" in {{property}}. Use a radius token{{hint}}; a new radius becomes a token first',
  noRawBorderWidthValues:
    'Hard-coded border width "{{value}}" in {{property}}. Use a border width token{{hint}}',
  noRawTypographyValues:
    'Hard-coded {{property}} "{{value}}". Use a typography token{{hint}}',
  unknownFontFamily:
    'Font family "{{value}}" is not part of the design system. Use one of: {{fonts}}',
  noRawDuration:
    'Hard-coded duration "{{value}}" in {{property}}. Use a duration token{{hint}}',
  noRawEasing:
    'Hard-coded easing "{{value}}" in {{property}}. Use an easing token{{hint}}',
  nonTokenCssVariable:
    "The custom property {{name}} is not a design token. Reference a design token, or add the value to the schema as one"
} as const;

type MessageId = keyof typeof MESSAGES;

function pick(...ids: MessageId[]): Record<string, string> {
  return Object.fromEntries(ids.map(id => [id, MESSAGES[id]]));
}

/**
 * Literal parts of a value accepted by `accept` (lengths by default),
 * skipping references, functions, keywords and zero.
 */
function literalSpans(
  value: string,
  accept: (part: string) => boolean = isLengthLiteral
): Span[] {
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

function wholeSpan(value: string): Span {
  const start = value.length - value.trimStart().length;

  return { start, end: start + value.trim().length, text: value.trim() };
}

const COLOR_PROPERTY =
  /^(?:color|fill|stroke|background(?:-[a-z]+)*|border(?:-[a-z]+)*|outline(?:-[a-z]+)*|column-rule(?:-[a-z]+)*|text-decoration(?:-[a-z]+)*|[a-z-]+-color)$/;

const SHADOW_PROPERTIES = new Set(["box-shadow", "text-shadow"]);

const LOGICAL_SIDES = [
  "",
  "-block",
  "-block-start",
  "-block-end",
  "-inline",
  "-inline-start",
  "-inline-end"
];

const SPACE_PROPERTIES = new Set([
  ...["padding", "margin", "scroll-padding", "scroll-margin"].flatMap(base =>
    [...LOGICAL_SIDES, "-top", "-right", "-bottom", "-left"].map(
      side => `${base}${side}`
    )
  ),
  ...LOGICAL_SIDES.map(side => `inset${side}`),
  "gap",
  "row-gap",
  "column-gap",
  "grid-gap",
  "grid-row-gap",
  "grid-column-gap",
  "top",
  "right",
  "bottom",
  "left"
]);

const BORDER_SIDES =
  "(?:-(?:top|right|bottom|left|block|block-start|block-end|inline|inline-start|inline-end))?";

const RADIUS_PROPERTY =
  /^border(?:-(?:top|bottom)-(?:left|right)|-(?:start|end)-(?:start|end))?-radius$/;

const BORDER_WIDTH_PROPERTY = new RegExp(
  `^(?:border${BORDER_SIDES}-width|outline-width)$`
);

const BORDER_SHORTHAND = new RegExp(`^(?:border${BORDER_SIDES}|outline)$`);

const DURATION_PROPERTIES = new Set([
  "transition-duration",
  "transition-delay",
  "animation-duration",
  "animation-delay"
]);

const EASING_PROPERTIES = new Set([
  "transition-timing-function",
  "animation-timing-function"
]);

/** Typography properties and the token category each resolves against. */
const TYPOGRAPHY_CATEGORIES: Readonly<Record<string, TokenCategory>> = {
  "font-size": "fontSize",
  "letter-spacing": "letterSpacing",
  "line-height": "lineHeight",
  "font-weight": "fontWeight",
  "font-family": "fontFamily"
};

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

/** `{{hint}}`: the tokens matching a literal, else examples of the category. */
function hint(
  index: TokenIndex,
  tokens: ManifestToken[],
  categories: TokenCategory[]
): string {
  return tokens.length > 0
    ? ` (matching: ${tokens.map(index.reference).join(", ")})`
    : index.examples(categories);
}

function issue(
  index: TokenIndex,
  span: Span,
  messageId: MessageId,
  categories: TokenCategory[],
  data: Record<string, string> = {}
): ValueIssue {
  const tokens = index.find(categories, span.text);

  return {
    start: span.start,
    end: span.end,
    messageId,
    data: { value: span.text, ...data, hint: hint(index, tokens, categories) },
    tokens
  };
}

function colorAnalyzer(index: TokenIndex): Analyzer {
  return (property, value) => {
    if (SHADOW_PROPERTIES.has(property)) {
      return index.has("shadow") && hasShadowLiteral(value)
        ? [issue(index, wholeSpan(value), "hardCodedShadow", ["shadow"])]
        : [];
    }
    if (!index.has("color") || !COLOR_PROPERTY.test(property)) {
      return [];
    }

    return findColorLiterals(value).map(match =>
      issue(index, match, "hardCodedColor", ["color"])
    );
  };
}

function spaceAnalyzer(index: TokenIndex): Analyzer {
  return (property, value) =>
    index.has("space") && SPACE_PROPERTIES.has(property)
      ? literalSpans(value).map(span =>
          issue(index, span, "noRawSpacingValues", ["space"], { property })
        )
      : [];
}

function shapeAnalyzer(index: TokenIndex): Analyzer {
  return (property, value) => {
    const radius = RADIUS_PROPERTY.test(property);
    const category: TokenCategory | undefined = radius
      ? "radius"
      : BORDER_WIDTH_PROPERTY.test(property) || BORDER_SHORTHAND.test(property)
        ? "borderWidth"
        : undefined;
    if (!category || !index.has(category)) {
      return [];
    }

    return literalSpans(value).map(span =>
      issue(
        index,
        span,
        radius ? "noRawRadiusValues" : "noRawBorderWidthValues",
        [category],
        { property }
      )
    );
  };
}

function typographyAnalyzer(
  index: TokenIndex,
  manifest: DesignSystemManifest
): Analyzer {
  const fontFamilies = new Set(
    manifest.fonts.map(font => normalizeFontFamily(font.family))
  );
  const fontList = manifest.fonts.map(font => font.family).join(", ");
  const typographyIssue = (
    span: Span,
    property: string,
    categories: TokenCategory[]
  ): ValueIssue => {
    const found = issue(index, span, "noRawTypographyValues", categories, {
      property
    });

    return found.tokens.length > 0
      ? found
      : {
          ...found,
          data: {
            ...found.data,
            hint: index.examples([...categories, "typography"])
          }
        };
  };

  return (property, value) => {
    const category = TYPOGRAPHY_CATEGORIES[property];
    switch (category) {
      case "fontSize":
      case "letterSpacing":
        return index.has(category)
          ? literalSpans(value).map(span =>
              typographyIssue(span, property, [category])
            )
          : [];
      case "lineHeight":
        return index.has(category)
          ? literalSpans(value, part => /^\d|^\./.test(part)).map(span =>
              typographyIssue(span, property, [category])
            )
          : [];
      case "fontWeight":
        return index.has(category)
          ? literalSpans(value, isWeightLiteral).map(span =>
              typographyIssue(span, property, [category])
            )
          : [];
      case "fontFamily": {
        const trimmed = value.trim();
        if (!trimmed || isKeyword(trimmed) || isReference(trimmed)) {
          return [];
        }
        const span = wholeSpan(value);
        if (index.has("fontFamily")) {
          return [typographyIssue(span, property, ["fontFamily"])];
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
      default:
        return property === "font" &&
          index.has("typography", "fontSize", "fontFamily") &&
          literalSpans(value).length > 0
          ? [typographyIssue(wholeSpan(value), property, [])]
          : [];
    }
  };
}

function motionAnalyzer(index: TokenIndex): Analyzer {
  return (property, value) => {
    const shorthand = property === "transition" || property === "animation";
    const issues: ValueIssue[] = [];
    if (
      index.has("duration") &&
      (shorthand || DURATION_PROPERTIES.has(property))
    ) {
      issues.push(
        ...literalSpans(value, isDurationLiteral).map(span =>
          issue(index, span, "noRawDuration", ["duration"], { property })
        )
      );
    }
    if (index.has("easing") && (shorthand || EASING_PROPERTIES.has(property))) {
      issues.push(
        ...splitParts(value)
          .filter(({ text }) => isEasingLiteral(text))
          .map(({ text, start }) =>
            issue(
              index,
              { start, end: start + text.length, text },
              "noRawEasing",
              ["easing"],
              { property }
            )
          )
      );
    }

    return issues;
  };
}

/** `var(--x)` references to custom properties outside the design system. */
function nonTokenVariableAnalyzer(index: TokenIndex): Analyzer {
  return (_, value) =>
    findVarCalls(value)
      .filter(
        call =>
          !index.byCssVar.has(call.name) && !index.isDesignSystemVar(call.name)
      )
      .map(call => ({
        start: call.start,
        end: call.end,
        messageId: "nonTokenCssVariable",
        data: { name: call.name },
        tokens: []
      }));
}

/**
 * A rule that runs analyzers over every declaration (custom property
 * definitions excepted) and replaces a literal with the token whose value it
 * equals when exactly one token matches.
 */
function valueRule<P = true>(
  index: TokenIndex,
  options: {
    ruleName: string;
    description: string;
    messages: Record<string, string>;
    primary?: unknown;
    analyzers: (primary: P) => Analyzer[];
  }
): StylelintRule {
  return createRule<P>({
    ruleName: options.ruleName,
    description: options.description,
    messages: options.messages,
    fixable: true,
    primary: options.primary,
    run: primary => {
      const analyzers = options.analyzers(primary);

      return (root, report) => {
        const edits = createValueEdits();
        root.walkDecls(decl => {
          if (isCustomProperty(decl)) {
            return;
          }
          const property = decl.prop.toLowerCase();
          const value = edits.read(decl);
          const issues = analyzers
            .flatMap(analyze => analyze(property, value))
            .sort((a, b) => a.start - b.start);
          for (const found of issues) {
            const [token, ...others] = found.tokens;
            report({
              node: decl,
              messageId: found.messageId,
              data: found.data,
              ...edits.range(decl, found.start, found.end),
              fix:
                token && others.length === 0
                  ? () =>
                      edits.replace(
                        decl,
                        found.start,
                        found.end,
                        index.reference(token)
                      )
                  : undefined
            });
          }
        });
      };
    }
  });
}

const DEFAULT_DOMAINS: Required<TokenUsageDomains> = {
  color: true,
  spacing: false,
  typography: false,
  nonTokenCssVariables: false
};

const DOMAIN_KEYS = Object.keys(DEFAULT_DOMAINS);

function isTokenUsageDomains(value: unknown): boolean {
  return (
    value === true ||
    (typeof value === "object" &&
      value !== null &&
      !Array.isArray(value) &&
      Object.entries(value).every(
        ([key, enabled]) =>
          DOMAIN_KEYS.includes(key) && typeof enabled === "boolean"
      ))
  );
}

const FALLBACK_USAGES: FallbackUsage[] = ["forced", "optional", "none"];

interface UnsafeOptions {
  fallbackUsage?: FallbackUsage;
  /** `\@atlaskit/stylelint-design-system` flag: `true` → forced, `false` → none. */
  shouldEnsureFallbackUsage?: boolean;
}

/**
 * Build the token rules for a schema-derived manifest.
 */
export function createTokenRules(
  manifest: DesignSystemManifest,
  index: TokenIndex
): Partial<Record<CoreRuleId, StylelintRule>> {
  const ruleName = (id: CoreRuleId) => `${manifest.prefix}/${id}`;
  const didYouMean = (names: string[]) =>
    names.length > 0 ? ` Did you mean ${names.join(", ")}?` : "";

  return {
    "ensure-design-token-usage": valueRule<true | TokenUsageDomains>(index, {
      ruleName: ruleName("ensure-design-token-usage"),
      description:
        "Enforces usage of design tokens rather than hard-coded colors and shadows (and, when enabled, spacing, typography and non-token custom properties)",
      messages: pick(
        "hardCodedColor",
        "hardCodedShadow",
        "noRawSpacingValues",
        "noRawTypographyValues",
        "unknownFontFamily",
        "nonTokenCssVariable"
      ),
      primary: isTokenUsageDomains,
      analyzers: primary => {
        const domains = {
          ...DEFAULT_DOMAINS,
          ...(primary === true ? {} : primary)
        };

        return [
          ...(domains.color ? [colorAnalyzer(index)] : []),
          ...(domains.spacing ? [spaceAnalyzer(index)] : []),
          ...(domains.typography ? [typographyAnalyzer(index, manifest)] : []),
          ...(domains.nonTokenCssVariables
            ? [nonTokenVariableAnalyzer(index)]
            : [])
        ];
      }
    }),

    "use-tokens-space": valueRule(index, {
      ruleName: ruleName("use-tokens-space"),
      description:
        "Enforces usage of space design tokens rather than hard-coded values",
      messages: pick("noRawSpacingValues"),
      analyzers: () => [spaceAnalyzer(index)]
    }),

    "use-tokens-shape": valueRule(index, {
      ruleName: ruleName("use-tokens-shape"),
      description:
        "Enforces usage of shape (radius and border width) design tokens rather than hard-coded values",
      messages: pick("noRawRadiusValues", "noRawBorderWidthValues"),
      analyzers: () => [shapeAnalyzer(index)]
    }),

    "use-tokens-typography": valueRule(index, {
      ruleName: ruleName("use-tokens-typography"),
      description:
        "Enforces usage of typography design tokens rather than hard-coded font values",
      messages: pick("noRawTypographyValues", "unknownFontFamily"),
      analyzers: () => [typographyAnalyzer(index, manifest)]
    }),

    "use-tokens-motion": valueRule(index, {
      ruleName: ruleName("use-tokens-motion"),
      description:
        "Enforces usage of motion design tokens rather than hard-coded durations and easings",
      messages: pick("noRawDuration", "noRawEasing"),
      analyzers: () => [motionAnalyzer(index)]
    }),

    "no-unsafe-design-token-usage": createRule<true, UnsafeOptions>({
      ruleName: ruleName("no-unsafe-design-token-usage"),
      description:
        "Enforces that token references exist in the design system and follow the fallback strategy",
      messages: {
        invalidToken:
          "The token {{name}} does not exist in the design system.{{suggestion}}",
        missingFallback:
          "Token {{name}} is missing a fallback. Add one so the style survives without the token stylesheet",
        hasFallback:
          "Token {{name}} has a fallback. Reference the token alone so the design system stays the single source of the value"
      },
      fixable: true,
      secondary: {
        fallbackUsage: FALLBACK_USAGES,
        shouldEnsureFallbackUsage: [true, false]
      },
      run: (_, secondary) => {
        const strategy: FallbackUsage =
          secondary.shouldEnsureFallbackUsage === true
            ? "forced"
            : secondary.shouldEnsureFallbackUsage === false
              ? "none"
              : (secondary.fallbackUsage ?? "optional");

        return (root, report) => {
          const edits = createValueEdits();
          root.walkDecls(decl => {
            // Fallbacks a fix removes; calls nested in them are skipped.
            const removed: [number, number][] = [];
            for (const call of findVarCalls(edits.read(decl))) {
              if (
                !index.isDesignSystemVar(call.name) ||
                removed.some(
                  ([start, end]) => call.start >= start && call.start < end
                )
              ) {
                continue;
              }
              const range = edits.range(decl, call.nameStart, call.nameEnd);
              const token = index.byCssVar.get(call.name);
              if (!token) {
                report({
                  node: decl,
                  messageId: "invalidToken",
                  data: {
                    name: call.name,
                    suggestion: didYouMean(index.similar(call.name))
                  },
                  ...range
                });
                continue;
              }

              if (strategy === "forced" && !call.fallback) {
                const value = token.value;
                report({
                  node: decl,
                  messageId: "missingFallback",
                  data: { name: call.name },
                  ...range,
                  fix: value
                    ? () =>
                        edits.replace(
                          decl,
                          call.nameEnd,
                          call.end - 1,
                          `, ${value}`
                        )
                    : undefined
                });
              } else if (strategy === "none" && call.fallback) {
                removed.push([call.nameEnd, call.end - 1]);
                report({
                  node: decl,
                  messageId: "hasFallback",
                  data: { name: call.name },
                  ...range,
                  fix: () => edits.replace(decl, call.nameEnd, call.end - 1, "")
                });
              }
            }
          });
        };
      }
    }),

    "no-deprecated-design-token-usage": createRule({
      ruleName: ruleName("no-deprecated-design-token-usage"),
      description: "Disallow using deprecated design tokens",
      messages: {
        tokenDeprecated: "The token {{name}} is deprecated{{note}}",
        tokenRenamed:
          "The token {{name}} is deprecated in favour of {{replacement}}"
      },
      fixable: true,
      run: () => (root, report) => {
        const edits = createValueEdits();
        root.walkDecls(decl => {
          for (const call of findVarCalls(edits.read(decl))) {
            const token = index.byCssVar.get(call.name);
            if (!token?.deprecated) {
              continue;
            }
            const range = edits.range(decl, call.nameStart, call.nameEnd);
            const replacement = token.replacement
              ? index.byPath.get(token.replacement)
              : undefined;
            if (!replacement) {
              report({
                node: decl,
                messageId: "tokenDeprecated",
                data: {
                  name: call.name,
                  note:
                    typeof token.deprecated === "string"
                      ? `: ${token.deprecated}`
                      : ""
                },
                ...range
              });
              continue;
            }

            report({
              node: decl,
              messageId: "tokenRenamed",
              data: { name: call.name, replacement: replacement.cssVar },
              ...range,
              fix: () =>
                edits.replace(
                  decl,
                  call.nameStart,
                  call.nameEnd,
                  replacement.cssVar
                )
            });
          }
        });
      }
    })
  };
}
