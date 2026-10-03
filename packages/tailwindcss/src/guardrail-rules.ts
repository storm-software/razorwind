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
 * Class patterns shared by the ESLint and Stylelint guardrail runtimes. Each
 * rule is a pattern matched against a class list (a JSX `className`, a `cn()`
 * call or an `@apply` prelude), with an allowlist read from the schema-derived
 * Tailwind theme.
 */

import type {
  GuardrailRuleId,
  GuardrailSeverity,
  GuardrailTheme
} from "./types";

/** A guardrail rule: a class-list pattern and the message it reports. */
export interface GuardrailPattern {
  description: string;
  pattern: RegExp;
  /** Message with a `{{match}}` placeholder for the offending class. */
  message: string;
  /** Return `false` to allow a match. */
  accept?: (match: RegExpMatchArray) => boolean;
}

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

/** The guardrail patterns for a schema-derived Tailwind theme. */
export function createGuardrailPatterns(
  theme: GuardrailTheme
): Record<GuardrailRuleId, GuardrailPattern> {
  const colors = new Set(theme.namespaces.color ?? []);

  return {
    "no-color-literal": {
      description: "No raw color value (hex, oklch, rgb, hsl, …) in a class",
      pattern: new RegExp(
        String.raw`${B}-?[\w-]*-\[(?:color:)?(?:#[0-9a-f]{3,8}|(?:oklch|oklab|rgba?|hsla?|lab|lch|hwb|color)\()[^\]]*\]`,
        "i"
      ),
      message: `Arbitrary color value in class ({{match}}). Use a color token utility${examples(theme, "color", "bg")}; a missing value is a token to add, not a literal to inline`
    },

    "no-stock-palette": {
      description:
        "No Tailwind default palette color that the design system does not define",
      pattern: new RegExp(
        String.raw`${B}(?:${COLOR_UTILITIES})-((?:${STOCK_HUES.join("|")})-(?:50|[1-9]00|950))(?![\w-])`
      ),
      message: `Tailwind stock palette color in class ({{match}}) is not a design token. Use a color token utility${examples(theme, "color", "bg")}`,
      accept: match => !colors.has(match[1]!)
    },

    "no-unknown-theme-var": {
      description:
        "Theme variables referenced in a class must exist in the design system",
      pattern: /(?<=var\(\s*|\(\s*)(--[\w-]+)/,
      message:
        "Theme variable {{match}} is not defined by the design system tokens. Use an existing token or add it to the schema",
      accept: match => {
        const parts = splitThemeVar(theme, match[1]!);
        return (
          parts !== undefined && !theme.namespaces[parts[0]]!.includes(parts[1])
        );
      }
    },

    "no-radius-literal": {
      description: "No arbitrary radius in a class",
      pattern: new RegExp(
        String.raw`${B}rounded(?:-[a-z]{1,2})?-${LITERAL}[^\]]*\]`
      ),
      message: `Arbitrary radius in class ({{match}}). Use a radius token${examples(theme, "radius", "rounded")}; a new radius becomes a token first`
    },

    "no-spacing-literal": {
      description: "No arbitrary spacing in a class",
      pattern: new RegExp(
        String.raw`${B}-?(?:${SPACING_UTILITIES})-${LITERAL}[^\]]*\]`
      ),
      message: `Arbitrary spacing in class ({{match}}). Use the spacing scale${examples(theme, "spacing", "p")}`
    },

    "no-typography-literal": {
      description:
        "No arbitrary font family, size, weight, leading or tracking in a class",
      pattern: new RegExp(
        String.raw`${B}(?:font|leading|tracking)-${LITERAL}[^\]]*\]|${B}text-\[(?:length:|clamp\(|min\(|max\(|calc\(|[\d.])[^\]]*\]`
      ),
      message: `Arbitrary typography value in class ({{match}}). Use a type token${examples(theme, "text", "text") || examples(theme, "font", "font")}`
    },

    "no-shadow-literal": {
      description: "No arbitrary shadow in a class",
      pattern: new RegExp(
        String.raw`${B}(?:inset-|drop-|text-)?shadow-${LITERAL}[^\]]*\]`
      ),
      message: `Arbitrary shadow in class ({{match}}). Use a shadow token${examples(theme, "shadow", "shadow")}`
    },

    "no-dark-pairs": {
      description:
        "No hand-authored dark: color when tokens already carry a dark theme",
      pattern: new RegExp(
        String.raw`${B}dark:(?:${COLOR_UTILITIES})-(\[[^\]]*\]|[\w-]+)`
      ),
      message:
        "Hand-authored dark color ({{match}}). The design tokens define both themes; write the single theme-aware class",
      accept: match =>
        match[1]!.startsWith("[") || colors.has(match[1]!.split("/")[0]!)
    },

    "focus-visible": {
      description: "Focus rings use focus-visible:, not focus:",
      pattern: new RegExp(String.raw`${B}focus:(?:ring|outline|border)`),
      message:
        "focus: ({{match}}) paints a ring for pointer users too. Use focus-visible:"
    }
  };
}

/**
 * Default severity of each guardrail: token rules are enabled when the schema
 * defines the namespace they check against.
 */
export function createGuardrailSeverity(
  theme: GuardrailTheme
): Record<GuardrailRuleId, GuardrailSeverity> {
  const hasDark = theme.themes.some(id => id.toLowerCase() === "dark");
  const tokenRule = (enabled: boolean, severity: GuardrailSeverity) =>
    enabled ? severity : "off";

  return {
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
}
