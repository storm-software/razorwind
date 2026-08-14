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
 * A flattened design token ready for Chrome theme mapping.
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

/** Chrome theme color as an RGB tuple (0–255 per channel). */
export type ChromeRgb = [number, number, number];

/** HSL tint tuple used by Chrome theme manifests. */
export type ChromeTint = [number, number, number];

/**
 * Color input accepted in {@link ChromeTheme.colors}.
 * Hex strings (`#rrggbb`) are converted to RGB when rendering.
 */
export type ChromeColorInput = ChromeRgb | string;

/**
 * Well-known Chrome browser UI color keys.
 *
 * @see https://developer.chrome.com/docs/extensions/develop/ui/themes
 */
export type ChromeThemeColorKey =
  | "frame"
  | "frame_inactive"
  | "frame_incognito"
  | "frame_incognito_inactive"
  | "toolbar"
  | "toolbar_button_icon"
  | "tab_text"
  | "tab_background_text"
  | "tab_background_text_inactive"
  | "tab_background_text_incognito"
  | "tab_background_text_incognito_inactive"
  | "bookmark_text"
  | "omnibox_text"
  | "omnibox_background"
  | "ntp_background"
  | "ntp_text"
  | "ntp_link"
  | "ntp_header"
  | "ntp_section"
  | "button_background"
  | (string & {});

/**
 * Well-known Chrome theme image keys (paths relative to the extension root).
 *
 * @see https://developer.chrome.com/docs/extensions/develop/ui/themes
 */
export type ChromeThemeImageKey =
  | "theme_frame"
  | "theme_frame_overlay"
  | "theme_frame_incognito"
  | "theme_toolbar"
  | "theme_tab_background"
  | "theme_ntp_background"
  | "theme_ntp_attribution"
  | (string & {});

/**
 * Google Chrome extension theme manifest — rendered to `manifest.json`.
 *
 * Load as an unpacked extension or publish to the Chrome Web Store.
 *
 * @see https://developer.chrome.com/docs/extensions/develop/ui/themes
 * @see https://github.com/dracula/google-chrome/blob/master/manifest.json
 */
export interface ChromeTheme {
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
  /** Manifest format version. @defaultValue `3` */
  manifestVersion?: 2 | 3;
  /**
   * Browser UI colors. Values are RGB tuples or hex strings converted at render
   * time.
   */
  colors: Record<ChromeThemeColorKey, ChromeColorInput>;
  /** Optional theme image paths (add image files beside `manifest.json`). */
  images?: Partial<Record<ChromeThemeImageKey, string>>;
  /**
   * Extension icons by size (e.g. `"16"`, `"48"`, `"128"`).
   * Paths are relative to the extension root — add PNG files before loading.
   */
  icons?: Record<string, string>;
  /** HSL tints for frame, buttons, and incognito UI. */
  tints?: Partial<Record<string, ChromeTint>>;
  /** Theme layout properties (e.g. `ntp_background_alignment`). */
  properties?: Record<string, string | number>;
}

/**
 * Map extracted design tokens to one or more Chrome theme manifests.
 *
 * Return a single theme, an array, or a record keyed by theme id.
 */
export type GenerateChromeTheme = (
  tokens: Tokens | Record<string, Tokens>
) => ChromeTheme | ChromeTheme[] | Record<string, ChromeTheme>;

/**
 * Options for the Razorwind Chrome theme generator.
 *
 * @see https://developer.chrome.com/docs/extensions/develop/ui/themes
 */
export interface ChromePluginOptions {
  /**
   * Directory (relative to the execution cwd) for generated theme folders.
   *
   * @defaultValue `"chrome-themes"`
   */
  outputPath?: string;

  /**
   * Map extracted tokens to Chrome `manifest.json` document(s).
   *
   * Required — without a mapping there is nothing to emit.
   */
  mapTheme: GenerateChromeTheme;

  /**
   * Restrict flattened helper tokens to these DTCG `$type` values.
   * Does not filter what {@link mapTheme} receives.
   */
  includeTypes?: TokenType[];

  /**
   * Override body for generated `INSTALL.md`. When omitted, Chrome install
   * steps are generated from contributed themes.
   */
  installGuide?: string;
}
