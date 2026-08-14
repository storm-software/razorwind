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
 * A flattened design token ready for Thunderbird theme mapping.
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

/** RGB tuple (0–255 per channel) used when mapping theme colors. */
export type ThunderbirdRgb = [number, number, number];

/**
 * Color input accepted in {@link ThunderbirdTheme.colors}.
 * Hex strings (`#rrggbb`) and RGB tuples are converted to `rgb(r, g, b)` strings
 * when rendering.
 */
export type ThunderbirdColorInput = ThunderbirdRgb | string;

/**
 * Gecko extension identifier for Thunderbird theme manifests.
 *
 * @see https://github.com/dracula/thunderbird/blob/master/manifest.json
 */
export interface ThunderbirdGeckoApplication {
  /** Unique add-on id (email-style recommended). */
  id: string;
  /** Minimum Thunderbird version. @defaultValue `"60.0"` */
  strictMinVersion?: string;
}

/**
 * Well-known Thunderbird / Firefox theme color keys.
 *
 * @see https://github.com/dracula/thunderbird/blob/master/manifest.json
 * @see https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/theme
 */
export type ThunderbirdThemeColorKey =
  | "button_background_active"
  | "button_background_hover"
  | "frame"
  | "icons"
  | "icons_attention"
  | "ntp_background"
  | "ntp_text"
  | "popup"
  | "popup_border"
  | "popup_highlight"
  | "popup_highlight_text"
  | "popup_text"
  | "sidebar"
  | "sidebar_border"
  | "sidebar_highlight"
  | "sidebar_highlight_text"
  | "sidebar_text"
  | "tab_background_separator"
  | "tab_background_text"
  | "tab_line"
  | "tab_loading"
  | "tab_selected"
  | "tab_text"
  | "toolbar"
  | "toolbar_bottom_separator"
  | "toolbar_field"
  | "toolbar_field_border"
  | "toolbar_field_border_focus"
  | "toolbar_field_highlight"
  | "toolbar_field_highlight_text"
  | "toolbar_field_separator"
  | "toolbar_field_text"
  | "toolbar_text"
  | "toolbar_top_separator"
  | "toolbar_vertical_separator"
  | (string & {});

/**
 * Mozilla Thunderbird extension theme manifest — rendered to `manifest.json`.
 *
 * Load from the Add-ons manager or publish to Thunderbird Add-ons.
 *
 * @see https://draculatheme.com/thunderbird
 * @see https://github.com/dracula/thunderbird/blob/master/manifest.json
 */
export interface ThunderbirdTheme {
  /**
   * Extension display name written to `manifest.json`.
   * Also used to derive the output folder slug.
   */
  name: string;
  /** Optional label for INSTALL.md when different from {@link name}. */
  displayName?: string;
  /** Extension description. @defaultValue derived from {@link name} */
  description?: string;
  /** Extension version string. @defaultValue `"1.0.0"` */
  version?: string;
  /** Manifest format version. @defaultValue `2` */
  manifestVersion?: 2;
  /**
   * Gecko application metadata required by Thunderbird theme manifests.
   * Provide a unique {@link ThunderbirdGeckoApplication.id} per theme.
   */
  gecko: ThunderbirdGeckoApplication;
  /**
   * Browser UI colors. Values are RGB tuples or hex strings converted to
   * `rgb(r, g, b)` at render time.
   */
  colors: Record<ThunderbirdThemeColorKey, ThunderbirdColorInput>;
  /**
   * Extension icons by size (e.g. `"200"`).
   * Paths are relative to the extension root — add PNG files before loading.
   */
  icons?: Record<string, string>;
}

/**
 * Map extracted design tokens to one or more Thunderbird theme manifests.
 *
 * Return a single theme, an array, or a record keyed by theme id.
 */
export type GenerateThunderbirdTheme = (
  tokens: Tokens | Record<string, Tokens>
) => ThunderbirdTheme | ThunderbirdTheme[] | Record<string, ThunderbirdTheme>;

/**
 * Options for the Razorwind Thunderbird theme generator.
 *
 * @see https://draculatheme.com/thunderbird
 */
export interface ThunderbirdPluginOptions {
  /**
   * Directory (relative to the execution cwd) for generated theme folders.
   *
   * @defaultValue `"thunderbird-themes"`
   */
  outputPath?: string;

  /**
   * Map extracted tokens to Thunderbird `manifest.json` document(s).
   *
   * Required — without a mapping there is nothing to emit.
   */
  mapTheme: GenerateThunderbirdTheme;

  /**
   * Restrict flattened helper tokens to these DTCG `$type` values.
   * Does not filter what {@link mapTheme} receives.
   */
  includeTypes?: TokenType[];

  /**
   * Override body for generated `INSTALL.md`. When omitted, Thunderbird install
   * steps are generated from contributed themes.
   */
  installGuide?: string;
}
