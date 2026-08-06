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
 * A flattened design token ready for Ghostty theme mapping.
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

/** ANSI palette index (0–15). */
export type GhosttyPaletteIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

/**
 * 16-color terminal palette for Ghostty `palette = N=#rrggbb` entries.
 *
 * @see https://ghostty.org/docs/features/theme
 */
export type GhosttyPalette =
  | Partial<Record<GhosttyPaletteIndex, string>>
  | string[];

/**
 * Ghostty theme document — rendered to a theme file under `themes/`.
 *
 * Ghostty themes are configuration fragments (`key = value`) that set colors
 * and optional terminal options. The file basename (no extension) is the theme
 * id referenced by `theme = ...` in `config`.
 *
 * @see https://draculatheme.com/ghostty
 * @see https://ghostty.org/docs/features/theme
 */
export interface GhosttyTheme {
  /**
   * Theme id — becomes the theme filename (no extension) and `theme =` value.
   * Prefer lowercase with hyphens (e.g. `my-theme`).
   */
  name: string;
  /** Human-readable label for INSTALL.md. Defaults to {@link name}. */
  displayName?: string;
  /**
   * ANSI palette colors 0–15. Array form uses index as palette slot.
   * Omitted slots are not written.
   */
  palette?: GhosttyPalette;
  /** Terminal background color. */
  background?: string;
  /** Default text color. */
  foreground?: string;
  /** Cursor color (`cursor-color`). */
  cursorColor?: string;
  /** Text under the cursor (`cursor-text`). */
  cursorText?: string;
  /** Selected text color (`selection-foreground`). */
  selectionForeground?: string;
  /** Selection highlight (`selection-background`). */
  selectionBackground?: string;
  /**
   * Additional Ghostty config entries appended after palette / colors.
   * Keys use Ghostty kebab-case (`cursor-style`, `font-family`, …).
   * Values may repeat the same key (e.g. multiple `keybind` lines).
   */
  config?: Record<string, string | string[]>;
}

/**
 * Map extracted design tokens to one or more Ghostty theme documents.
 *
 * Return a single theme, an array, or a record keyed by theme id.
 */
export type GenerateGhosttyTheme = (
  tokens: Tokens | Record<string, Tokens>
) => GhosttyTheme | GhosttyTheme[] | Record<string, GhosttyTheme>;

/**
 * Options for the Razorwind Ghostty theme generator.
 *
 * @see https://draculatheme.com/ghostty
 */
export interface GhosttyPluginOptions {
  /**
   * Directory (relative to the execution cwd) for generated theme files.
   *
   * @defaultValue `"ghostty-themes"`
   */
  outputPath?: string;

  /**
   * Map extracted tokens to Ghostty theme document(s).
   *
   * Required — without a mapping there is nothing to emit.
   */
  mapTheme: GenerateGhosttyTheme;

  /**
   * Override body for generated `INSTALL.md`. When omitted, Ghostty install
   * steps are written (copy into `~/.config/ghostty/themes/`, set `theme`).
   *
   * @see https://draculatheme.com/ghostty
   */
  installGuide?: string;

  /**
   * Restrict flattened helper tokens to these DTCG `$type` values.
   * Does not filter what {@link mapTheme} receives.
   */
  includeTypes?: TokenType[];
}
