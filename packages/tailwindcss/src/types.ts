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

/**
 * Options for the Razorwind Tailwind CSS extract plugin.
 */
export interface TailwindExtractPluginOptions {
  /**
   * Optional CSS entry override used for extraction (registry `tailwind.css`
   * / explicit path to read). When omitted, the detected workspace CSS entry
   * is used.
   */
  cssPath?: string | null;

  /**
   * When true, skip entries that carry only the DEFAULT theme option bit
   * during extraction.
   *
   * @defaultValue false
   */
  omitDefaults?: boolean;
}

/**
 * Options for the Razorwind Tailwind CSS generate plugin.
 */
export interface TailwindGeneratePluginOptions {
  /**
   * Prefix applied by Tailwind to compiled utility classes and CSS variables.
   * The generated `@theme` declarations remain unprefixed as required by
   * Tailwind CSS v4.
   *
   * @example "storm" produces compiled variables such as `--storm-color-accent`
   */
  prefix?: string;

  /**
   * Output path written relative to the execution cwd. When omitted, the
   * detected workspace CSS entry is used (falling back to `src/app.css`).
   */
  cssPath?: string | null;

  /**
   * When generating CSS, include `@import "tailwindcss";` at the top of the file.
   *
   * @defaultValue true
   */
  includeImport?: boolean;

  /**
   * Override body for generated `INSTALL.md`. When omitted, Tailwind CSS
   * wiring steps are generated for the output file.
   */
  installGuide?: string;
}

/**
 * A flattened design token ready for Tailwind `@theme` emission.
 */
export interface FlatThemeToken {
  /** Dot-separated token path (e.g. `color.primary`). */
  path: string;
  /** DTCG `$type`, when known. */
  type?: string;
  /** Raw `$value` from the token document. */
  value: unknown;
  /** CSS-friendly string form of {@link value}. */
  cssValue: string;
  /** Tailwind theme custom property (e.g. `--color-primary`). */
  cssVar: string;
  /** Optional theme id when tokens are multi-theme (`light` / `dark`). */
  theme?: string;
}

/**
 * Options for the Razorwind Tailwind CSS ESLint guardrails generate plugin.
 */
export interface TailwindEslintPluginOptions {
  /**
   * Output path of the generated ESLint plugin module, written relative to
   * the execution cwd.
   *
   * @defaultValue "eslint/razorwind-guardrails.mjs"
   */
  eslintPath?: string;

  /**
   * Rule namespace used in `eslint.config.*` (`<prefix>/no-color-literal`).
   *
   * @defaultValue "design-system"
   */
  prefix?: string;

  /**
   * Module the generated file imports `createGuardrails` from.
   *
   * @defaultValue "@razorwind/tailwindcss/eslint-runtime"
   */
  runtimeImport?: string;

  /**
   * Override body for generated `INSTALL.md`. When omitted, ESLint flat-config
   * wiring steps are generated for the output file.
   */
  installGuide?: string;
}

/** ESLint rule ids emitted by the guardrails generator. */
export type GuardrailRuleId =
  | "no-color-literal"
  | "no-stock-palette"
  | "no-unknown-theme-var"
  | "no-radius-literal"
  | "no-spacing-literal"
  | "no-typography-literal"
  | "no-shadow-literal"
  | "no-dark-pairs"
  | "focus-visible";

export type GuardrailSeverity = "error" | "warn" | "off";

/**
 * Schema-derived Tailwind theme serialized into the generated ESLint module.
 */
export interface GuardrailTheme {
  /** Plugin `meta.name`. */
  name: string;
  /** Plugin `meta.version`. */
  version: string;
  /** Rule namespace used in flat config. */
  prefix: string;
  /** Theme ids present in the schema (e.g. `light`, `dark`). */
  themes: string[];
  /**
   * Tailwind v4 theme namespace → defined names, e.g.
   * `{ color: ["primary", "neutral-800"], radius: ["", "lg"] }`. An empty
   * name is the namespace's `DEFAULT` (`--radius`).
   */
  namespaces: Record<string, string[]>;
}

/** Shared ESLint `settings.razorwind` read by every guardrail rule. */
export interface GuardrailSettings {
  /** JSX attributes holding class lists. */
  attributes?: string[];
  /** Helper calls / template tags holding class lists (`cn`, `cva`, …). */
  callees?: string[];
}

/** Options for the generated flat-config factory. */
export interface GuardrailOptions extends GuardrailSettings {
  /** Glob(s) the rules apply to. */
  files?: string[];
  /** Glob(s) exempt from every rule (renderers that cannot use CSS vars). */
  ignores?: string[];
  /** Per-rule overrides of the schema-derived default severities. */
  severity?: Partial<Record<GuardrailRuleId, GuardrailSeverity>>;
}

/**
 * Options for the Razorwind Tailwind CSS Stylelint guardrails generate plugin.
 */
export interface TailwindStylelintPluginOptions {
  /**
   * Output path of the generated Stylelint plugin module, written relative
   * to the execution cwd.
   *
   * @defaultValue "stylelint/razorwind-guardrails.mjs"
   */
  stylelintPath?: string;

  /**
   * Rule namespace used in `stylelint.config.*` (`<prefix>/no-color-literal`).
   *
   * @defaultValue "design-system"
   */
  prefix?: string;

  /**
   * Module the generated file imports `createGuardrails` from.
   *
   * @defaultValue "@razorwind/tailwindcss/stylelint-runtime"
   */
  runtimeImport?: string;

  /**
   * Override body for generated `INSTALL.md`. When omitted, Stylelint config
   * wiring steps are generated for the output file.
   */
  installGuide?: string;
}

/** Options for the generated Stylelint config factory. */
export interface StylelintGuardrailOptions {
  /** Glob(s) the rules apply to; the rules move into an `overrides` entry. */
  files?: string[];
  /** Glob(s) exempt from every rule. */
  ignoreFiles?: string[];
  /** Per-rule overrides of the schema-derived default severities. */
  severity?: Partial<Record<GuardrailRuleId, GuardrailSeverity>>;
}
