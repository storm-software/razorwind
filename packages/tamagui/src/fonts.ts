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

import { cssFontFamily, fontFamilyName } from "@razorwind/core/lib/fonts";
import type { Font, Fonts, LocalFont } from "@razorwind/core/schema";
import { isObject } from "@razorwind/core/utils";
import { basename } from "node:path";
import { toLiteral, toTamaguiValue } from "./format";
import type { FlatToken } from "./types";

const DTCG_ALIAS_PATTERN = /^\{([^{}]+)\}$/;
const TYPOGRAPHY_PATH_PREFIX = /^(?:typography|type|text)$/i;
const FONT_FAMILY_PATH_PREFIX = /^(?:font|fonts|font-family|fontFamily)$/i;
const FONT_SIZE_PATH_PREFIX = /^(?:font-size|fontSize)$/i;
const FONT_WEIGHT_PATH_PREFIX = /^(?:font-weight|fontWeight)$/i;
const LINE_HEIGHT_PATH_PREFIX = /^(?:line-height|lineHeight|leading)$/i;
const LETTER_SPACING_PATH_PREFIX =
  /^(?:letter-spacing|letterSpacing|tracking)$/i;
const LANGUAGE_SUFFIX_PATTERN =
  // eslint-disable-next-line regexp/no-dupe-disjunctions
  /^(?:[a-z]{2}(?:-[A-Z]{2})?|cn|zh|jp|ja|kr|ko|ar|he|th|hi|ru|french|mandarin|chinese|japanese|korean|arabic|hebrew)$/i;

const TYPOGRAPHY_FAMILY_KEYS = ["fontFamily", "font-family", "family"] as const;
const TYPOGRAPHY_SIZE_KEYS = ["fontSize", "font-size", "size"] as const;
const TYPOGRAPHY_WEIGHT_KEYS = ["fontWeight", "font-weight", "weight"] as const;
const TYPOGRAPHY_LINE_HEIGHT_KEYS = [
  "lineHeight",
  "line-height",
  "leading"
] as const;
const TYPOGRAPHY_LETTER_SPACING_KEYS = [
  "letterSpacing",
  "letter-spacing",
  "tracking"
] as const;

/**
 * Fallback size ramp used when no typography / font-size tokens are present.
 * Matches Tamagui's typical 1–10 scale so `createFont` always has `size`.
 *
 * @see https://tamagui.dev/docs/core/configuration
 */
const DEFAULT_FONT_SIZE_SCALE: Record<string, number> = {
  1: 12,
  2: 14,
  3: 16,
  4: 18,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 40,
  10: 48
};

/**
 * A Tamagui `createFont` definition assembled from DTCG typography tokens,
 * font-family tokens, and `spec.fonts`.
 *
 * @see https://tamagui.dev/docs/core/font-language#font-tokens
 */
export interface TamaguiFontDef {
  /** Tamagui `fonts` object key (`body`, `heading`, `body_cn`, …). */
  key: string;
  /** CSS font-family stack used when `isWeb` is true. */
  webFamily: string;
  /** Family name used on native. */
  nativeFamily: string;
  size: Record<string, number>;
  lineHeight: Record<string, number>;
  weight: Record<string, string>;
  letterSpacing: Record<string, number>;
  /** Rendered `face` object literal for local fonts, when present. */
  face?: string;
}

function readAliasPath(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const match = DTCG_ALIAS_PATTERN.exec(value.trim());

  return match?.[1]?.trim();
}

function resolveTokenValue(
  value: unknown,
  byPath: Map<string, FlatToken>
): unknown {
  const aliasPath = readAliasPath(value);
  if (!aliasPath) {
    return value;
  }

  let current = byPath.get(aliasPath);
  const seen = new Set<string>([aliasPath]);

  for (let depth = 0; depth < 8 && current; depth++) {
    const nextPath = readAliasPath(current.value);
    if (!nextPath || seen.has(nextPath)) {
      return current.value;
    }
    seen.add(nextPath);
    current = byPath.get(nextPath);
  }

  return current?.value ?? value;
}

function readProperty(
  value: Record<string, unknown>,
  keys: readonly string[]
): unknown {
  for (const key of keys) {
    if (value[key] !== undefined && value[key] !== null) {
      return value[key];
    }
  }

  return undefined;
}

function firstFamilyName(family: string): string {
  const first = family.split(",")[0]?.trim() ?? family;

  return first.replaceAll(/^["']|["']$/g, "");
}

function familyFromValue(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0 || readAliasPath(trimmed)) {
      return undefined;
    }

    return trimmed;
  }

  if (Array.isArray(value) && value.every(item => typeof item === "string")) {
    const parts = value.map(item => item.trim()).filter(Boolean);

    return parts.length > 0 ? parts.join(", ") : undefined;
  }

  return undefined;
}

function roundPixels(value: number): number {
  return Number.isInteger(value) ? value : Math.round(value * 1000) / 1000;
}

function toPixelNumber(value: unknown): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  const converted = toTamaguiValue(value);
  if (typeof converted === "number" && Number.isFinite(converted)) {
    return converted;
  }

  if (typeof converted === "string") {
    const percent = /^(-?\d+(?:\.\d+)?)%$/.exec(converted.trim());
    if (percent) {
      return Number.parseFloat(percent[1]!) / 100;
    }
  }

  return undefined;
}

function toWeightString(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0 || readAliasPath(trimmed)) {
      return undefined;
    }

    const numeric = Number(trimmed);
    if (!Number.isNaN(numeric)) {
      return String(numeric);
    }

    return trimmed;
  }

  const converted = toTamaguiValue(value);
  if (typeof converted === "number" && Number.isFinite(converted)) {
    return String(converted);
  }
  if (typeof converted === "string" && converted.length > 0) {
    return converted;
  }

  return undefined;
}

/**
 * Tamagui `lineHeight` is an absolute px value. Unitless DTCG multipliers
 * (`1.5`) are scaled by the matching font size when one is available.
 */
function toLineHeightPx(value: unknown, fontSize?: number): number | undefined {
  const numeric = toPixelNumber(value);
  if (numeric == null) {
    return undefined;
  }

  if (fontSize != null && numeric > 0 && numeric <= 4) {
    return roundPixels(numeric * fontSize);
  }

  return roundPixels(numeric);
}

function pathStartsWith(path: string, prefix: RegExp): boolean {
  return prefix.test(path.split(".")[0] ?? "");
}

function pathLeaf(path: string): string {
  return path.split(".").filter(Boolean).at(-1) ?? path;
}

function stripPathPrefix(path: string, prefix: RegExp): string[] {
  const segments = path.split(".").filter(Boolean);
  if (segments[0] && prefix.test(segments[0])) {
    segments.shift();
  }

  return segments;
}

function toFontKey(segments: string[]): string {
  const parts = segments.flatMap(segment => segment.split("-")).filter(Boolean);

  if (parts.length === 0) {
    return "body";
  }

  return parts
    .map((part, index) => {
      if (index === 0) {
        return `${part.charAt(0).toLowerCase()}${part.slice(1)}`;
      }

      return `${part.charAt(0).toUpperCase()}${part.slice(1)}`;
    })
    .join("");
}

/**
 * Map a font role / family token name onto a Tamagui `fonts` object key.
 *
 * Family aliases (`sans` / `serif` → `body`, `monospace` → `mono`) stay
 * collapsed so Tamagui's default font names resolve. Distinct type roles
 * (`heading`, `title`, `display`, `caption`, `code`) keep their own keys.
 */
export function tamaguiFontKeyFromRole(name: string): string {
  switch (name.toLowerCase()) {
    case "sans":
    case "body":
    case "serif": {
      return "body";
    }
    case "monospace":
    case "mono": {
      return "mono";
    }
    default: {
      return toFontKey([name]);
    }
  }
}

function tamaguiFontKeyFromSpec(font: Font): string {
  if (font.role) {
    return tamaguiFontKeyFromRole(font.role);
  }

  return tamaguiFontKeyFromRole(font.name);
}

/**
 * Tamagui `fonts` object key for a typography token. The DTCG token name is
 * kept as-is (`display-lg`, `heading-2xl`) so `fontFamily="$display-lg"`
 * matches the design tokens. Nested language segments use the `_` separator
 * FontLanguage expects (`typography.body.cn` → `body_cn`).
 *
 * @see https://tamagui.dev/docs/core/font-language
 */
export function typographyFontKey(path: string): string {
  const segments = stripPathPrefix(path, TYPOGRAPHY_PATH_PREFIX);
  if (segments.length === 0) {
    return "body";
  }

  const last = segments.at(-1);
  if (
    last &&
    segments.length >= 2 &&
    LANGUAGE_SUFFIX_PATTERN.test(last) &&
    !last.includes("_")
  ) {
    return `${segments.slice(0, -1).join("-")}_${last}`;
  }

  return segments.join("-");
}

function fontFamilyTokenKey(path: string): string {
  const segments = stripPathPrefix(path, FONT_FAMILY_PATH_PREFIX);
  const name = segments[0] ?? pathLeaf(path);

  return tamaguiFontKeyFromRole(name);
}

function scaleKeyFromPath(path: string, prefix: RegExp): string {
  const segments = stripPathPrefix(path, prefix);
  if (segments.length === 0) {
    return "true";
  }

  // eslint-disable-next-line regexp/no-dupe-disjunctions
  if (segments.length === 1 && /^(?:DEFAULT|default)$/i.test(segments[0]!)) {
    return "true";
  }

  return toFontKey(segments);
}

function isTypographyToken(token: FlatToken): boolean {
  return token.type === "typography" && isObject(token.value);
}

function isFontFamilyToken(token: FlatToken): boolean {
  if (
    token.category === "fontSize" ||
    token.category === "fontWeight" ||
    isFontSizeToken(token) ||
    isFontWeightToken(token) ||
    isLineHeightToken(token) ||
    isLetterSpacingToken(token)
  ) {
    return false;
  }

  if (token.type === "fontFamily") {
    return true;
  }

  return pathStartsWith(token.path, FONT_FAMILY_PATH_PREFIX);
}

function isFontSizeToken(token: FlatToken): boolean {
  return (
    token.category === "fontSize" ||
    pathStartsWith(token.path, FONT_SIZE_PATH_PREFIX)
  );
}

function isFontWeightToken(token: FlatToken): boolean {
  return (
    token.category === "fontWeight" ||
    token.type === "fontWeight" ||
    pathStartsWith(token.path, FONT_WEIGHT_PATH_PREFIX)
  );
}

function isLineHeightToken(token: FlatToken): boolean {
  return pathStartsWith(token.path, LINE_HEIGHT_PATH_PREFIX);
}

function isLetterSpacingToken(token: FlatToken): boolean {
  return pathStartsWith(token.path, LETTER_SPACING_PATH_PREFIX);
}

function uniqueFontKey(
  used: ReadonlySet<string> | ReadonlyMap<string, unknown>,
  base: string
): string {
  if (!used.has(base)) {
    return base;
  }

  let index = 2;
  let key = `${base}${index}`;
  while (used.has(key)) {
    index++;
    key = `${base}${index}`;
  }

  return key;
}

function assignSpecFonts(fonts: Fonts): Map<string, Font> {
  const assigned = new Map<string, Font>();

  for (const font of Object.values(fonts)) {
    let key = tamaguiFontKeyFromSpec(font);
    if (assigned.has(key)) {
      const fromName = toFontKey([font.name]);
      key = uniqueFontKey(assigned, fromName);
    }
    assigned.set(key, font);
  }

  return assigned;
}

function matchSpecFont(
  fonts: Fonts | undefined,
  family: string | undefined,
  aliasPath: string | undefined
): Font | undefined {
  if (!fonts) {
    return undefined;
  }

  const values = Object.values(fonts);
  if (values.length === 0) {
    return undefined;
  }

  if (aliasPath) {
    const leaf = aliasPath.split(".").filter(Boolean).at(-1);
    if (leaf) {
      const byRole = values.find(
        font =>
          font.role === leaf || font.name.toLowerCase() === leaf.toLowerCase()
      );
      if (byRole) {
        return byRole;
      }
    }
  }

  if (!family) {
    return undefined;
  }

  const native = firstFamilyName(family).toLowerCase();

  return values.find(font => {
    const name = fontFamilyName(font).toLowerCase();

    return (
      name === native ||
      font.title.toLowerCase() === native ||
      font.name.toLowerCase() === native
    );
  });
}

function renderFaceLiteral(font: LocalFont): string | undefined {
  const byWeight = new Map<string, { normal?: string; italic?: string }>();

  for (const file of font.files) {
    const weight = String(file.weight ?? 400);
    const stem = basename(file.path).replace(/\.[^.]+$/, "");
    const entry = byWeight.get(weight) ?? {};
    if (file.style === "italic" || file.style === "oblique") {
      entry.italic = stem;
    } else {
      entry.normal = stem;
    }
    byWeight.set(weight, entry);
  }

  if (byWeight.size === 0) {
    return undefined;
  }

  const lines = [...byWeight.entries()]
    .toSorted(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([weight, faces]) => {
      const parts: string[] = [];
      if (faces.normal) {
        parts.push(`normal: ${toLiteral(faces.normal)}`);
      }
      if (faces.italic) {
        parts.push(`italic: ${toLiteral(faces.italic)}`);
      }
      return `    ${weight}: { ${parts.join(", ")} }`;
    });

  return `{\n${lines.join(",\n")}\n  }`;
}

function applySpecFont(def: TamaguiFontDef, font: Font): TamaguiFontDef {
  return {
    ...def,
    webFamily: cssFontFamily(font),
    nativeFamily: fontFamilyName(font),
    face: font.source === "local" ? renderFaceLiteral(font) : def.face
  };
}

function emptyFont(key: string): TamaguiFontDef {
  return {
    key,
    webFamily: "system-ui, sans-serif",
    nativeFamily: "system-ui",
    size: {},
    lineHeight: {},
    weight: {},
    letterSpacing: {}
  };
}

function setFamily(def: TamaguiFontDef, family: string): TamaguiFontDef {
  return {
    ...def,
    webFamily: family,
    nativeFamily: firstFamilyName(family)
  };
}

const SCALE_ALIAS_PREFIX =
  /^(?:font-size|fontSize|font-weight|fontWeight|line-height|lineHeight|leading|letter-spacing|letterSpacing|tracking)$/i;

/**
 * Tamagui font scale from a single typography property. `true` is the default
 * token; a referenced DTCG leaf (`{font-size.md}` → `md`) is kept alongside it.
 */
function scaleFromTypographyValue<T>(
  value: T,
  source: unknown
): Record<string, T> {
  const scale: Record<string, T> = { true: value };
  const alias = readAliasPath(source);
  if (!alias) {
    return scale;
  }

  const key = scaleKeyFromPath(alias, SCALE_ALIAS_PREFIX);
  if (key && key !== "true") {
    scale[key] = value;
  }

  return scale;
}

function ensureSize(def: TamaguiFontDef): TamaguiFontDef {
  if (Object.keys(def.size).length > 0) {
    return def;
  }

  return { ...def, size: { ...DEFAULT_FONT_SIZE_SCALE } };
}

function applyTypography(
  def: TamaguiFontDef,
  token: FlatToken,
  byPath: Map<string, FlatToken>,
  fonts: Fonts | undefined
): TamaguiFontDef {
  if (!isObject(token.value)) {
    return def;
  }

  const rawFamily = readProperty(token.value, TYPOGRAPHY_FAMILY_KEYS);
  const familyAlias = readAliasPath(rawFamily);
  const family = familyFromValue(resolveTokenValue(rawFamily, byPath));
  const specFont = matchSpecFont(fonts, family, familyAlias);

  let next = def;
  if (specFont) {
    next = applySpecFont(next, specFont);
  } else if (family) {
    next = setFamily(next, family);
  }

  const rawSize = readProperty(token.value, TYPOGRAPHY_SIZE_KEYS);
  const fontSize = toPixelNumber(resolveTokenValue(rawSize, byPath));
  if (fontSize != null) {
    next = { ...next, size: scaleFromTypographyValue(fontSize, rawSize) };
  }

  const rawWeight = readProperty(token.value, TYPOGRAPHY_WEIGHT_KEYS);
  const weight = toWeightString(resolveTokenValue(rawWeight, byPath));
  if (weight) {
    next = { ...next, weight: scaleFromTypographyValue(weight, rawWeight) };
  }

  const rawLetterSpacing = readProperty(
    token.value,
    TYPOGRAPHY_LETTER_SPACING_KEYS
  );
  const letterSpacing = toPixelNumber(
    resolveTokenValue(rawLetterSpacing, byPath)
  );
  if (letterSpacing != null) {
    next = {
      ...next,
      letterSpacing: scaleFromTypographyValue(letterSpacing, rawLetterSpacing)
    };
  }

  const rawLineHeight = readProperty(token.value, TYPOGRAPHY_LINE_HEIGHT_KEYS);
  const lineHeight = toLineHeightPx(
    resolveTokenValue(rawLineHeight, byPath),
    next.size.true ?? fontSize
  );
  if (lineHeight != null) {
    next = {
      ...next,
      lineHeight: scaleFromTypographyValue(lineHeight, rawLineHeight)
    };
  }

  return alignFontScaleKeys(next);
}

function alignFontScaleKeys(def: TamaguiFontDef): TamaguiFontDef {
  const sizeKeys = Object.keys(def.size);
  if (sizeKeys.length === 0) {
    return def;
  }

  const fill = <T>(scale: Record<string, T>): Record<string, T> => {
    const fallback = scale.true ?? Object.values(scale)[0];
    if (fallback == null) {
      return scale;
    }

    const next = { ...scale };
    for (const key of sizeKeys) {
      next[key] ??= fallback;
    }

    return next;
  };

  return {
    ...def,
    lineHeight:
      Object.keys(def.lineHeight).length > 0
        ? fill(def.lineHeight)
        : def.lineHeight,
    weight: Object.keys(def.weight).length > 0 ? fill(def.weight) : def.weight,
    letterSpacing:
      Object.keys(def.letterSpacing).length > 0
        ? fill(def.letterSpacing)
        : def.letterSpacing
  };
}

/**
 * Build Tamagui font definitions from typography tokens, font-family tokens,
 * and `spec.fonts`. Each resulting entry is emitted via `createFont`.
 *
 * @see https://tamagui.dev/docs/core/font-language#font-tokens
 */
export function collectTamaguiFonts(
  tokens: FlatToken[],
  fonts?: Fonts
): TamaguiFontDef[] {
  const byPath = new Map(tokens.map(token => [token.path, token]));
  const defs = new Map<string, TamaguiFontDef>();

  const put = (def: TamaguiFontDef): void => {
    defs.set(def.key, def);
  };

  if (fonts) {
    for (const [key, font] of assignSpecFonts(fonts)) {
      put(applySpecFont(emptyFont(key), font));
    }
  }

  for (const token of tokens) {
    if (!isFontFamilyToken(token) || isTypographyToken(token)) {
      continue;
    }

    const key = fontFamilyTokenKey(token.path);
    const family = familyFromValue(resolveTokenValue(token.value, byPath));
    const existing = defs.get(key) ?? emptyFont(key);
    const specFont = matchSpecFont(fonts, family, token.path);
    let next = existing;
    if (specFont) {
      next = applySpecFont(next, specFont);
    } else if (family && existing.webFamily === emptyFont(key).webFamily) {
      next = setFamily(next, family);
    } else if (family && !defs.has(key)) {
      next = setFamily(next, family);
    }
    put(next);
  }

  for (const token of tokens) {
    if (!isTypographyToken(token)) {
      continue;
    }

    const key = typographyFontKey(token.path);
    const existing = defs.get(key) ?? emptyFont(key);
    put(applyTypography(existing, token, byPath, fonts));
  }

  return [...defs.values()]
    .map(ensureSize)
    .toSorted((a, b) => a.key.localeCompare(b.key));
}

function renderScaleKey(key: string): string {
  if (/^\d+$/.test(key)) {
    return key;
  }
  if (/^[A-Z_$][\w$]*$/i.test(key)) {
    return key;
  }

  return toLiteral(key);
}

function renderScale(
  values: Record<string, string | number>,
  indent = 4
): string {
  const pad = " ".repeat(indent);
  const close = " ".repeat(Math.max(indent - 2, 0));
  const entries = Object.entries(values).toSorted(([a], [b]) =>
    a.localeCompare(b, undefined, { numeric: true })
  );

  if (entries.length === 0) {
    return "{}";
  }

  const lines = entries.map(
    ([key, value]) => `${pad}${renderScaleKey(key)}: ${toLiteral(value)}`
  );

  return `{\n${lines.join(",\n")}\n${close}}`;
}

/**
 * Valid JS identifier used for the `const <name> = createFont(...)` binding.
 * Hyphenated token names (`display-lg`) become camelCase (`displayLgFont`);
 * FontLanguage keys (`body_cn`) keep the underscore.
 */
export function fontVarName(key: string, index: number): string {
  const identifier = key
    .split("-")
    .filter(Boolean)
    .map((part, partIndex) =>
      partIndex === 0 ? part : `${part.charAt(0).toUpperCase()}${part.slice(1)}`
    )
    .join("")
    .replaceAll(/[^\w$]/g, "");
  const named = `${identifier || `font${index}`}Font`;

  return /^[A-Z_$]/i.test(named) ? named : `font${index}`;
}

/**
 * Render a `createFont({ ... })` statement.
 *
 * @see https://tamagui.dev/docs/core/font-language#font-tokens
 */
export function renderCreateFont(
  font: TamaguiFontDef,
  varName: string
): string {
  const webFamily = toLiteral(font.webFamily);
  const nativeFamily = toLiteral(font.nativeFamily);

  const fields = [
    webFamily !== nativeFamily
      ? `  family: isWeb ? ${webFamily} : ${nativeFamily}`
      : `  family: ${webFamily}`,
    `  size: ${renderScale(font.size)}`
  ];

  if (Object.keys(font.lineHeight).length > 0) {
    fields.push(`  lineHeight: ${renderScale(font.lineHeight)}`);
  }
  if (Object.keys(font.weight).length > 0) {
    fields.push(`  weight: ${renderScale(font.weight)}`);
  }
  if (Object.keys(font.letterSpacing).length > 0) {
    fields.push(`  letterSpacing: ${renderScale(font.letterSpacing)}`);
  }
  if (font.face) {
    fields.push(`  face: ${font.face}`);
  }

  return `const ${varName} = createFont({\n${fields.join(",\n")}\n});`;
}
