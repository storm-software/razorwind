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

import type { Tokens, TokenType } from "@power-plant/dtcg-schema";

/**
 * A flattened design token ready for documentation rendering.
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
  /** Stable CSS custom property name for this path. */
  cssVar: string;
  /** Optional DTCG `$description`. */
  description?: string;
  /** Theme / set id when tokens are a `Record<string, Tokens>`. */
  theme?: string;
}

/**
 * Storybook theme variables passed to `create()` from `storybook/theming`.
 *
 * @see https://storybook.js.org/docs/configure/user-interface/theming
 */
export interface StorybookTheme {
  /** Required baseline palette (`light` or `dark`). */
  base: "light" | "dark";
  colorPrimary?: string;
  colorSecondary?: string;
  appBg?: string;
  appContentBg?: string;
  appHoverBg?: string;
  appPreviewBg?: string;
  appBorderColor?: string;
  appBorderRadius?: number;
  fontBase?: string;
  fontCode?: string;
  textColor?: string;
  textInverseColor?: string;
  textMutedColor?: string;
  barTextColor?: string;
  barHoverColor?: string;
  barSelectedColor?: string;
  barBg?: string;
  buttonBg?: string;
  buttonBorder?: string;
  booleanBg?: string;
  booleanSelectedBg?: string;
  inputBg?: string;
  inputBorder?: string;
  inputTextColor?: string;
  inputBorderRadius?: number;
  brandTitle?: string;
  brandUrl?: string;
  brandImage?: string;
  brandTarget?: string;
  gridCellSize?: number;
}

export type StorybookThemeResult =
  StorybookTheme | Record<string, StorybookTheme>;

/**
 * Map flattened design tokens to a Storybook theme object.
 *
 * @see https://storybook.js.org/docs/configure/user-interface/theming
 */
export type GenerateStorybookTheme = (
  tokens: Tokens | Record<string, Tokens>
) => StorybookThemeResult;

/**
 * Options for the Razorwind Storybook token docs generator.
 */
export interface StorybookPluginOptions {
  /**
   * Directory (relative to the execution cwd) where generated docs are written.
   *
   * @defaultValue `"storybook/tokens"`
   */
  outputPath?: string;

  /**
   * Storybook sidebar title prefix for generated MDX pages.
   *
   * @defaultValue `"Design Tokens"`
   */
  titlePrefix?: string;

  /**
   * CSS custom-property prefix used when emitting `var(--…)` references.
   *
   * @defaultValue `"rw"`
   */
  cssVarPrefix?: string;

  /**
   * Sample text rendered by the typography Typeset doc block.
   *
   * @defaultValue `"The quick brown fox jumps over the lazy dog"`
   */
  sampleText?: string;

  /**
   * Restrict generated docs to these DTCG `$type` values.
   * When omitted, all supported types are included.
   */
  includeTypes?: TokenType[];

  /**
   * Depth used when grouping color tokens into `ColorItem` entries.
   *
   * @defaultValue `2`
   */
  colorGroupBy?: number;

  /**
   * Map extracted token values to a Storybook UI theme.
   *
   * When provided, the result is written to `{outputPath}/theme.ts` as a
   * `create()` call from `storybook/theming`.
   *
   * @see https://storybook.js.org/docs/configure/user-interface/theming
   */
  generateTheme?: GenerateStorybookTheme;

  /**
   * Skip generating icon documentation pages.
   *
   * @defaultValue `false`
   */
  skipIcons?: boolean;
}
