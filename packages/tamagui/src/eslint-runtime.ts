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
 * Runtime for the ESLint guardrails emitted by `@razorwind/tamagui/eslint`.
 *
 * The generated module serializes a {@link GuardrailTheme} (the token, theme
 * and font names the generated Tamagui config defines) and passes it to
 * {@link createGuardrails}. Rules read Tamagui v3 flat values
 * (`bg="background hover:background-hover"`, `p="4 sm:6"`) from JSX style
 * props and `styled()` configs, so the lint surface tracks the generated
 * config. Grammar and typo checks stay with `@tamagui/eslint-plugin`'s
 * `valid-flat-values`; these rules enforce design-system usage on top of it.
 *
 * No dependency on eslint's types: the rule shapes below are the subset the
 * plugin needs, typed locally so this entry stays dependency-free.
 *
 * @see https://github.com/tamagui/tamagui/tree/v3-beta
 */

import type {
  GuardrailOptions,
  GuardrailRuleId,
  GuardrailSettings,
  GuardrailSeverity,
  GuardrailTheme,
  GuardrailTokenCategory
} from "./types";

export type {
  GuardrailOptions,
  GuardrailRuleId,
  GuardrailSettings,
  GuardrailSeverity,
  GuardrailTheme,
  GuardrailTokenCategory
} from "./types";

interface Node {
  type: string;
  parent?: Node;
  [key: string]: unknown;
}

interface ReportDescriptor {
  node: Node;
  messageId: string;
  data?: Record<string, string>;
}

interface RuleContext {
  report: (descriptor: ReportDescriptor) => void;
  settings?: Record<string, unknown>;
}

export interface GuardrailRuleModule {
  meta: {
    type: "problem" | "suggestion";
    docs: { description: string };
    messages: Record<string, string>;
    schema: [];
  };
  create: (context: RuleContext) => Record<string, (node: Node) => void>;
}

export interface GuardrailPlugin {
  meta: { name: string; version: string };
  rules: Record<GuardrailRuleId, GuardrailRuleModule>;
}

export interface Guardrails {
  plugin: GuardrailPlugin;
  rules: Record<GuardrailRuleId, GuardrailRuleModule>;
  defaultSeverity: Record<GuardrailRuleId, GuardrailSeverity>;
  /** Build a flat-config block to spread into `eslint.config.*`. */
  config: (options?: GuardrailOptions) => {
    files: string[];
    ignores: string[];
    plugins: Record<string, GuardrailPlugin>;
    settings: Record<string, GuardrailSettings>;
    rules: Record<string, GuardrailSeverity>;
  };
}

/** Settings key the plugin reads style sources from. */
export const SETTINGS_KEY = "razorwind-tamagui";

export const DEFAULT_STYLED_CALLEES = ["styled"];

/**
 * `@tamagui/shorthands/v5`, the shorthands shipped with `@tamagui/config/v5`.
 *
 * @see https://github.com/tamagui/tamagui/blob/v3-beta/code/core/shorthands/src/v5.ts
 */
export const DEFAULT_SHORTHANDS: Readonly<Record<string, string>> = {
  text: "textAlign",
  b: "bottom",
  bg: "backgroundColor",
  content: "alignContent",
  grow: "flexGrow",
  items: "alignItems",
  justify: "justifyContent",
  l: "left",
  m: "margin",
  maxH: "maxHeight",
  maxW: "maxWidth",
  mb: "marginBottom",
  minH: "minHeight",
  minW: "minWidth",
  ml: "marginLeft",
  mr: "marginRight",
  mt: "marginTop",
  mx: "marginHorizontal",
  my: "marginVertical",
  p: "padding",
  pb: "paddingBottom",
  pl: "paddingLeft",
  pr: "paddingRight",
  pt: "paddingTop",
  px: "paddingHorizontal",
  py: "paddingVertical",
  r: "right",
  rounded: "borderRadius",
  select: "userSelect",
  self: "alignSelf",
  shrink: "flexShrink",
  t: "top",
  z: "zIndex"
};

/**
 * V2 pseudo-state condition objects replaced by v3 value modifiers.
 * `enterStyle` / `exitStyle` stay authored (`exit:` only evaluates on native).
 */
const LEGACY_CONDITION_PROPS: Readonly<Record<string, string>> = {
  hoverStyle: "hover",
  pressStyle: "press",
  focusStyle: "focus",
  focusVisibleStyle: "focus-visible",
  focusWithinStyle: "focus-within",
  disabledStyle: "disabled"
};

const RADIUS_PROPS = [
  "borderRadius",
  "borderTopLeftRadius",
  "borderTopRightRadius",
  "borderBottomLeftRadius",
  "borderBottomRightRadius",
  "borderTopStartRadius",
  "borderTopEndRadius",
  "borderBottomStartRadius",
  "borderBottomEndRadius",
  "borderStartStartRadius",
  "borderStartEndRadius",
  "borderEndStartRadius",
  "borderEndEndRadius"
];

const SIZE_PROPS = [
  "width",
  "height",
  "minWidth",
  "minHeight",
  "maxWidth",
  "maxHeight",
  "blockSize",
  "minBlockSize",
  "maxBlockSize",
  "inlineSize",
  "minInlineSize",
  "maxInlineSize",
  "flexBasis",
  "shadowRadius"
];

const COLOR_PROPS = [
  "backgroundColor",
  "borderColor",
  "borderBlockStartColor",
  "borderBlockEndColor",
  "borderBlockColor",
  "borderBottomColor",
  "borderInlineColor",
  "borderInlineStartColor",
  "borderInlineEndColor",
  "borderTopColor",
  "borderLeftColor",
  "borderRightColor",
  "borderEndColor",
  "borderStartColor",
  "shadowColor",
  "color",
  "textDecorationColor",
  "textShadowColor",
  "outlineColor",
  "caretColor",
  "placeholderTextColor",
  "selectionColor",
  "cursorColor",
  "selectionHandleColor"
];

const SPACE_PROPS = [
  "x",
  "y",
  "borderWidth",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "borderBlockWidth",
  "borderBlockStartWidth",
  "borderBlockEndWidth",
  "borderInlineWidth",
  "borderInlineStartWidth",
  "borderInlineEndWidth",
  "outlineOffset",
  "outlineWidth",
  "gap",
  "rowGap",
  "columnGap",
  "top",
  "right",
  "bottom",
  "left",
  "inset",
  "insetBlock",
  "insetBlockEnd",
  "insetBlockStart",
  "insetInline",
  "insetInlineEnd",
  "insetInlineStart",
  "margin",
  "marginBlock",
  "marginBlockEnd",
  "marginBlockStart",
  "marginInline",
  "marginInlineEnd",
  "marginInlineStart",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginEnd",
  "marginLeft",
  "marginHorizontal",
  "marginStart",
  "marginVertical",
  "padding",
  "paddingBlock",
  "paddingBlockEnd",
  "paddingBlockStart",
  "paddingInline",
  "paddingInlineEnd",
  "paddingInlineStart",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingEnd",
  "paddingLeft",
  "paddingHorizontal",
  "paddingStart",
  "paddingVertical"
];

/**
 * Style property → token category, mirroring `@tamagui/style-grammar`'s
 * `propToTokenCategoryCode`.
 *
 * @see https://github.com/tamagui/tamagui/blob/v3-beta/code/core/style-grammar/src/runtime/tokenCategories.ts
 */
export const PROP_TOKEN_CATEGORY: Readonly<
  Record<string, GuardrailTokenCategory>
> = Object.fromEntries([
  ...RADIUS_PROPS.map(prop => [prop, "radius"]),
  ...SIZE_PROPS.map(prop => [prop, "size"]),
  ...COLOR_PROPS.map(prop => [prop, "color"]),
  ...SPACE_PROPS.map(prop => [prop, "space"]),
  ["zIndex", "zIndex"],
  ["fontFamily", "fontFamily"],
  ["fontSize", "fontSize"],
  ["fontWeight", "fontWeight"],
  ["lineHeight", "lineHeight"],
  ["letterSpacing", "letterSpacing"],
  ["boxShadow", "shadow"],
  ["textShadow", "shadow"]
]);

/** Tailwind / Radix palette hues shipped by the stock Tamagui configs. */
const STOCK_HUES = [
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
  "slate",
  "gray",
  "zinc",
  "neutral",
  "stone"
];

const STOCK_PALETTE = new RegExp(
  // eslint-disable-next-line regexp/no-useless-non-capturing-group
  String.raw`^(?:${STOCK_HUES.join("|")})(?:-?\d{1,3})$`
);

const COLOR_LITERAL =
  /^(?:#[0-9a-f]{3,8}|(?:oklch|oklab|rgba?|hsla?|lab|lch|hwb|color)\()/i;

const LENGTH_LITERAL =
  /^-?(?:\d+(?:\.\d*)?|\.\d+)(?:px|r?em|pt|dv[hw]|sv[hw]|lv[hw]|v[hw]|vmin|vmax|ch|ex)$|^(?:calc|clamp|min|max)\(/i;

const NUMERIC_LITERAL = /^-?(?:\d+(?:\.\d*)?|\.\d+)$/;

/** `hover:`, `sm:`, `group-hover/card:`, `@sm/card:` … (chainable). */
const MODIFIER_PREFIX = /^((?:[@a-z][\w.-]*(?:\/[\w-]+)?:)+)(.*)$/i;

const FALLBACK_EXAMPLES = 4;

function examples(names: readonly string[] | undefined): string {
  if (!names || names.length === 0) {
    return "";
  }

  const shown = names.slice(0, FALLBACK_EXAMPLES).map(name => `"${name}"`);

  return ` (e.g. ${shown.join(", ")}${names.length > shown.length ? ", …" : ""})`;
}

function hasTokens(
  theme: GuardrailTheme,
  ...categories: GuardrailTokenCategory[]
): boolean {
  return categories.some(category => (theme.tokens[category]?.length ?? 0) > 0);
}

// ─── flat value parsing ─────────────────────────────────────────────────────

/** One `modifier:…:payload` clause (or the unconditioned base). */
export interface FlatValueClause {
  modifiers: string[];
  /** Whitespace-separated payload parts (`4 6`, `0 2px 4px red`). */
  parts: string[];
}

/** Split on whitespace outside parentheses (`rgb(0 0 0 / 50%)` stays whole). */
function splitWords(text: string): string[] {
  const words: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of text) {
    if (char === "(") {
      depth++;
    } else if (char === ")") {
      depth = Math.max(depth - 1, 0);
    }
    if (depth === 0 && /\s/.test(char)) {
      if (current) {
        words.push(current);
      }
      current = "";
    } else {
      current += char;
    }
  }
  if (current) {
    words.push(current);
  }

  return words;
}

/**
 * Parse a Tamagui v3 flat value (`base? clause*`) into clauses.
 *
 * @example
 * parseFlatValue("4 6 sm:6 4")
 * // [\{ modifiers: [], parts: ["4", "6"] \}, \{ modifiers: ["sm"], parts: ["6", "4"] \}]
 */
export function parseFlatValue(text: string): FlatValueClause[] {
  const clauses: FlatValueClause[] = [];
  let current: FlatValueClause | undefined;
  for (const word of splitWords(text)) {
    const match = MODIFIER_PREFIX.exec(word);
    if (match && !COLOR_LITERAL.test(word)) {
      current = {
        modifiers: match[1]!.split(":").filter(Boolean),
        parts: match[2] ? [match[2]] : []
      };
      clauses.push(current);
    } else if (current) {
      current.parts.push(word);
    } else {
      current = { modifiers: [], parts: [word] };
      clauses.push(current);
    }
  }

  return clauses;
}

function clauseText(clause: FlatValueClause): string {
  return [...clause.modifiers, clause.parts.join(" ")].join(":");
}

// ─── style source discovery ─────────────────────────────────────────────────

type Leaf =
  | { node: Node; kind: "string"; text: string }
  | { node: Node; kind: "number"; value: number };

/**
 * Static value leaves of a style prop: literals, template quasis, and both
 * branches of conditional / logical expressions. Call arguments and other
 * computed values are not inspected.
 */
function valueLeaves(node: Node | undefined | null, out: Leaf[] = []): Leaf[] {
  if (!node) {
    return out;
  }

  switch (node.type) {
    case "Literal":
      if (typeof node.value === "string") {
        out.push({ node, kind: "string", text: node.value });
      } else if (typeof node.value === "number") {
        out.push({ node, kind: "number", value: node.value });
      }
      break;
    case "TemplateLiteral":
      for (const quasi of (node.quasis as Node[] | undefined) ?? []) {
        const cooked = (quasi.value as { cooked?: string } | undefined)?.cooked;
        if (cooked) {
          out.push({ node: quasi, kind: "string", text: cooked });
        }
      }
      break;
    case "UnaryExpression": {
      const argument = node.argument as Node | undefined;
      if (
        node.operator === "-" &&
        argument?.type === "Literal" &&
        typeof argument.value === "number"
      ) {
        out.push({ node, kind: "number", value: -argument.value });
      }
      break;
    }
    case "JSXExpressionContainer":
    case "TSAsExpression":
    case "TSSatisfiesExpression":
    case "TSNonNullExpression":
      valueLeaves(node.expression as Node, out);
      break;
    case "ConditionalExpression":
      valueLeaves(node.consequent as Node, out);
      valueLeaves(node.alternate as Node, out);
      break;
    case "LogicalExpression":
      valueLeaves(node.left as Node, out);
      valueLeaves(node.right as Node, out);
      break;
    default:
      break;
  }

  return out;
}

/** A style property with its resolved name, token category and value leaves. */
interface StyleSite {
  /** Authored prop / key (`bg`). */
  prop: string;
  /** Style property after shorthand expansion (`backgroundColor`). */
  property: string;
  category?: GuardrailTokenCategory;
  leaves: Leaf[];
}

interface StyleHandlers {
  site?: (site: StyleSite) => void;
  legacy?: (node: Node, prop: string) => void;
}

function readSettings(context: RuleContext): GuardrailSettings {
  return context.settings?.[SETTINGS_KEY] ?? {};
}

function calleeName(node: Node): string | undefined {
  const callee = node.callee as Node | undefined;
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

/** `View`, `Stack.Item` → last segment; lowercase host elements are skipped. */
function elementName(node: Node | undefined): string | undefined {
  if (node?.type === "JSXIdentifier") {
    return node.name as string;
  }
  if (node?.type === "JSXMemberExpression") {
    return elementName(node.property as Node);
  }

  return undefined;
}

function propertyKey(node: Node): string | undefined {
  if (node.computed) {
    return undefined;
  }
  const key = node.key as Node | undefined;
  if (key?.type === "Identifier") {
    return key.name as string;
  }
  if (key?.type === "Literal" && typeof key.value === "string") {
    return key.value;
  }

  return undefined;
}

function isLegacyConditionProp(prop: string): boolean {
  return prop in LEGACY_CONDITION_PROPS || prop.startsWith("$");
}

/**
 * Visitor factory: calls `handlers.site` for every style prop on a JSX
 * component and every style key inside `styled()` configs (including
 * `variants`), and `handlers.legacy` for v2 condition objects.
 */
function styleSources(
  context: RuleContext,
  theme: GuardrailTheme,
  handlers: StyleHandlers
): Record<string, (node: Node) => void> {
  const settings = readSettings(context);
  const components = settings.components
    ? new Set(settings.components)
    : undefined;
  const callees = new Set(settings.callees ?? DEFAULT_STYLED_CALLEES);

  const visitProp = (prop: string, keyNode: Node, value: Node | undefined) => {
    if (isLegacyConditionProp(prop)) {
      handlers.legacy?.(keyNode, prop);
      return;
    }

    const property = theme.shorthands[prop] ?? prop;
    const category = PROP_TOKEN_CATEGORY[property];
    if (category) {
      handlers.site?.({ prop, property, category, leaves: valueLeaves(value) });
    }
  };

  const visitObject = (node: Node) => {
    for (const property of (node.properties as Node[] | undefined) ?? []) {
      if (property.type !== "Property") {
        continue;
      }
      const key = propertyKey(property);
      const value = property.value as Node | undefined;
      if (key && isLegacyConditionProp(key)) {
        handlers.legacy?.(property, key);
      } else if (value?.type === "ObjectExpression") {
        // `variants`, variant values and `defaultVariants` nest style objects.
        visitObject(value);
      } else if (key) {
        visitProp(key, property, value);
      }
    }
  };

  return {
    JSXAttribute(node) {
      const opening = node.parent;
      const name = elementName(opening?.name as Node | undefined);
      if (!name || !/^[A-Z]/.test(name)) {
        return;
      }
      if (components && !components.has(name)) {
        return;
      }
      const attribute = node.name as Node | undefined;
      if (attribute?.type !== "JSXIdentifier") {
        return;
      }
      visitProp(attribute.name as string, node, node.value as Node | undefined);
    },
    CallExpression(node) {
      const name = calleeName(node);
      if (!name || !callees.has(name)) {
        return;
      }
      for (const argument of (node.arguments as Node[] | undefined) ?? []) {
        if (argument.type === "ObjectExpression") {
          visitObject(argument);
        }
      }
    }
  };
}

// ─── rule builders ──────────────────────────────────────────────────────────

type Report = (node: Node, match: string) => void;

/** A rule that reports through `check` once per style site. */
function styleRule(
  theme: GuardrailTheme,
  description: string,
  message: string,
  check: (site: StyleSite, report: Report) => void
): GuardrailRuleModule {
  return {
    meta: {
      type: "problem",
      docs: { description },
      messages: { violation: message },
      schema: []
    },
    create(context) {
      const report: Report = (node, match) =>
        context.report({ node, messageId: "violation", data: { match } });

      return styleSources(context, theme, {
        site: site => check(site, report)
      });
    }
  };
}

/** Call `visit` for every clause of every string leaf of a site. */
function forEachClause(
  site: StyleSite,
  visit: (clause: FlatValueClause, leaf: Leaf & { kind: "string" }) => void
): void {
  for (const leaf of site.leaves) {
    if (leaf.kind === "string") {
      for (const clause of parseFlatValue(leaf.text)) {
        visit(clause, leaf);
      }
    }
  }
}

/**
 * Reports raw numbers (`p={13}`), CSS lengths (`p="13px"`) and numeric names
 * the category does not define (`p="13"`, which v3 reads as literal CSS).
 * Zero is always allowed.
 */
function scaleLiteralCheck(
  theme: GuardrailTheme,
  categories: readonly GuardrailTokenCategory[]
): (site: StyleSite, report: Report) => void {
  const names = new Map(
    categories.map(category => [category, new Set(theme.tokens[category])])
  );

  return (site, report) => {
    const defined = site.category ? names.get(site.category) : undefined;
    if (!defined) {
      return;
    }

    for (const leaf of site.leaves) {
      if (leaf.kind === "number") {
        if (leaf.value !== 0) {
          report(leaf.node, `${site.prop}={${leaf.value}}`);
        }
        continue;
      }

      for (const clause of parseFlatValue(leaf.text)) {
        for (const part of clause.parts) {
          const bare = part.replace(/^-/, "");
          if (
            LENGTH_LITERAL.test(part) ||
            (NUMERIC_LITERAL.test(part) &&
              Number(part) !== 0 &&
              !defined.has(part) &&
              !defined.has(bare))
          ) {
            report(leaf.node, `${site.prop}="${clauseText(clause)}"`);
            break;
          }
        }
      }
    }
  };
}

/**
 * Build the guardrail rules, default severities and flat-config factory for a
 * schema-derived Tamagui vocabulary.
 */
export function createGuardrails(theme: GuardrailTheme): Guardrails {
  const colors = new Set(theme.tokens.color ?? []);
  const fontFamilies = new Set(theme.tokens.fontFamily ?? []);
  const hasDark = theme.themes.some(id => id.toLowerCase() === "dark");
  const typography = [
    "fontSize",
    "fontWeight",
    "lineHeight",
    "letterSpacing"
  ] as const;
  const typographyLiteral = scaleLiteralCheck(theme, typography);

  const legacyConditionRule: GuardrailRuleModule = {
    meta: {
      type: "problem",
      docs: {
        description:
          "No v2 condition objects (hoverStyle, $sm, $theme-dark, …); Tamagui v3 writes conditions into the value"
      },
      messages: {
        pseudo:
          '{{prop}} is a Tamagui v2 condition object. Move each style into its property as a "{{modifier}}:" clause (e.g. bg="background {{modifier}}:background-hover")',
        condition:
          '{{prop}} is a Tamagui v2 condition object. Move each style into its property as a "{{modifier}}:" clause (e.g. p="4 {{modifier}}:6")'
      },
      schema: []
    },
    create(context) {
      return styleSources(context, theme, {
        legacy(node, prop) {
          const pseudo = LEGACY_CONDITION_PROPS[prop];
          context.report({
            node,
            messageId: pseudo ? "pseudo" : "condition",
            data: {
              prop,
              modifier:
                pseudo ?? prop.replace(/^\$(?:theme-|platform-|group-)?/, "")
            }
          });
        }
      });
    }
  };

  const rules: Record<GuardrailRuleId, GuardrailRuleModule> = {
    "no-legacy-token-prefix": styleRule(
      theme,
      "No $-prefixed token names; Tamagui v3 resolves bare names",
      'Tamagui v3 removed the $ sigil ({{match}}). Write the bare token name: "$4" → "4", "$backgroundHover" → "background-hover"',
      (site, report) => {
        for (const leaf of site.leaves) {
          if (leaf.kind !== "string") {
            continue;
          }
          for (const match of leaf.text.matchAll(/(?<![\w$])\$[\w.-]+/g)) {
            report(leaf.node, match[0]);
          }
        }
      }
    ),

    "no-legacy-condition-object": legacyConditionRule,

    "no-color-literal": styleRule(
      theme,
      "No raw color value (hex, oklch, rgb, hsl, …) in a color style prop",
      `Raw color value in a style prop ({{match}}). Use a color token or theme value${examples(theme.tokens.color)}; a missing value is a token to add, not a literal to inline`,
      (site, report) => {
        if (site.category !== "color") {
          return;
        }
        forEachClause(site, (clause, leaf) => {
          for (const part of clause.parts) {
            if (COLOR_LITERAL.test(part)) {
              report(leaf.node, `${site.prop}="${clauseText(clause)}"`);
            }
          }
        });
      }
    ),

    "no-stock-palette": styleRule(
      theme,
      "No stock Tamagui / Tailwind palette color that the design system does not define",
      `Stock palette color ({{match}}) is not a design token. Use a color token or theme value${examples(theme.tokens.color)}`,
      (site, report) => {
        if (site.category !== "color") {
          return;
        }
        forEachClause(site, (clause, leaf) => {
          for (const part of clause.parts) {
            if (STOCK_PALETTE.test(part) && !colors.has(part)) {
              report(leaf.node, `${site.prop}="${clauseText(clause)}"`);
            }
          }
        });
      }
    ),

    "no-spacing-literal": styleRule(
      theme,
      "No raw or unknown spacing value in a space style prop",
      `Raw spacing value ({{match}}). Use the space scale${examples(theme.tokens.space)}`,
      scaleLiteralCheck(theme, ["space"])
    ),

    "no-radius-literal": styleRule(
      theme,
      "No raw or unknown radius value in a radius style prop",
      `Raw radius value ({{match}}). Use a radius token${examples(theme.tokens.radius)}; a new radius becomes a token first`,
      scaleLiteralCheck(theme, ["radius"])
    ),

    "no-typography-literal": styleRule(
      theme,
      "No raw font family, size, weight, line height or letter spacing",
      `Raw typography value ({{match}}). Use a font token${examples(theme.tokens.fontFamily) || examples(theme.tokens.fontSize)}`,
      (site, report) => {
        if (site.category === "fontFamily") {
          if (fontFamilies.size === 0) {
            return;
          }
          forEachClause(site, (clause, leaf) => {
            const family = clause.parts.join(" ");
            if (family && !fontFamilies.has(family)) {
              report(leaf.node, `${site.prop}="${clauseText(clause)}"`);
            }
          });
          return;
        }
        typographyLiteral(site, report);
      }
    ),

    "no-shadow-literal": styleRule(
      theme,
      "No hand-authored shadow in boxShadow / textShadow",
      `Hand-authored shadow ({{match}}). Use a shadow token${examples(theme.tokens.shadow)}`,
      (site, report) => {
        if (site.category !== "shadow") {
          return;
        }
        forEachClause(site, (clause, leaf) => {
          if (
            clause.parts.some(
              part => COLOR_LITERAL.test(part) || LENGTH_LITERAL.test(part)
            )
          ) {
            report(leaf.node, `${site.prop}="${clauseText(clause)}"`);
          }
        });
      }
    ),

    "no-dark-pairs": styleRule(
      theme,
      "No hand-authored dark:/light: color when themes already carry both schemes",
      "Hand-authored scheme color ({{match}}). The generated light and dark themes already swap theme values; write the single theme value",
      (site, report) => {
        if (site.category !== "color") {
          return;
        }
        forEachClause(site, (clause, leaf) => {
          if (
            clause.modifiers.some(
              modifier => modifier === "dark" || modifier === "light"
            )
          ) {
            report(leaf.node, `${site.prop}="${clauseText(clause)}"`);
          }
        });
      }
    ),

    "focus-visible": styleRule(
      theme,
      "Focus rings use focus-visible:, not focus:",
      "focus: ({{match}}) paints a ring for pointer users too. Use focus-visible:",
      (site, report) => {
        if (!/^(?:outline|border|boxShadow)/.test(site.property)) {
          return;
        }
        forEachClause(site, (clause, leaf) => {
          if (clause.modifiers.includes("focus")) {
            report(leaf.node, `${site.prop}="${clauseText(clause)}"`);
          }
        });
      }
    )
  };

  const tokenRule = (enabled: boolean, severity: GuardrailSeverity) =>
    enabled ? severity : "off";

  const defaultSeverity: Record<GuardrailRuleId, GuardrailSeverity> = {
    "no-legacy-token-prefix": "error",
    "no-legacy-condition-object": "error",
    "no-color-literal": tokenRule(hasTokens(theme, "color"), "error"),
    "no-stock-palette": tokenRule(hasTokens(theme, "color"), "warn"),
    "no-spacing-literal": tokenRule(hasTokens(theme, "space"), "warn"),
    "no-radius-literal": tokenRule(hasTokens(theme, "radius"), "error"),
    "no-typography-literal": tokenRule(
      hasTokens(theme, "fontFamily", ...typography),
      "warn"
    ),
    "no-shadow-literal": tokenRule(hasTokens(theme, "shadow"), "error"),
    "no-dark-pairs": tokenRule(hasDark && hasTokens(theme, "color"), "error"),
    "focus-visible": "warn"
  };

  const plugin: GuardrailPlugin = {
    meta: { name: theme.name, version: theme.version },
    rules
  };

  return {
    plugin,
    rules,
    defaultSeverity,
    config({
      files = ["src/**/*.{js,jsx,ts,tsx}"],
      ignores = [],
      severity = {},
      components,
      callees
    } = {}) {
      const ruleConfig: Record<string, GuardrailSeverity> = {};
      for (const id of Object.keys(rules) as GuardrailRuleId[]) {
        ruleConfig[`${theme.prefix}/${id}`] =
          severity[id] ?? defaultSeverity[id];
      }

      return {
        files,
        ignores,
        plugins: { [theme.prefix]: plugin },
        settings: {
          [SETTINGS_KEY]: {
            ...(components ? { components } : {}),
            callees: callees ?? DEFAULT_STYLED_CALLEES
          }
        },
        rules: ruleConfig
      };
    }
  };
}
