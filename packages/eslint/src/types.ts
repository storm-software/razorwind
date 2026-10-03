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

import type { TokenType } from "@power-plant/dtcg-schema";
import type {
  GuardrailRuleId as TailwindGuardrailRuleId,
  GuardrailSettings as TailwindGuardrailSettings,
  GuardrailTheme as TailwindGuardrailTheme
} from "@razorwind/tailwindcss/eslint-runtime";
import type {
  GuardrailRuleId as TamaguiGuardrailRuleId,
  GuardrailSettings as TamaguiGuardrailSettings,
  GuardrailTheme as TamaguiGuardrailTheme
} from "@razorwind/tamagui/eslint-runtime";

export type {
  TailwindGuardrailRuleId,
  TailwindGuardrailSettings,
  TailwindGuardrailTheme,
  TamaguiGuardrailRuleId,
  TamaguiGuardrailSettings,
  TamaguiGuardrailTheme
};

/**
 * Options for the Razorwind ESLint design-system plugin generator.
 */
export interface EslintPluginOptions {
  /**
   * Output path of the generated ESLint plugin module, written relative to
   * the execution cwd.
   *
   * @defaultValue "eslint/design-system/index.mjs"
   */
  eslintPath?: string;

  /**
   * Rule namespace used in `eslint.config.*`
   * (`<prefix>/ensure-design-token-usage`).
   *
   * @defaultValue "design-system"
   */
  prefix?: string;

  /**
   * Module the generated file imports `createDesignSystemPlugin` from.
   *
   * @defaultValue "\@razorwind/eslint/runtime"
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
   * Include the `\@razorwind/tailwindcss` class guardrails, exposed as
   * `<prefix>/tailwind-*` rules.
   *
   * @defaultValue true
   */
  tailwind?: boolean;

  /**
   * Include the `\@razorwind/tamagui` v3 flat-value guardrails, exposed as
   * `<prefix>/tamagui-*` rules. Pass an object to forward the app's Tamagui
   * shorthands or restrict the token types.
   *
   * @defaultValue false
   */
  tamagui?:
    | boolean
    | {
        shorthands?: Record<string, string>;
        includeTypes?: TokenType[];
      };

  /**
   * Override body for generated `INSTALL.md`. When omitted, ESLint flat-config
   * wiring steps are generated for the output file.
   */
  installGuide?: string;
}

/**
 * Design-token categories a style property resolves against. Derived from
 * the DTCG `$type` and the token path.
 */
export type TokenCategory =
  | "color"
  | "shadow"
  | "space"
  | "size"
  | "radius"
  | "borderWidth"
  | "fontFamily"
  | "fontSize"
  | "fontWeight"
  | "lineHeight"
  | "letterSpacing"
  | "typography"
  | "duration"
  | "easing"
  | "zIndex"
  | "opacity";

/**
 * The part a schema component plays, used to point raw HTML and hand-rolled
 * patterns at the design-system replacement.
 */
export type ComponentRole =
  | "button"
  | "icon-button"
  | "link"
  | "checkbox"
  | "code"
  | "heading"
  | "image"
  | "radio"
  | "range"
  | "select"
  | "text-input"
  | "textarea"
  | "text"
  | "visually-hidden"
  | "icon"
  | "primitive";

/** A design token as the lint rules see it. */
export interface ManifestToken {
  /** Dot-separated token path (`color.primary`). */
  path: string;
  /** DTCG `$type`, when known. */
  type?: string;
  /** Category style properties resolve this token against. */
  category?: TokenCategory;
  /** Generated CSS custom property (`--acme-color-primary`). */
  cssVar: string;
  /** Resolved CSS value in the primary theme, used to suggest replacements. */
  value?: string;
  /** True when the token aliases another token (a semantic token). */
  alias?: boolean;
  /** DTCG `$deprecated`: `true` or the deprecation note. */
  deprecated?: true | string;
  /** Replacement token path, read from a `{path}` reference in `$deprecated`. */
  replacement?: string;
}

/** A schema component as the lint rules see it. */
export interface ManifestComponent {
  /** Schema component name (`icon-button`). */
  name: string;
  /** JSX names the component is rendered as (`IconButton`). */
  jsx: string[];
  /** Roles inferred from the component name and title. */
  roles: ComponentRole[];
  /** True when the component is tagged `deprecated`. */
  deprecated?: boolean;
  /** JSX names of the related components suggested as replacements. */
  replacements?: string[];
}

/** A schema font family. */
export interface ManifestFont {
  /** CSS `font-family` name. */
  family: string;
  /** Font role (`sans`, `mono`, …). */
  role?: string;
}

/**
 * Schema-derived design-system manifest serialized into the generated ESLint
 * module.
 */
export interface DesignSystemManifest {
  /** Plugin `meta.name`. */
  name: string;
  /** Plugin `meta.version`. */
  version: string;
  /** Rule namespace used in flat config. */
  prefix: string;
  /** CSS custom-property prefix, when tokens are emitted with one. */
  cssVarPrefix?: string;
  /** Theme ids present in the schema (`light`, `dark`). */
  themes: string[];
  tokens: ManifestToken[];
  components: ManifestComponent[];
  /** JSX names of the schema icons (`ArrowRightIcon`). */
  icons: string[];
  fonts: ManifestFont[];
  /** `\@razorwind/tailwindcss` guardrail theme, when enabled. */
  tailwind?: TailwindGuardrailTheme;
  /** `\@razorwind/tamagui` guardrail theme, when enabled. */
  tamagui?: TamaguiGuardrailTheme;
}

/** Raw HTML elements with a design-system replacement rule. */
export type HtmlElementRuleId =
  | "no-html-anchor"
  | "no-html-button"
  | "no-html-checkbox"
  | "no-html-code"
  | "no-html-heading"
  | "no-html-image"
  | "no-html-radio"
  | "no-html-range"
  | "no-html-select"
  | "no-html-text-input"
  | "no-html-textarea";

/** Rule ids ported from `\@atlaskit/eslint-plugin-design-system`. */
export type CoreRuleId =
  | "ensure-design-token-usage"
  | "no-unsafe-design-token-usage"
  | "no-deprecated-design-token-usage"
  | "use-tokens-space"
  | "use-tokens-shape"
  | "use-tokens-typography"
  | "use-tokens-motion"
  | "expand-motion-shorthand"
  | "no-margin"
  | "no-physical-properties"
  | "no-nested-styles"
  | "no-exported-css"
  | "no-exported-keyframes"
  | "no-empty-styled-expression"
  | "no-css-tagged-template-expression"
  | "no-styled-tagged-template-expression"
  | "no-keyframes-tagged-template-expression"
  | "no-banned-imports"
  | "no-deprecated-imports"
  | "no-unsafe-style-overrides"
  | "prefer-primitives"
  | "use-primitives-text"
  | "use-visually-hidden"
  | "icon-label"
  | "no-empty-icon-button-label"
  | "no-placeholder"
  | "no-readonly-or-disabled-inputs"
  | HtmlElementRuleId;

export type TailwindRuleId = `tailwind-${TailwindGuardrailRuleId}`;
export type TamaguiRuleId = `tamagui-${TamaguiGuardrailRuleId}`;

/** Every rule id the generated plugin can expose. */
export type DesignSystemRuleId = CoreRuleId | TailwindRuleId | TamaguiRuleId;

export type DesignSystemSeverity = "error" | "warn" | "off";

/** How suggestions reference a token. */
export type TokenReferenceStyle = "css-var" | "function";

/** Shared ESLint `settings["razorwind-design-system"]` read by the core rules. */
export interface DesignSystemSettings {
  /**
   * Functions that resolve a token path (`token("color.primary")`).
   *
   * @defaultValue ["token"]
   */
  tokenFunctions?: string[];
  /**
   * How suggested fixes reference a token: `var(--acme-color-primary)` or
   * `token("color.primary")` (the first of {@link tokenFunctions}).
   *
   * @defaultValue "css-var"
   */
  tokenReference?: TokenReferenceStyle;
  /**
   * CSS-in-JS calls whose object or template arguments are styles.
   * `styled.*` factories and `StyleSheet.create` are always read.
   *
   * @defaultValue ["css", "cssMap", "xcss", "keyframes", "injectGlobal", "createGlobalStyle"]
   */
  styleCallees?: string[];
  /**
   * JSX attributes holding style objects.
   *
   * @defaultValue ["style", "css", "xcss", "sx"]
   */
  styleAttributes?: string[];
  /**
   * Props on design-system components reported by `no-unsafe-style-overrides`.
   *
   * @defaultValue ["style", "css", "xcss", "sx", "UNSAFE_style", "UNSAFE_className"]
   */
  unsafeStyleProps?: string[];
  /**
   * Module specifiers (or prefixes ending in `/`) the design-system
   * components are imported from. When set, component rules only apply to
   * JSX names imported from these modules.
   */
  componentModules?: string[];
  /**
   * Modules reported by `no-banned-imports`, mapped to the reason (or the
   * replacement to use instead).
   */
  bannedImports?: Record<string, string>;
}

/** Options for the generated flat-config factory. */
export interface DesignSystemOptions extends DesignSystemSettings {
  /** Glob(s) the rules apply to. */
  files?: string[];
  /** Glob(s) exempt from every rule. */
  ignores?: string[];
  /** Per-rule overrides of the schema-derived default severities. */
  severity?: Partial<Record<DesignSystemRuleId, DesignSystemSeverity>>;
  /** Class sources read by the `tailwind-*` rules. */
  tailwind?: TailwindGuardrailSettings;
  /** Style sources read by the `tamagui-*` rules. */
  tamagui?: TamaguiGuardrailSettings;
}
