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
import type { CreateTamaguiProps } from "tamagui";

/**
 * Animation driver entry imported from `@tamagui/config/v5-*`.
 *
 * @see https://tamagui.dev/docs/core/config-v5
 */
export type TamaguiAnimationDriver =
  "css" | "rn" | "reanimated" | "motion" | false;

/** Tamagui major-version syntax emitted by the generated config and guide. */
export type TamaguiTarget = "v2" | "v3";

/**
 * Tamagui `createTokens` category keys we emit from DTCG tokens.
 *
 * `color` is palettes / primitives only. Semantic theme / `$theme` colors
 * (including computed state siblings) go to `createThemes` extras.
 */
export type TamaguiTokenCategory =
  | "color"
  | "space"
  | "size"
  | "radius"
  | "zIndex"
  | "blur"
  | "fontSize"
  | "shadow"
  | "insetShadow"
  | "dropShadow"
  | "textShadow"
  | "fontWeight"
  | "boxShadow";

/**
 * Options for the Razorwind Tamagui config generator.
 */
export interface TamaguiPluginOptions {
  /**
   * Tamagui major-version syntax to target in generated output.
   *
   * V3 output enables flat-value settings, augments the `tamagui` module,
   * and documents bare token names. V2 remains the default to preserve
   * existing generated output.
   *
   * @defaultValue `"v2"`
   */
  target?: TamaguiTarget;

  /**
   * Output path written relative to the execution cwd.
   *
   * Light and dark schemes are always written to this single file — Tamagui
   * `createThemes` encodes both as `light` / `dark` plus nested children.
   *
   * @defaultValue `"tamagui.config.ts"`
   */
  outputPath?: string;

  /**
   * Animation driver import from `@tamagui/config/v5-*`.
   * Set to `false` to omit animations (v5 base config includes none).
   *
   * @defaultValue `"css"`
   */
  animations?: TamaguiAnimationDriver;

  /**
   * Shorthands to include in the generated config.
   *
   * @defaultValue `{}`
   */
  shorthands?: Record<string, string | number>;

  /**
   * Media queries to include in the generated config.
   *
   * @defaultValue `{}`
   */
  media?: CreateTamaguiProps["media"];

  /**
   * Default font family to include in the generated config.
   */
  defaultFont?: string;

  /**
   * A module to import config from to include in the generated config.
   */
  importConfig?: string;

  /**
   * When true, spread `defaultConfig` from `@tamagui/config/v5` and merge
   * generated tokens/themes on top. When false, emit a minimal config from
   * Razorwind tokens only.
   *
   * @defaultValue `false`
   */
  useDefaultConfig?: boolean;

  /**
   * Restrict generated token rows to these DTCG `$type` values.
   * When omitted, all supported types are included.
   */
  includeTypes?: TokenType[];

  /**
   * Include a TypeScript module augmentation so `$` token autocomplete
   * picks up generated tokens.
   *
   * @defaultValue `true`
   */
  includeTypeAugmentation?: boolean;

  /**
   * Override body for generated `INSTALL.md`. When omitted, Tamagui wiring
   * steps are generated for the output config file.
   */
  installGuide?: string;
}

/**
 * A flattened design token ready for Tamagui config emission.
 */
export interface FlatToken {
  /** Dot-separated token path (e.g. `color.primary`). */
  path: string;
  /** DTCG `$type`, when known. */
  type?: TokenType | string;
  /** Raw `$value` from the token document. */
  value: unknown;
  /** CSS-friendly string form of {@link value}. */
  cssValue: string;
  /** Value suitable for Tamagui `createTokens` (number or string). */
  tamaguiValue: string | number;
  /** Mapped Tamagui token category, when known. */
  category?: TamaguiTokenCategory;
  /** Leaf key used inside the Tamagui token category object. */
  tokenKey?: string;
  /** Optional DTCG `$description`. */
  description?: string;
  /** Theme / set id when tokens are a `Record<string, Tokens>`. */
  theme?: string;
  /**
   * Semantic children theme from the token's `theme` / `$theme` property
   * (`danger`, `accent`, …). Distinct from {@link theme} (token-set id).
   */
  childTheme?: string;
  /**
   * True when an ancestor group is marked as a primitive (`primitive: true` or `$type: "primitive"` or `$type: "palette"`). Those scales feed `createTokens({ color })` and `createThemes` palettes. Semantic colors (theme / `$theme`, including computed state siblings) are not primitives and go to extras only.
   */
  primitive?: boolean;
}

/**
 * Options for the Razorwind Tamagui ESLint guardrails generate plugin.
 *
 * The guardrails target Tamagui v3 flat values, so nothing is emitted unless
 * {@link TamaguiEslintPluginOptions.target} is `"v3"`.
 */
export interface TamaguiEslintPluginOptions extends Pick<
  TamaguiPluginOptions,
  "includeTypes"
> {
  /**
   * Tamagui major-version syntax the app is written in. Only `"v3"` emits the
   * guardrails plugin; V2 `$token` / condition-object syntax is not linted.
   *
   * @defaultValue `"v2"`
   */
  target?: TamaguiTarget;

  /**
   * Output path of the generated ESLint plugin module, written relative to
   * the execution cwd.
   *
   * @defaultValue "eslint/tamagui/razorwind-guardrails.mjs"
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
   * @defaultValue "@razorwind/tamagui/eslint-runtime"
   */
  runtimeImport?: string;

  /**
   * Shorthands configured on the app's Tamagui config, merged over the
   * `@tamagui/shorthands/v5` defaults so `bg` / `p` / `rounded` resolve to
   * their style property.
   */
  shorthands?: Record<string, string>;

  /**
   * Override body for generated `INSTALL.md`. When omitted, ESLint flat-config
   * wiring steps are generated for the output file.
   */
  installGuide?: string;
}

/** ESLint rule ids emitted by the Tamagui guardrails generator. */
export type GuardrailRuleId =
  | "no-legacy-token-prefix"
  | "no-legacy-condition-object"
  | "no-color-literal"
  | "no-stock-palette"
  | "no-spacing-literal"
  | "no-radius-literal"
  | "no-typography-literal"
  | "no-shadow-literal"
  | "no-dark-pairs"
  | "focus-visible";

export type GuardrailSeverity = "error" | "warn" | "off";

/**
 * Tamagui v3 token categories a style property resolves bare names against,
 * plus `shadow` for the generated shadow token buckets.
 *
 * @see https://tamagui.dev/docs/core/tokens
 */
export type GuardrailTokenCategory =
  | "color"
  | "space"
  | "size"
  | "radius"
  | "zIndex"
  | "fontFamily"
  | "fontSize"
  | "fontWeight"
  | "lineHeight"
  | "letterSpacing"
  | "shadow";

/**
 * Schema-derived Tamagui vocabulary serialized into the generated ESLint
 * module.
 */
export interface GuardrailTheme {
  /** Plugin `meta.name`. */
  name: string;
  /** Plugin `meta.version`. */
  version: string;
  /** Rule namespace used in flat config. */
  prefix: string;
  /**
   * Themes the generated config defines: color schemes (`light`, `dark`)
   * followed by nested semantic themes (`primary`, `danger`, …).
   */
  themes: string[];
  /**
   * Token category → bare v3 names the generated config defines, e.g.
   * `{ color: ["background", "blue1"], space: ["4", "sm"] }`. Colors include
   * theme values (`background`) as well as `createTokens` color keys.
   */
  tokens: Partial<Record<GuardrailTokenCategory, string[]>>;
  /** Shorthand → style property (`bg` → `backgroundColor`). */
  shorthands: Record<string, string>;
}

/** Shared ESLint `settings["razorwind-tamagui"]` read by every guardrail rule. */
export interface GuardrailSettings {
  /**
   * JSX element names whose style props are linted. When omitted, every
   * capitalized component (`<View>`, `<Stack.Item>`) is linted.
   */
  components?: string[];
  /** Calls whose object arguments are style configs (`styled`). */
  callees?: string[];
}

/** Options for the generated flat-config factory. */
export interface GuardrailOptions extends GuardrailSettings {
  /** Glob(s) the rules apply to. */
  files?: string[];
  /** Glob(s) exempt from every rule. */
  ignores?: string[];
  /** Per-rule overrides of the schema-derived default severities. */
  severity?: Partial<Record<GuardrailRuleId, GuardrailSeverity>>;
}
