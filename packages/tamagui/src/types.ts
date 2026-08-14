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

/**
 * Animation driver entry imported from `@tamagui/config/v5-*`.
 *
 * @see https://tamagui.dev/docs/core/config-v5
 */
export type TamaguiAnimationDriver =
  "css" | "rn" | "reanimated" | "motion" | false;

/**
 * Tamagui `createTokens` category keys we emit from DTCG tokens.
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
   * Output path written relative to the execution cwd.
   *
   * Light and dark schemes are always written to this single file — Tamagui
   * `createV5Theme` encodes both palettes in one config.
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
   * When true, spread `defaultConfig` from `@tamagui/config/v5` and merge
   * generated tokens/themes on top. When false, emit a minimal config from
   * Razorwind tokens only.
   *
   * @defaultValue `true`
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
   * True when an ancestor group is marked as a palette (`palette: true` or
   * `$type: "palette"`). Those scales feed Tamagui `childrenThemes` /
   * `lightPalette` / `darkPalette`.
   */
  palette?: boolean;
}
