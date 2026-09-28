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
 * Runtime for the ESLint guardrails emitted by `@razorwind/tailwindcss/eslint`.
 *
 * The generated module serializes a {@link GuardrailTheme} (the Tailwind v4
 * `@theme` namespaces derived from the Razorwind schema) and passes it to
 * {@link createGuardrails}. Every rule reads its allowlist from that theme, so
 * the lint surface tracks the tokens the Tailwind CSS generator emits.
 *
 * No dependency on eslint's types: the rule shapes below are the subset the
 * plugin needs, typed locally so this entry stays dependency-free.
 */

import type {
  GuardrailOptions,
  GuardrailRuleId,
  GuardrailSettings,
  GuardrailSeverity,
  GuardrailTheme
} from "./types";

export type {
  GuardrailOptions,
  GuardrailRuleId,
  GuardrailSettings,
  GuardrailSeverity,
  GuardrailTheme
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

/** Settings key the plugin reads class sources from. */
export const SETTINGS_KEY = "razorwind";

export const DEFAULT_CLASS_ATTRIBUTES = ["className", "class"];

export const DEFAULT_CLASS_CALLEES = [
  "cn",
  "clsx",
  "cx",
  "cva",
  "classNames",
  "twMerge",
  "twJoin",
  "tw"
];

/** Tailwind's default palette hues; `mauve`…`taupe` ship with v4.2. */
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
  "stone",
  "mauve",
  "olive",
  "mist",
  "taupe"
];

const COLOR_UTILITIES =
  "bg|text|border(?:-[xytrblse])?|ring(?:-offset)?|inset-ring|outline|decoration|divide|accent|caret|placeholder|fill|stroke|(?:inset-|drop-|text-)?shadow|from|via|to";

const SPACING_UTILITIES =
  "p[xytrblse]?|m[xytrblse]?|gap(?:-[xy])?|space-[xy]|inset(?:-[xy])?|top|right|bottom|left|start|end|scroll-[mp][xytrblse]?";

/** Class-token boundary: start, whitespace, quote, variant `:` or `!`. */
const B = String.raw`(?:^|[\s"'\x60:!])`;

/** Arbitrary value that is not a `var(--…)` / `--…` reference. */
const LITERAL = String.raw`\[(?!var\(|--)`;

const FALLBACK_EXAMPLES = 4;

function examples(
  theme: GuardrailTheme,
  namespace: string,
  prefix: string
): string {
  const names = theme.namespaces[namespace] ?? [];
  if (names.length === 0) {
    return "";
  }

  const shown = names
    .slice(0, FALLBACK_EXAMPLES)
    .map(name => (name ? `${prefix}-${name}` : prefix));

  return ` (e.g. ${shown.join(", ")}${names.length > shown.length ? ", …" : ""})`;
}

function hasNamespace(theme: GuardrailTheme, ...namespaces: string[]): boolean {
  return namespaces.some(ns => (theme.namespaces[ns]?.length ?? 0) > 0);
}

// ─── class source discovery ─────────────────────────────────────────────────

const SKIP_KEYS = new Set(["parent", "loc", "range", "tokens", "comments"]);

function walk(node: Node, visit: (n: Node) => void): void {
  visit(node);
  for (const key of Object.keys(node)) {
    if (SKIP_KEYS.has(key)) {
      continue;
    }
    const value = node[key];
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item && typeof item === "object" && "type" in item) {
          walk(item as Node, visit);
        }
      }
    } else if (value && typeof value === "object" && "type" in value) {
      walk(value as Node, visit);
    }
  }
}

interface ClassChunk {
  node: Node;
  text: string;
}

/** Every string chunk under `root`: literals and template quasis. */
function classChunks(root: Node): ClassChunk[] {
  const out: ClassChunk[] = [];
  walk(root, n => {
    if (n.type === "Literal" && typeof n.value === "string") {
      out.push({ node: n, text: n.value });
    } else if (n.type === "TemplateElement") {
      const cooked = (n.value as { cooked?: string } | undefined)?.cooked;
      if (typeof cooked === "string") {
        out.push({ node: n, text: cooked });
      }
    }
  });

  return out;
}

function readSettings(context: RuleContext): Required<GuardrailSettings> {
  const settings = (context.settings?.[SETTINGS_KEY] ??
    {}) as GuardrailSettings;

  return {
    attributes: settings.attributes ?? DEFAULT_CLASS_ATTRIBUTES,
    callees: settings.callees ?? DEFAULT_CLASS_CALLEES
  };
}

function calleeName(node: Node): string | undefined {
  const target = (
    node.type === "TaggedTemplateExpression" ? node.tag : node.callee
  ) as Node | undefined;
  if (!target) {
    return undefined;
  }
  if (target.type === "Identifier") {
    return target.name as string;
  }
  if (target.type === "MemberExpression") {
    const property = target.property as Node | undefined;
    if (property?.type === "Identifier") {
      return property.name as string;
    }
  }

  return undefined;
}

/**
 * Visitor factory: calls `check` once per class source (class attribute or
 * helper call), skipping helper calls nested inside another class source so
 * nothing is reported twice.
 */
function classSources(
  context: RuleContext,
  check: (source: Node) => void
): Record<string, (node: Node) => void> {
  const { attributes, callees } = readSettings(context);
  const attributeSet = new Set(attributes);
  const calleeSet = new Set(callees);

  const isClassAttribute = (node: Node) => {
    const name = node.name as { name?: unknown } | undefined;
    return (
      node.type === "JSXAttribute" &&
      typeof name?.name === "string" &&
      attributeSet.has(name.name)
    );
  };
  const isClassCall = (node: Node) => {
    if (
      node.type !== "CallExpression" &&
      node.type !== "TaggedTemplateExpression"
    ) {
      return false;
    }
    const name = calleeName(node);
    return name !== undefined && calleeSet.has(name);
  };
  const insideSource = (node: Node) => {
    for (let cur = node.parent; cur; cur = cur.parent) {
      if (isClassAttribute(cur) || isClassCall(cur)) {
        return true;
      }
    }
    return false;
  };
  const onCall = (node: Node) => {
    if (isClassCall(node) && !insideSource(node)) {
      check(node);
    }
  };

  return {
    JSXAttribute(node) {
      if (isClassAttribute(node)) {
        check(node);
      }
    },
    CallExpression: onCall,
    TaggedTemplateExpression: onCall
  };
}

// ─── rule builders ──────────────────────────────────────────────────────────

/**
 * A rule that reports every class chunk match of `pattern`, optionally
 * filtered by `accept` (return `false` to allow the match).
 */
function classPatternRule(
  description: string,
  pattern: RegExp,
  message: string,
  accept?: (match: RegExpMatchArray) => boolean
): GuardrailRuleModule {
  const global = new RegExp(
    pattern.source,
    pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`
  );

  return {
    meta: {
      type: "problem",
      docs: { description },
      messages: { violation: message },
      schema: []
    },
    create(context) {
      return classSources(context, source => {
        for (const chunk of classChunks(source)) {
          for (const match of chunk.text.matchAll(global)) {
            if (accept && !accept(match)) {
              continue;
            }
            context.report({
              node: chunk.node,
              messageId: "violation",
              data: { match: match[0].trim() }
            });
          }
        }
      });
    }
  };
}

/** Tailwind v4 `--namespace-name` → `[namespace, name]`, longest namespace first. */
function splitThemeVar(
  theme: GuardrailTheme,
  cssVar: string
): [string, string] | undefined {
  const bare = cssVar.replace(/^--/, "");
  const namespaces = Object.keys(theme.namespaces).sort(
    (a, b) => b.length - a.length
  );
  for (const ns of namespaces) {
    if (bare === ns) {
      return [ns, ""];
    }
    if (bare.startsWith(`${ns}-`)) {
      return [ns, bare.slice(ns.length + 1)];
    }
  }

  return undefined;
}

/**
 * Build the guardrail rules, default severities and flat-config factory for a
 * schema-derived Tailwind theme.
 */
export function createGuardrails(theme: GuardrailTheme): Guardrails {
  const colors = new Set(theme.namespaces.color ?? []);
  const hasDark = theme.themes.some(id => id.toLowerCase() === "dark");

  const rules: Record<GuardrailRuleId, GuardrailRuleModule> = {
    "no-color-literal": classPatternRule(
      "No raw color value (hex, oklch, rgb, hsl, …) in a class",
      new RegExp(
        String.raw`${B}-?[\w-]*-\[(?:color:)?(?:#[0-9a-f]{3,8}|(?:oklch|oklab|rgba?|hsla?|lab|lch|hwb|color)\()[^\]]*\]`,
        "i"
      ),
      `Arbitrary color value in class ({{match}}). Use a color token utility${examples(theme, "color", "bg")}; a missing value is a token to add, not a literal to inline`
    ),

    "no-stock-palette": classPatternRule(
      "No Tailwind default palette color that the design system does not define",
      new RegExp(
        String.raw`${B}(?:${COLOR_UTILITIES})-((?:${STOCK_HUES.join("|")})-(?:50|[1-9]00|950))(?![\w-])`
      ),
      `Tailwind stock palette color in class ({{match}}) is not a design token. Use a color token utility${examples(theme, "color", "bg")}`,
      match => !colors.has(match[1]!)
    ),

    "no-unknown-theme-var": classPatternRule(
      "Theme variables referenced in a class must exist in the design system",
      /(?<=var\(\s*|\(\s*)(--[\w-]+)/,
      "Theme variable {{match}} is not defined by the design system tokens. Use an existing token or add it to the schema",
      match => {
        const parts = splitThemeVar(theme, match[1]!);
        return (
          parts !== undefined && !theme.namespaces[parts[0]]!.includes(parts[1])
        );
      }
    ),

    "no-radius-literal": classPatternRule(
      "No arbitrary radius in a class",
      new RegExp(String.raw`${B}rounded(?:-[a-z]{1,2})?-${LITERAL}[^\]]*\]`),
      `Arbitrary radius in class ({{match}}). Use a radius token${examples(theme, "radius", "rounded")}; a new radius becomes a token first`
    ),

    "no-spacing-literal": classPatternRule(
      "No arbitrary spacing in a class",
      new RegExp(String.raw`${B}-?(?:${SPACING_UTILITIES})-${LITERAL}[^\]]*\]`),
      `Arbitrary spacing in class ({{match}}). Use the spacing scale${examples(theme, "spacing", "p")}`
    ),

    "no-typography-literal": classPatternRule(
      "No arbitrary font family, size, weight, leading or tracking in a class",
      new RegExp(
        String.raw`${B}(?:font|leading|tracking)-${LITERAL}[^\]]*\]|${B}text-\[(?:length:|clamp\(|min\(|max\(|calc\(|[\d.])[^\]]*\]`
      ),
      `Arbitrary typography value in class ({{match}}). Use a type token${examples(theme, "text", "text") || examples(theme, "font", "font")}`
    ),

    "no-shadow-literal": classPatternRule(
      "No arbitrary shadow in a class",
      new RegExp(
        String.raw`${B}(?:inset-|drop-|text-)?shadow-${LITERAL}[^\]]*\]`
      ),
      `Arbitrary shadow in class ({{match}}). Use a shadow token${examples(theme, "shadow", "shadow")}`
    ),

    "no-dark-pairs": classPatternRule(
      "No hand-authored dark: color when tokens already carry a dark theme",
      new RegExp(
        String.raw`${B}dark:(?:${COLOR_UTILITIES})-(\[[^\]]*\]|[\w-]+)`
      ),
      "Hand-authored dark color ({{match}}). The design tokens define both themes; write the single theme-aware class",
      match => match[1]!.startsWith("[") || colors.has(match[1]!.split("/")[0]!)
    ),

    "focus-visible": classPatternRule(
      "Focus rings use focus-visible:, not focus:",
      new RegExp(String.raw`${B}focus:(?:ring|outline|border)`),
      "focus: ({{match}}) paints a ring for pointer users too. Use focus-visible:"
    )
  };

  const tokenRule = (enabled: boolean, severity: GuardrailSeverity) =>
    enabled ? severity : "off";

  const defaultSeverity: Record<GuardrailRuleId, GuardrailSeverity> = {
    "no-color-literal": tokenRule(hasNamespace(theme, "color"), "error"),
    "no-stock-palette": tokenRule(hasNamespace(theme, "color"), "warn"),
    "no-unknown-theme-var": tokenRule(
      Object.keys(theme.namespaces).length > 0,
      "error"
    ),
    "no-radius-literal": tokenRule(hasNamespace(theme, "radius"), "error"),
    "no-spacing-literal": tokenRule(hasNamespace(theme, "spacing"), "warn"),
    "no-typography-literal": tokenRule(
      hasNamespace(theme, "text", "font", "font-weight", "leading", "tracking"),
      "warn"
    ),
    "no-shadow-literal": tokenRule(
      hasNamespace(
        theme,
        "shadow",
        "inset-shadow",
        "drop-shadow",
        "text-shadow"
      ),
      "error"
    ),
    "no-dark-pairs": tokenRule(
      hasDark && hasNamespace(theme, "color"),
      "error"
    ),
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
      attributes,
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
            attributes: attributes ?? DEFAULT_CLASS_ATTRIBUTES,
            callees: callees ?? DEFAULT_CLASS_CALLEES
          }
        },
        rules: ruleConfig
      };
    }
  };
}
