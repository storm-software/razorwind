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
 * A flattened design token ready for Vivaldi theme mapping.
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

/** Background image placement in the Vivaldi theme editor. */
export type VivaldiBackgroundPosition =
  | "stretch"
  | "center"
  | "top"
  | "bottom"
  | "left"
  | "right";

/**
 * Vivaldi browser theme document — rendered to `settings.json` inside a theme
 * folder. Zip the folder to install via **Settings → Themes → Open Theme…**.
 *
 * @see https://help.vivaldi.com/desktop/appearance-customization/shareable-vivaldi-themes/
 * @see https://draculatheme.com/vivaldi
 */
export interface VivaldiTheme {
  /**
   * Human-readable theme name written to `settings.json`.
   * Also used to derive the output folder slug.
   */
  name: string;
  /** Optional label for INSTALL.md when different from {@link name}. */
  displayName?: string;
  /**
   * Theme UUID (RFC 4122). Generated when omitted — provide a stable value
   * when publishing updates to themes.vivaldi.net.
   */
  id?: string;
  /** Theme format version. @defaultValue `3` */
  version?: number;
  /** Engine format version. @defaultValue `1` */
  engineVersion?: number;
  /** Main UI background color (`colorBg`). */
  colorBg: string;
  /** Main UI foreground color (`colorFg`). */
  colorFg: string;
  /** Accent / secondary toolbar background (`colorAccentBg`). */
  colorAccentBg?: string;
  /** Highlight / selection color (`colorHighlightBg`). */
  colorHighlightBg?: string;
  /** Window chrome background (`colorWindowBg`). */
  colorWindowBg?: string;
  /** Toolbar opacity (0–1). @defaultValue `0.87` */
  alpha?: number;
  /** UI contrast boost. @defaultValue `5` */
  contrast?: number;
  /** Corner radius in pixels. @defaultValue `9` */
  radius?: number;
  /** Blur strength for transparent toolbars. @defaultValue `10` */
  blur?: number;
  /**
   * Background image filename beside `settings.json` (e.g. `background.png`).
   * Add the image file to the theme folder before zipping.
   */
  backgroundImage?: string;
  /** Background image placement. @defaultValue `"stretch"` */
  backgroundPosition?: VivaldiBackgroundPosition;
  /** Use the active page accent instead of theme accent. @defaultValue `false` */
  accentFromPage?: boolean;
  /** Show accent on the window frame. @defaultValue `false` */
  accentOnWindow?: boolean;
  /** Cap accent saturation from webpages (0–1). @defaultValue `1` */
  accentSaturationLimit?: number;
  /** Prefer the OS accent color. @defaultValue `false` */
  preferSystemAccent?: boolean;
  /** Dim blurred transparent regions. @defaultValue `true` */
  dimBlurred?: boolean;
  /** Use slim scrollbars. @defaultValue `false` */
  simpleScrollbar?: boolean;
  /** Transparent tab bar. @defaultValue `true` */
  transparencyTabBar?: boolean;
  /** Transparent inactive tabs. @defaultValue `false` */
  transparencyTabs?: boolean;
  /** themes.vivaldi.net status URL when published. */
  url?: string;
}

/**
 * Map extracted design tokens to one or more Vivaldi theme documents.
 *
 * Return a single theme, an array, or a record keyed by theme id.
 */
export type GenerateVivaldiTheme = (
  tokens: Tokens | Record<string, Tokens>
) => VivaldiTheme | VivaldiTheme[] | Record<string, VivaldiTheme>;

/**
 * Options for the Razorwind Vivaldi theme generator.
 *
 * @see https://draculatheme.com/vivaldi
 */
export interface VivaldiPluginOptions {
  /**
   * Directory (relative to the execution cwd) for generated theme folders.
   *
   * @defaultValue `"vivaldi-themes"`
   */
  outputPath?: string;

  /**
   * Map extracted tokens to Vivaldi `settings.json` document(s).
   *
   * Required — without a mapping there is nothing to emit.
   */
  mapTheme: GenerateVivaldiTheme;

  /**
   * Restrict flattened helper tokens to these DTCG `$type` values.
   * Does not filter what {@link mapTheme} receives.
   */
  includeTypes?: TokenType[];

  /**
   * Override body for generated `INSTALL.md`. When omitted, Vivaldi install
   * steps are generated from contributed themes.
   */
  installGuide?: string;
}
