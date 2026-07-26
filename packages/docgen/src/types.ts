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
 * Options for the Razorwind MDX documentation extract plugin.
 */
export interface DocgenExtractPluginOptions {}

/**
 * Options for the Razorwind MDX documentation generator.
 */
export interface DocgenGeneratePluginOptions {
  /**
   * Directory (relative to the execution cwd) where generated docs are written.
   *
   * @defaultValue `"docs/design-system"`
   */
  outDir?: string;

  /**
   * Title used on the generated documentation index page.
   *
   * @defaultValue `"Design System"`
   */
  title?: string;

  /**
   * CSS custom-property prefix used when emitting `var(--…)` references.
   *
   * @defaultValue `"rw"`
   */
  cssVarPrefix?: string;

  /**
   * Restrict generated docs to these DTCG `$type` values.
   * When omitted, all supported types are included.
   */
  includeTypes?: TokenType[];

  /**
   * Skip generating component documentation pages.
   *
   * @defaultValue `false`
   */
  skipRegistry?: boolean;
}

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
