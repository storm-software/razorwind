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
import type { Tokens } from "@razorwind/core/schema";

/**
 * A flattened design token ready for Shiki theme mapping.
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
  /** Optional DTCG `$description`. */
  description?: string;
  /** Theme / set id when tokens are a `Record<string, Tokens>`. */
  theme?: string;
}

/**
 * TextMate token color / scope rule used by Shiki themes.
 *
 * @see https://shiki.style/guide/load-theme
 */
export interface ShikiThemeSetting {
  name?: string;
  scope?: string | string[];
  settings: {
    foreground?: string;
    background?: string;
    fontStyle?: string;
  };
}

/**
 * Shiki / TextMate color theme document.
 *
 * Loadable via `createHighlighter({ themes: [...] })` or
 * `highlighter.loadTheme(...)`.
 *
 * @see https://shiki.style/guide/load-theme
 * @see https://shiki.style/guide/theme-colors
 */
export interface ShikiTheme {
  /** Stable theme id — must match the `theme` option passed to Shiki. */
  name: string;
  /** Human-readable label. */
  displayName?: string;
  /** Theme kind. Defaults to `"dark"` when omitted at load time. */
  type?: "light" | "dark";
  /** Default foreground color (Shiki custom field). */
  fg?: string;
  /** Background color (Shiki custom field). */
  bg?: string;
  /**
   * VS Code-style workbench / ANSI color map.
   * Used by Shiki for defaults and `lang: "ansi"`.
   */
  colors?: Record<string, string>;
  /** Token scope rules (TextMate `settings`). Preferred over {@link tokenColors}. */
  settings?: ShikiThemeSetting[];
  /**
   * Same as {@link settings} — Shiki uses this as fallback when `settings`
   * is absent (VS Code theme JSON shape).
   */
  tokenColors?: ShikiThemeSetting[];
  /** Hex-key color remaps (Shiki custom field). */
  colorReplacements?: Record<string, string>;
  semanticHighlighting?: boolean;
  semanticTokenColors?: Record<string, string>;
}

/**
 * Map extracted design tokens to one or more Shiki theme documents.
 *
 * Return a single theme, an array, or a record keyed by theme id.
 */
export type GenerateShikiTheme = (
  tokens: Tokens | Record<string, Tokens>
) => ShikiTheme | ShikiTheme[] | Record<string, ShikiTheme>;

/**
 * Options for the Razorwind Shiki theme generator.
 *
 * @see https://shiki.style/guide/load-theme
 */
export interface ShikiPluginOptions {
  /**
   * Directory (relative to the execution cwd) for generated theme JSON files.
   *
   * @defaultValue `"shiki-themes"`
   */
  outputPath?: string;

  /**
   * Map extracted tokens to Shiki theme JSON document(s).
   *
   * Required — without a mapping there is nothing to emit.
   */
  mapTheme: GenerateShikiTheme;

  /**
   * Restrict flattened helper tokens to these DTCG `$type` values.
   * Does not filter what {@link mapTheme} receives.
   */
  includeTypes?: TokenType[];

  /**
   * Override body for generated `INSTALL.md`. When omitted, Shiki load-theme
   * steps are generated from contributed themes.
   */
  installGuide?: string;
}
