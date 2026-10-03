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

import type {
  ComponentRole,
  ManifestComponent,
  ManifestFont,
  ManifestToken,
  TokenCategory
} from "@razorwind/eslint";
import type {
  GuardrailRuleId as TailwindGuardrailRuleId,
  GuardrailTheme as TailwindGuardrailTheme
} from "@razorwind/tailwindcss/stylelint-runtime";

export type {
  ComponentRole,
  ManifestComponent,
  ManifestFont,
  ManifestToken,
  TailwindGuardrailRuleId,
  TailwindGuardrailTheme,
  TokenCategory
};

/**
 * Options for the Razorwind Stylelint design-system plugin generator.
 */
export interface StylelintPluginOptions {
  /**
   * Output path of the generated Stylelint plugin module, written relative
   * to the execution cwd.
   *
   * @defaultValue "stylelint/design-system/index.mjs"
   */
  stylelintPath?: string;

  /**
   * Rule namespace used in `stylelint.config.*`
   * (`<prefix>/ensure-design-token-usage`).
   *
   * @defaultValue "design-system"
   */
  prefix?: string;

  /**
   * Module the generated file imports `createDesignSystemPlugin` from.
   *
   * @defaultValue "\@razorwind/stylelint/runtime"
   */
  runtimeImport?: string;

  /**
   * Prefix of the CSS custom properties generated for the design tokens
   * (`--<prefix>-color-primary`). Set to `false` when tokens are emitted
   * without a prefix.
   *
   * @defaultValue initials derived from the schema name, matching `\@razorwind/css`
   */
  cssVarPrefix?: string | false;

  /**
   * Include the `\@razorwind/tailwindcss` guardrails, exposed as
   * `<prefix>/tailwind-*` rules that read `\@apply` preludes and theme
   * variable references.
   *
   * @defaultValue true
   */
  tailwind?: boolean;

  /**
   * Override body for generated `INSTALL.md`. When omitted, Stylelint config
   * wiring steps are generated for the output file.
   */
  installGuide?: string;
}

/**
 * Schema-derived design-system manifest serialized into the generated
 * Stylelint module.
 */
export interface DesignSystemManifest {
  /** Plugin name. */
  name: string;
  /** Plugin version. */
  version: string;
  /** Rule namespace used in `stylelint.config.*`. */
  prefix: string;
  /** CSS custom-property prefix, when tokens are emitted with one. */
  cssVarPrefix?: string;
  /** Theme ids present in the schema (`light`, `dark`). */
  themes: string[];
  tokens: ManifestToken[];
  /** Schema components, named in messages that point at a replacement. */
  components: ManifestComponent[];
  fonts: ManifestFont[];
  /** `\@razorwind/tailwindcss` guardrail theme, when enabled. */
  tailwind?: TailwindGuardrailTheme;
}

/**
 * Rule ids ported from `\@atlaskit/stylelint-design-system`, plus the
 * `\@razorwind/eslint` rules that apply to stylesheets.
 */
export type CoreRuleId =
  | "ensure-design-token-usage"
  | "no-unsafe-design-token-usage"
  | "no-deprecated-design-token-usage"
  | "use-tokens-space"
  | "use-tokens-shape"
  | "use-tokens-typography"
  | "use-tokens-motion"
  | "expand-motion-shorthand"
  | "no-physical-properties"
  | "no-margin"
  | "use-visually-hidden";

export type TailwindRuleId = `tailwind-${TailwindGuardrailRuleId}`;

/** Every rule id the generated plugin can expose. */
export type DesignSystemRuleId = CoreRuleId | TailwindRuleId;

export type DesignSystemSeverity = "error" | "warn" | "off";

/**
 * Value domains `ensure-design-token-usage` checks: the primary option of
 * `\@atlaskit/stylelint-design-system`'s rule.
 */
export interface TokenUsageDomains {
  /**
   * Hard-coded colors and shadows.
   *
   * @defaultValue true
   */
  color?: boolean;
  /**
   * Hard-coded lengths in spacing properties (`padding`, `gap`, …).
   *
   * @defaultValue false
   */
  spacing?: boolean;
  /**
   * Hard-coded font sizes, weights, families, line heights and letter
   * spacing.
   *
   * @defaultValue false
   */
  typography?: boolean;
  /**
   * Custom properties outside the design system (`var(--sidebar-width)`).
   *
   * @defaultValue false
   */
  nonTokenCssVariables?: boolean;
}

/**
 * How `no-unsafe-design-token-usage` treats `var(--token, fallback)`
 * fallbacks: required (`forced`), allowed (`optional`) or disallowed (`none`).
 */
export type FallbackUsage = "forced" | "optional" | "none";

/** Options for the generated Stylelint config factory. */
export interface DesignSystemOptions {
  /** Glob(s) the rules apply to; the rules move into an `overrides` entry. */
  files?: string[];
  /** Glob(s) exempt from every rule. */
  ignoreFiles?: string[];
  /** Per-rule overrides of the schema-derived default severities. */
  severity?: Partial<Record<DesignSystemRuleId, DesignSystemSeverity>>;
  /** Domains `ensure-design-token-usage` checks. */
  tokenUsage?: TokenUsageDomains;
  /**
   * Fallback strategy of `no-unsafe-design-token-usage`.
   *
   * @defaultValue "optional"
   */
  fallbackUsage?: FallbackUsage;
}
