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
