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

/* eslint-disable regexp/no-super-linear-backtracking */

import { titleCase } from "@stryke/string-format/title-case";
import type {
  Font,
  FontDisplay,
  FontFile,
  FontFileFormat,
  Fonts,
  GoogleFont,
  LocalFont
} from "../../schema/fonts";
import { FONT_FORMAT_FROM_EXTENSION } from "./constants";

const FONT_FACE_RE = /@font-face\s*\{([^{}]*)\}/gi;
const GOOGLE_IMPORT_RE =
  /@import\s+(?:url\()?['"]?(https:\/\/fonts\.googleapis\.com\/css2?\?[^)'"\s]+)['"]?\)?\s*;/gi;
const GOOGLE_URL_RE =
  /url\(\s*['"]?(https:\/\/fonts\.googleapis\.com\/css2?\?[^)'"\s]+)['"]?\s*\)/gi;
const FONT_FAMILY_RE = /font-family\s*:\s*([^;]+);/i;
const FONT_WEIGHT_RE = /font-weight\s*:\s*([^;]+);/i;
const FONT_STYLE_RE = /font-style\s*:\s*(normal|italic|oblique)/i;
const FONT_DISPLAY_RE =
  /font-display\s*:\s*(auto|block|swap|fallback|optional)/i;
const UNICODE_RANGE_RE = /unicode-range\s*:\s*([^;]+);/i;
const SRC_URL_RE =
  /url\(\s*['"]?([^)'"]+)['"]?\s*\)(?:\s*format\(\s*['"]?([\w-]+)['"]?\s*\))?/i;

function slugifyFamily(family: string): string {
  return family
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");
}

function unquote(value: string): string {
  return value
    .trim()
    .replaceAll(/^['"]|['"]$/g, "")
    .trim();
}

function parseWeight(value: string | undefined): number | string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  const numeric = Number.parseInt(trimmed, 10);
  if (!Number.isNaN(numeric)) {
    return numeric;
  }

  return trimmed || undefined;
}

function formatFromSrc(
  format: string | undefined,
  url: string
): FontFileFormat | undefined {
  if (format) {
    const normalized = format.toLowerCase();
    if (
      normalized === "woff2" ||
      normalized === "woff" ||
      normalized === "truetype" ||
      normalized === "opentype" ||
      normalized === "svg"
    ) {
      return normalized;
    }
  }

  const extension = url.split(".").pop()?.split("?")[0]?.toLowerCase();

  return extension ? FONT_FORMAT_FROM_EXTENSION[extension] : undefined;
}

function upsertLocalFile(
  fonts: Fonts,
  family: string,
  file: FontFile,
  display?: FontDisplay
): void {
  const key = slugifyFamily(family) || "font";
  const existing = fonts[key];

  if (existing?.source === "local") {
    const files = [...existing.files];
    const duplicate = files.findIndex(entry => entry.path === file.path);
    if (duplicate >= 0) {
      files[duplicate] = file;
    } else {
      files.push(file);
    }
    fonts[key] = { ...existing, files };
    return;
  }

  if (existing) {
    return;
  }

  fonts[key] = {
    source: "local",
    name: key,
    title: titleCase(family),
    family,
    ...(display ? { display } : {}),
    files: [file]
  } satisfies LocalFont;
}

function parseGoogleCssUrl(url: string): GoogleFont[] {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return [];
  }

  const displayParam = parsed.searchParams.get("display");
  const display: FontDisplay | undefined =
    displayParam === "auto" ||
    displayParam === "block" ||
    displayParam === "swap" ||
    displayParam === "fallback" ||
    displayParam === "optional"
      ? displayParam
      : undefined;

  const familyParams = parsed.searchParams.getAll("family");
  const fonts: GoogleFont[] = [];

  for (const raw of familyParams) {
    const [namePart, axisPart] = raw.split(":");
    const family = (namePart ?? "").replaceAll("+", " ").trim();
    if (!family) {
      continue;
    }

    const key = slugifyFamily(family);
    const weights: Array<number | string> = [];
    const styles = new Set<"normal" | "italic">();
    let variable = false;

    if (axisPart) {
      const [axes, values] = axisPart.split("@");
      const axisNames = (axes ?? "").split(",");
      const italIndex = axisNames.indexOf("ital");
      const wghtIndex = axisNames.indexOf("wght");
      const tuples = (values ?? "").split(";").filter(Boolean);

      for (const tuple of tuples) {
        const parts = tuple.split(",");
        if (italIndex >= 0) {
          const ital = parts[italIndex];
          if (ital === "1") {
            styles.add("italic");
          } else {
            styles.add("normal");
          }
        } else {
          styles.add("normal");
        }

        const weightRaw = wghtIndex >= 0 ? parts[wghtIndex] : parts[0];
        if (weightRaw?.includes("..")) {
          variable = true;
          const [min, max] = weightRaw.split("..");
          if (min) {
            weights.push(min);
          }
          if (max) {
            weights.push(max);
          }
        } else {
          const weight = parseWeight(weightRaw);
          if (weight !== undefined && !weights.includes(weight)) {
            weights.push(weight);
          }
        }
      }
    }

    fonts.push({
      source: "google",
      name: key || "font",
      title: titleCase(family),
      family,
      ...(display ? { display } : {}),
      ...(weights.length > 0 ? { weights } : {}),
      ...(styles.size > 0 ? { styles: [...styles] } : {}),
      ...(variable ? { variable: true } : {})
    });
  }

  return fonts;
}

function collectGoogleUrls(contents: string): string[] {
  const urls = new Set<string>();

  for (const match of contents.matchAll(GOOGLE_IMPORT_RE)) {
    if (match[1]) {
      urls.add(match[1]);
    }
  }

  for (const match of contents.matchAll(GOOGLE_URL_RE)) {
    if (match[1]) {
      urls.add(match[1]);
    }
  }

  return [...urls];
}

/**
 * Parse `@font-face` rules and Google Fonts CSS URLs into a {@link Fonts} record.
 */
export function parseCssFonts(contents: string): Fonts {
  const withoutComments = contents.replace(/\/\*[\s\S]*?\*\//g, "");
  const fonts: Fonts = {};

  for (const url of collectGoogleUrls(withoutComments)) {
    for (const font of parseGoogleCssUrl(url)) {
      fonts[font.name] ??= font;
    }
  }

  for (const match of withoutComments.matchAll(FONT_FACE_RE)) {
    const body = match[1] ?? "";
    const family = unquote(FONT_FAMILY_RE.exec(body)?.[1] ?? "");
    if (!family) {
      continue;
    }

    const srcMatch = SRC_URL_RE.exec(body);
    const srcUrl = srcMatch?.[1];
    if (!srcUrl || srcUrl.includes("fonts.googleapis.com")) {
      continue;
    }

    const file: FontFile = {
      path: srcUrl,
      format: formatFromSrc(srcMatch?.[2], srcUrl),
      weight: parseWeight(FONT_WEIGHT_RE.exec(body)?.[1]),
      style: FONT_STYLE_RE.exec(body)?.[1] as FontFile["style"] | undefined,
      unicodeRange: UNICODE_RANGE_RE.exec(body)?.[1]?.trim()
    };

    const displayMatch = FONT_DISPLAY_RE.exec(body)?.[1] as
      FontDisplay | undefined;
    upsertLocalFile(fonts, family, file, displayMatch);
  }

  return fonts;
}

export function isEmptyFonts(fonts: Fonts | undefined): boolean {
  return !fonts || Object.keys(fonts).length === 0;
}

/**
 * Merge `extra` into `base` without overwriting existing keys.
 */
export function mergeFonts(
  base: Fonts | undefined,
  extra: Fonts | undefined
): Fonts {
  const result: Fonts = { ...(base ?? {}) };

  for (const [key, font] of Object.entries(extra ?? {})) {
    result[key] ??= font;
  }

  return result;
}

/**
 * Find the first font whose `role` matches one of `roles`, in order.
 */
export function pickFontByRole(
  fonts: Fonts | undefined,
  roles: Font["role"] | Array<NonNullable<Font["role"]>>
): Font | undefined {
  if (!fonts) {
    return undefined;
  }

  const wanted = Array.isArray(roles) ? roles : [roles];

  for (const role of wanted) {
    const match = Object.values(fonts).find(font => font.role === role);
    if (match) {
      return match;
    }
  }

  return undefined;
}
