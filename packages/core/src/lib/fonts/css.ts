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

import { basename } from "node:path";
import type {
  Font,
  FontDisplay,
  FontFile,
  FontFileFormat,
  Fonts,
  GoogleFont,
  LocalFont
} from "../../schema/fonts";
import { GENERIC_FALLBACK_FROM_ROLE } from "./constants";

export interface RenderFontCssOptions {
  /**
   * Directory prefix used in `url()` for local font files.
   *
   * @defaultValue `"./fonts/"`
   */
  urlPrefix?: string;
}

function quoteFamily(family: string): string {
  const trimmed = family.trim();
  if (!trimmed) {
    return trimmed;
  }

  if (/^[a-z-]+$/i.test(trimmed) && !/\s/.test(trimmed)) {
    return trimmed;
  }

  return `"${trimmed.replaceAll('"', '\\"')}"`;
}

/**
 * Resolve the CSS `font-family` name for a font entry.
 */
export function fontFamilyName(font: Font): string {
  return font.family?.trim() || font.title?.trim() || font.name;
}

/**
 * Build a CSS `font-family` stack: quoted family, configured fallbacks, then
 * a generic fallback from `role`.
 */
export function cssFontFamily(font: Font): string {
  const parts = [quoteFamily(fontFamilyName(font))];

  for (const fallback of font.fallbacks ?? []) {
    const quoted = quoteFamily(fallback);
    if (quoted && !parts.includes(quoted)) {
      parts.push(quoted);
    }
  }

  if (font.role) {
    const generic = GENERIC_FALLBACK_FROM_ROLE[font.role];
    if (generic && !parts.includes(generic)) {
      parts.push(generic);
    }
  }

  return parts.filter(Boolean).join(", ");
}

/**
 * Build a Google Fonts CSS2 stylesheet URL.
 *
 * @example
 * `https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,700&display=swap`
 */
export function toGoogleFontsCssUrl(font: GoogleFont): string {
  const family = fontFamilyName(font).replaceAll(" ", "+");
  const display: FontDisplay = font.display ?? "swap";
  const weights = (font.weights ?? []).map(String);
  const styles = font.styles ?? ["normal"];
  const hasItalic = styles.includes("italic");

  let familySpec = family;

  if (font.variable) {
    const range =
      weights.length === 2 ? `${weights[0]}..${weights[1]}` : "100..900";
    if (hasItalic) {
      familySpec = `${family}:ital,wght@0,${range};1,${range}`;
    } else {
      familySpec = `${family}:wght@${range}`;
    }
  } else if (weights.length > 0) {
    if (hasItalic) {
      const pairs: string[] = [];
      for (const weight of weights) {
        pairs.push(`0,${weight}`);
      }
      for (const weight of weights) {
        pairs.push(`1,${weight}`);
      }
      familySpec = `${family}:ital,wght@${pairs.join(";")}`;
    } else {
      familySpec = `${family}:wght@${weights.join(";")}`;
    }
  }

  return `https://fonts.googleapis.com/css2?family=${familySpec}&display=${display}`;
}

function formatFromFile(file: FontFile): FontFileFormat | undefined {
  return file.format;
}

function localSrc(file: FontFile, urlPrefix: string): string {
  const name = basename(file.path);
  const prefix = urlPrefix.endsWith("/") ? urlPrefix : `${urlPrefix}/`;
  const url = `${prefix}${name}`;
  const format = formatFromFile(file);

  if (format) {
    return `url("${url}") format("${format}")`;
  }

  return `url("${url}")`;
}

function renderLocalFontFace(font: LocalFont, urlPrefix: string): string {
  const family = fontFamilyName(font);
  const display = font.display ?? "swap";

  return font.files
    .map(file => {
      const lines = [
        "@font-face {",
        `  font-family: ${quoteFamily(family)};`,
        `  src: ${localSrc(file, urlPrefix)};`
      ];

      if (file.weight !== undefined) {
        lines.push(`  font-weight: ${file.weight};`);
      }
      if (file.style) {
        lines.push(`  font-style: ${file.style};`);
      }
      if (file.unicodeRange) {
        lines.push(`  unicode-range: ${file.unicodeRange};`);
      }
      lines.push(`  font-display: ${display};`, "}");

      return lines.join("\n");
    })
    .join("\n\n");
}

/**
 * Google Fonts `@import` rules. Must stay ahead of other CSS except `@charset`.
 */
export function renderGoogleFontImports(fonts: Fonts): string {
  return Object.values(fonts)
    .filter(font => font.source === "google")
    .map(font => `@import url("${toGoogleFontsCssUrl(font)}");`)
    .join("\n");
}

/**
 * Local `@font-face` rules.
 */
export function renderLocalFontFaces(
  fonts: Fonts,
  options: RenderFontCssOptions = {}
): string {
  const urlPrefix = options.urlPrefix ?? "./fonts/";

  return Object.values(fonts)
    .filter(font => font.source === "local")
    .map(font => renderLocalFontFace(font, urlPrefix))
    .join("\n\n");
}

/**
 * Emit `@import` (Google Fonts) and `@font-face` (local files) CSS.
 */
export function renderFontCss(
  fonts: Fonts,
  options: RenderFontCssOptions = {}
): string {
  return [renderGoogleFontImports(fonts), renderLocalFontFaces(fonts, options)]
    .filter(Boolean)
    .join("\n\n");
}

/**
 * Prepend font loading CSS ahead of an existing stylesheet.
 */
export function prependFontCss(
  css: string,
  fonts: Fonts | undefined,
  options: RenderFontCssOptions = {}
): string {
  if (!fonts || Object.keys(fonts).length === 0) {
    return css;
  }

  const fontCss = renderFontCss(fonts, options);
  if (!fontCss) {
    return css;
  }

  return css ? `${fontCss}\n\n${css}` : `${fontCss}\n`;
}
