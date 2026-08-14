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

import type { GeneratorFunctionResult } from "@power-plant/core";
import type { Schema } from "@razorwind/core/schema";
import { createDocument, toThemeCssVar } from "@razorwind/core/utils";
import { dirname, join } from "node:path";
import { flattenTokens, toCamelCaseKey } from "./flatten";
import { collectTamaguiFonts, fontVarName, renderCreateFont } from "./fonts";
import { toLiteral } from "./format";
import { renderInstallMd } from "./install";
import type {
  FlatToken,
  TamaguiAnimationDriver,
  TamaguiPluginOptions,
  TamaguiTokenCategory
} from "./types";

const LIGHT_THEME_IDS = new Set(["default", "light", "theme"]);
/** Matches core `isSharedThemeId` (`base`, `baseDimmed`, …). */
const SHARED_THEME_PATTERN = /^base(?:[A-Z]\w*|[._-].+)?$/i;
/**
 * Palette names that map onto Tamagui v5 `lightPalette` / `darkPalette`
 * (`color1`–`color12` on the base theme).
 *
 * @see https://tamagui.dev/docs/core/config-v5#base-colors-color1-12
 */
const BASE_PALETTE_NAMES = ["base", "gray", "grey", "neutral"] as const;
const TAMAGUI_PALETTE_LENGTH = 12;

const ANIMATION_IMPORTS: Record<
  Exclude<TamaguiAnimationDriver, false>,
  string
> = {
  css: "@tamagui/config/v5-css",
  rn: "@tamagui/config/v5-rn",
  reanimated: "@tamagui/config/v5-reanimated",
  motion: "@tamagui/config/v5-motion"
};

type TokenBucket = Record<string, string | number>;
type ColorScheme = "light" | "dark";

function isLightThemeId(id: string): boolean {
  return LIGHT_THEME_IDS.has(id);
}

function isDarkThemeId(id: string): boolean {
  return id === "dark";
}

/**
 * Merge shared tokens and tokens with no theme id into the light or dark scheme.
 *
 * Appearance variants (`lightDimmed`, `darkHighContrast`, …) are ignored —
 * Tamagui `createV5Theme` only has `light` and `dark` palettes.
 */
function tokensForScheme(
  tokens: FlatToken[],
  scheme: ColorScheme
): FlatToken[] {
  const byPath = new Map<string, FlatToken>();
  const match = scheme === "dark" ? isDarkThemeId : isLightThemeId;

  for (const token of tokens) {
    const id = token.theme?.toLowerCase();
    if (!id || SHARED_THEME_PATTERN.test(id)) {
      byPath.set(token.path, token);
    }
  }

  for (const token of tokens) {
    const id = token.theme?.toLowerCase();
    if (id && match(id)) {
      byPath.set(token.path, token);
    }
  }

  return [...byPath.values()];
}

/** Custom token categories that need Tamagui's `px()` helper (not size/space/radius). */
const PX_TOKEN_CATEGORIES = new Set<TamaguiTokenCategory>(["fontSize", "blur"]);

/** Categories emitted on `createTokens` after `color`. */
const CREATE_TOKEN_CATEGORIES = [
  "space",
  "size",
  "radius",
  "zIndex",
  "blur",
  "fontSize",
  "shadow",
  "insetShadow",
  "dropShadow",
  "textShadow",
  "boxShadow",
  "fontWeight"
] as const satisfies readonly TamaguiTokenCategory[];

function isPxExpression(value: string): boolean {
  return /^px\(-?\d/.test(value);
}

function bucketTokenKey(token: FlatToken): string {
  if (
    token.category === "radius" &&
    token.tokenKey?.startsWith("borderRadius")
  ) {
    const stripped = token.tokenKey.replace(/^borderRadius/, "");

    return stripped ? toCamelCaseKey([stripped]) : token.tokenKey;
  }

  return token.tokenKey ?? "";
}

function bucketTokenValue(token: FlatToken): string | number {
  if (
    token.category &&
    PX_TOKEN_CATEGORIES.has(token.category) &&
    typeof token.tamaguiValue === "number"
  ) {
    return `px(${token.tamaguiValue})`;
  }

  if (
    token.category === "dropShadow" &&
    typeof token.tamaguiValue === "string"
  ) {
    return toDropShadowFilter(token.tamaguiValue);
  }

  return token.tamaguiValue;
}

/**
 * Tamagui `filter` expects a CSS filter list. Tailwind drop-shadow tokens are
 * stored as box-shadow layers — wrap them as `drop-shadow(x y blur color)`.
 */
function toDropShadowFilter(cssBoxShadow: string): string {
  if (cssBoxShadow.includes("drop-shadow(")) {
    return cssBoxShadow;
  }

  return cssBoxShadow
    .split(",")
    .map(layer => layer.trim())
    .filter(Boolean)
    .map(layer => {
      const parts = layer.replace(/^inset\s+/i, "").split(/\s+/);
      if (parts.length >= 5) {
        const [x, y, blur] = parts;
        const color = parts.slice(4).join(" ");

        return `drop-shadow(${x} ${y} ${blur} ${color})`;
      }

      return `drop-shadow(${layer.replace(/^inset\s+/i, "")})`;
    })
    .join(" ");
}

function buildCategoryBuckets(
  tokens: FlatToken[]
): Partial<Record<TamaguiTokenCategory, TokenBucket>> {
  const buckets: Partial<Record<TamaguiTokenCategory, TokenBucket>> = {};

  for (const token of tokens) {
    if (!token.category || token.category === "color" || !token.tokenKey) {
      continue;
    }

    const key = bucketTokenKey(token);
    if (!key) {
      continue;
    }

    const bucket = buckets[token.category] ?? {};
    bucket[key] = bucketTokenValue(token);
    buckets[token.category] = bucket;
  }

  return buckets;
}

/**
 * Color entries for `createTokens({ color })` — CSS strings, not DTCG objects.
 *
 * Palette scales are prefixed by theme (`light_base1`, `dark_blue6`) so light
 * and dark can coexist. Semantic colors from the light scheme use `tokenKey`.
 *
 * @see https://tamagui.dev/docs/core/tokens
 */
function colorBucketForCreateTokens(
  lightColorTokens: FlatToken[],
  darkColorTokens: FlatToken[]
): TokenBucket {
  const bucket: TokenBucket = {};

  const put = (key: string, token: FlatToken): void => {
    const value = token.cssValue;
    if (
      typeof value !== "string" ||
      value.length === 0 ||
      isCssVarOrAlias(value) ||
      value === "[object Object]"
    ) {
      return;
    }

    bucket[key] = value;
  };

  const paletteKey = (token: FlatToken): string => {
    const stem = token.path.replace(/^color\./i, "").replaceAll(".", "");

    return token.theme ? `${token.theme}_${stem}` : stem;
  };

  for (const token of lightColorTokens) {
    if (!token.tokenKey) {
      continue;
    }
    if (token.primitive) {
      put(paletteKey(token), token);
    } else {
      put(token.tokenKey, token);
    }
  }

  for (const token of darkColorTokens) {
    if (!token.tokenKey || !token.primitive) {
      continue;
    }
    put(paletteKey(token), token);
  }

  return bucket;
}

function renderObjectLiteral(
  values: Record<string, string | number>,
  indent = 2
): string {
  const pad = " ".repeat(indent);
  const entries = Object.entries(values).toSorted(([a], [b]) =>
    a.localeCompare(b, undefined, { numeric: true })
  );

  if (entries.length === 0) {
    return "{}";
  }

  const lines = entries.map(([key, value]) => {
    const rendered =
      typeof value === "string" && isPxExpression(value)
        ? value
        : toLiteral(value);

    return `${pad}${
      /^[A-Z_$][\w$]*$/i.test(key) ? key : toLiteral(key)
    }: ${rendered}`;
  });

  return `{\n${lines.join(",\n")}\n${" ".repeat(Math.max(indent - 2, 0))}}`;
}

/**
 * Render a `getTheme` return object that spreads Tamagui's generated `theme`
 * and overlays semantic keys. Values are TypeScript expressions — typically
 * `theme.color1` / `theme.blue6` rather than CSS `var()` strings.
 *
 * @see https://tamagui.dev/docs/guides/theme-builder#gettheme
 */
function renderThemeObjectLiteral(
  values: Record<string, string>,
  indent = 2
): string {
  const pad = " ".repeat(indent);
  const close = " ".repeat(Math.max(indent - 2, 0));
  const entries = Object.entries(values).toSorted(([a], [b]) =>
    a.localeCompare(b, undefined, { numeric: true })
  );

  if (entries.length === 0) {
    return `{\n${pad}...theme\n${close}}`;
  }

  const lines = entries.map(([key, expression]) => {
    return `${pad}${
      /^[A-Z_$][\w$]*$/i.test(key) ? key : toLiteral(key)
    }: ${expression}`;
  });

  return `{\n${pad}...theme,\n${lines.join(",\n")}\n${close}}`;
}

const DTCG_ALIAS_PATTERN = /^\{([^{}]+)\}$/;
const CSS_VAR_PATTERN = /^var\((--[^),\s]+)(?:\s*,[^)]*)?\)$/;

function readAliasPath(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const match = DTCG_ALIAS_PATTERN.exec(value.trim());

  return match?.[1]?.trim();
}

function readCssVarName(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const match = CSS_VAR_PATTERN.exec(value.trim());

  return match?.[1];
}

function isCssVarOrAlias(value: unknown): boolean {
  return readAliasPath(value) != null || readCssVarName(value) != null;
}

/**
 * Follow DTCG aliases (`{color.base.1}`) and CSS `var(--…)` references to the
 * terminal token in the same scheme.
 */
function resolveAliasChain(
  token: FlatToken,
  byPath: Map<string, FlatToken>,
  byCssVar: Map<string, FlatToken>
): FlatToken {
  let current = token;
  const seen = new Set<string>();

  for (let depth = 0; depth < 8; depth++) {
    if (seen.has(current.path)) {
      return current;
    }
    seen.add(current.path);

    const aliasPath = readAliasPath(current.value);
    if (aliasPath) {
      const next = byPath.get(aliasPath);
      if (!next || next.path === current.path) {
        return current;
      }
      current = next;
      continue;
    }

    const cssVar =
      readCssVarName(current.value) ??
      readCssVarName(current.cssValue) ??
      readCssVarName(current.tamaguiValue);
    if (cssVar) {
      const next = byCssVar.get(cssVar);
      if (!next || next.path === current.path) {
        return current;
      }
      current = next;
      continue;
    }

    return current;
  }

  return current;
}

function themePropertyAccess(property: string): string {
  return /^[A-Z_$][\w$]*$/i.test(property)
    ? `theme.${property}`
    : `theme[${toLiteral(property)}]`;
}

/**
 * Map a resolved color token onto a Tamagui `theme` object key.
 *
 * Base palettes (`lightPalette` / `darkPalette`) become `color1`–`color12`.
 * Children palettes become named keys (`blue6`, `red7`, …) that `createV5Theme`
 * spreads onto the generated theme extras.
 */
function themePropertyForToken(
  token: FlatToken,
  basePaletteName: string | undefined,
  scales: Record<string, Record<string, string>>
): string | undefined {
  const parsed = parseScaleToken(token);
  if (!parsed) {
    return undefined;
  }

  if (
    basePaletteName &&
    parsed.name.toLowerCase() === basePaletteName.toLowerCase()
  ) {
    return `color${parsed.step}`;
  }

  if (scales[parsed.name]) {
    return `${parsed.name}${parsed.step}`;
  }

  return undefined;
}

/**
 * Normalize a palette step number.
 *
 * Accepts 1–12 directly, or 100–900 (mapped to 1–9).
 */
function normalizePaletteStep(raw: number): number | undefined {
  if (raw >= 1 && raw <= 12) {
    return raw;
  }
  if (raw >= 100 && raw <= 900 && raw % 100 === 0) {
    return raw / 100;
  }
  return undefined;
}

function parseScaleToken(
  token: FlatToken
): { name: string; step: number } | undefined {
  const segments = token.path.split(".").filter(Boolean);
  const leaf = segments.at(-1);
  if (leaf && /^\d+$/.test(leaf)) {
    const step = normalizePaletteStep(Number(leaf));
    const rawName = segments.at(-2);
    if (
      step != null &&
      rawName &&
      !/^(?:color|colours?|palette)$/i.test(rawName)
    ) {
      return { name: toCamelCaseKey([rawName]), step };
    }
  }

  if (!token.tokenKey) {
    return undefined;
  }

  const match = /^([A-Z]+)(\d{1,3})$/i.exec(token.tokenKey);
  if (!match) {
    return undefined;
  }

  const [, name = "", stepRaw = ""] = match;
  const step = normalizePaletteStep(Number(stepRaw));
  if (step == null) {
    return undefined;
  }

  return { name, step };
}

function addScaleStep(
  scales: Record<string, Record<string, string>>,
  name: string,
  step: number,
  value: string
): void {
  const scale = scales[name] ?? {};
  scale[`${name}${step}`] = value;
  scales[name] = scale;
}

function collectNumberedColorScales(
  colorTokens: FlatToken[]
): Record<string, Record<string, string>> {
  const scales: Record<string, Record<string, string>> = {};

  for (const token of colorTokens) {
    if (typeof token.tamaguiValue !== "string") {
      continue;
    }

    const parsed = parseScaleToken(token);
    if (!parsed) {
      continue;
    }

    addScaleStep(scales, parsed.name, parsed.step, token.tamaguiValue);
  }

  return Object.fromEntries(
    Object.entries(scales).filter(([, steps]) => Object.keys(steps).length >= 3)
  );
}

/**
 * Collect color palettes for Tamagui `childrenThemes`.
 *
 * Groups marked `palette: true` (or `$type: "palette"`) win. When none are
 * marked, numbered 1–12 (or 100–900) scales are used as a fallback.
 */
export function collectColorScales(
  colorTokens: FlatToken[]
): Record<string, Record<string, string>> {
  const indicated: Record<string, Record<string, string>> = {};

  for (const token of colorTokens) {
    if (!token.primitive || typeof token.tamaguiValue !== "string") {
      continue;
    }

    const parsed = parseScaleToken(token);
    if (!parsed) {
      continue;
    }

    addScaleStep(indicated, parsed.name, parsed.step, token.tamaguiValue);
  }

  const indicatedScales = Object.fromEntries(
    Object.entries(indicated).filter(
      ([, steps]) => Object.keys(steps).length >= 2
    )
  );

  if (Object.keys(indicatedScales).length > 0) {
    return indicatedScales;
  }

  return collectNumberedColorScales(colorTokens);
}

/**
 * Tamagui v5 palettes: light runs lightest → darkest, dark runs darkest →
 * lightest (`color1`–`color12`).
 *
 * @see https://tamagui.dev/docs/core/config-v5#base-colors-color1-12
 */
export function orderPaletteForScheme(
  values: readonly string[],
  scheme: ColorScheme
): string[] {
  if (values.length < 2) {
    return [...values];
  }

  const first = colorLightness(values[0]!);
  const last = colorLightness(values[values.length - 1]!);
  if (first == null || last == null || first === last) {
    return [...values];
  }

  const lightestFirst = first > last;
  if (scheme === "light") {
    return lightestFirst ? [...values] : values.toReversed();
  }

  return lightestFirst ? values.toReversed() : [...values];
}

function srgbToLinear(channel: number): number {
  return channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4;
}

function hexLightness(color: string): number | undefined {
  let hex = color.startsWith("#") ? color.slice(1) : "";
  if (hex.length === 3 || hex.length === 4) {
    hex = [...hex].map(char => char + char).join("");
  }
  if (hex.length === 8) {
    hex = hex.slice(0, 6);
  }
  if (hex.length !== 6 || /[^0-9a-f]/i.test(hex)) {
    return undefined;
  }

  const r = Number.parseInt(hex.slice(0, 2), 16) / 255;
  const g = Number.parseInt(hex.slice(2, 4), 16) / 255;
  const b = Number.parseInt(hex.slice(4, 6), 16) / 255;

  return (
    0.2126 * srgbToLinear(r) +
    0.7152 * srgbToLinear(g) +
    0.0722 * srgbToLinear(b)
  );
}

function parseComponent(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (trimmed.endsWith("%")) {
    const percent = Number.parseFloat(trimmed);

    return Number.isFinite(percent) ? percent / 100 : undefined;
  }

  const value = Number.parseFloat(trimmed);

  return Number.isFinite(value) ? value : undefined;
}

function normalizeLightness(value: number): number {
  return value > 1 ? value / 100 : value;
}

function functionalColorArgs(color: string, fn: string): string[] | undefined {
  const match = new RegExp(`^${fn}\\((.+)\\)$`, "i").exec(color.trim());
  if (!match?.[1]) {
    return undefined;
  }

  return match[1].split(/[\s,/]+/).filter(Boolean);
}

/**
 * Approximate perceptual lightness (0–1) for hex, rgb, hsl, and oklch colors.
 * CSS variables and unresolved aliases return `undefined`.
 */
export function colorLightness(color: string): number | undefined {
  const value = color.trim();
  if (!value || value.startsWith("var(") || value.includes("{")) {
    return undefined;
  }

  const hex = hexLightness(value);
  if (hex != null) {
    return hex;
  }

  const oklch = functionalColorArgs(value, "oklch");
  if (oklch?.[0]) {
    const lightness = parseComponent(oklch[0]);
    if (lightness == null) {
      return undefined;
    }

    return normalizeLightness(lightness);
  }

  const hsl = functionalColorArgs(value, "hsla?");
  if (hsl?.[2]) {
    const lightness = parseComponent(hsl[2]);
    if (lightness == null) {
      return undefined;
    }

    return normalizeLightness(lightness);
  }

  const rgb = functionalColorArgs(value, "rgba?");
  if (rgb?.[0] && rgb[1] && rgb[2]) {
    const r = parseComponent(rgb[0]);
    const g = parseComponent(rgb[1]);
    const b = parseComponent(rgb[2]);
    if (r == null || g == null || b == null) {
      return undefined;
    }

    const toChannel = (component: number, raw: string): number =>
      raw.trim().endsWith("%") || component <= 1 ? component : component / 255;

    return (
      0.2126 * srgbToLinear(toChannel(r, rgb[0])) +
      0.7152 * srgbToLinear(toChannel(g, rgb[1])) +
      0.0722 * srgbToLinear(toChannel(b, rgb[2]))
    );
  }

  return undefined;
}

function orderedScaleEntries(
  scale: Record<string, string>,
  name: string
): Array<[number, string]> {
  const entries: Array<[number, string]> = [];
  const prefix = name.toLowerCase();

  for (const [key, value] of Object.entries(scale)) {
    if (!key.toLowerCase().startsWith(prefix)) {
      continue;
    }

    const rest = key.slice(name.length);
    if (!/^\d+$/.test(rest)) {
      continue;
    }

    entries.push([Number(rest), value]);
  }

  entries.sort(([a], [b]) => a - b);
  return entries;
}

function orderScaleForScheme(
  scale: Record<string, string>,
  name: string,
  scheme: ColorScheme
): Record<string, string> {
  const entries = orderedScaleEntries(scale, name);
  if (entries.length === 0) {
    return scale;
  }

  const ordered = orderPaletteForScheme(
    entries.map(([, value]) => value),
    scheme
  );
  const result: Record<string, string> = {};
  for (const [index, [step]] of entries.entries()) {
    result[`${name}${step}`] = ordered[index] ?? entries[index]![1];
  }

  return result;
}

/**
 * Tamagui v5 base palettes are 12 colors (`color1`–`color12`). Shorter
 * Razorwind scales are padded with the last stop so template indices stay valid.
 */
function padPalette(values: string[]): string[] {
  if (values.length >= TAMAGUI_PALETTE_LENGTH) {
    return values.slice(0, TAMAGUI_PALETTE_LENGTH);
  }

  const padded = [...values];
  const last = padded.at(-1);
  if (last == null) {
    return padded;
  }

  while (padded.length < TAMAGUI_PALETTE_LENGTH) {
    padded.push(last);
  }

  return padded;
}

function paletteFromScale(
  scale: Record<string, string>,
  name: string,
  scheme: ColorScheme
): string[] | undefined {
  const entries = orderedScaleEntries(scale, name);
  if (entries.length < 2) {
    return undefined;
  }

  return padPalette(
    orderPaletteForScheme(
      entries.map(([, value]) => value),
      scheme
    )
  );
}

function pickBasePalette(
  scales: Record<string, Record<string, string>>,
  scheme: ColorScheme
): { name: string; palette: string[] } | undefined {
  const byLower = new Map(
    Object.entries(scales).map(([name, scale]) => [
      name.toLowerCase(),
      { name, scale }
    ])
  );

  for (const candidate of BASE_PALETTE_NAMES) {
    const match = byLower.get(candidate);
    if (!match) {
      continue;
    }

    const palette = paletteFromScale(match.scale, match.name, scheme);
    if (palette) {
      return { name: match.name, palette };
    }
  }

  return undefined;
}

function resolveBasePalettes(tokens: FlatToken[]): {
  lightPalette?: string[];
  darkPalette?: string[];
  lightBaseName?: string;
  darkBaseName?: string;
} {
  const colors = tokens.filter(
    token => token.category === "color" || token.primitive
  );
  const lightScales = collectColorScales(tokensForScheme(colors, "light"));
  const darkScales = collectColorScales(tokensForScheme(colors, "dark"));
  const light = pickBasePalette(lightScales, "light");
  const dark = pickBasePalette(darkScales, "dark");

  return {
    lightPalette: light?.palette,
    darkPalette: dark?.palette,
    lightBaseName: light?.name,
    darkBaseName: dark?.name
  };
}

/**
 * Semantic color extras for `createV5Theme({ getTheme })`.
 *
 * Palette aliases become `theme.colorN` / `theme.blueN` accesses on the object
 * Tamagui passes into `getTheme`. Direct hex colors stay as string literals.
 * CSS `var()` strings are never emitted — they are not valid Tamagui theme
 * values.
 *
 * @see https://tamagui.dev/docs/guides/theme-builder#gettheme
 */
function semanticColorsForTheme(
  tokens: FlatToken[],
  basePaletteName: string | undefined
): Record<string, string> {
  const scales = collectColorScales(tokens);
  const byPath = new Map(tokens.map(token => [token.path, token]));
  const byCssVar = new Map(
    tokens.map(token => [toThemeCssVar(token.path), token])
  );
  const semantic: Record<string, string> = {};

  for (const token of tokens) {
    if (token.category !== "color" || !token.tokenKey) {
      continue;
    }

    // Skip palette / stepped scale keys — those go to childrenThemes / palettes.
    if (token.primitive) {
      continue;
    }
    if (/^[A-Z]+\d{1,3}$/i.test(token.tokenKey)) {
      const scaleName = token.tokenKey.replace(/\d{1,3}$/, "");
      if (scales[scaleName]) {
        continue;
      }
    }

    const resolved = resolveAliasChain(token, byPath, byCssVar);
    const property = themePropertyForToken(resolved, basePaletteName, scales);
    if (property) {
      semantic[token.tokenKey] = themePropertyAccess(property);
      continue;
    }

    const literal = resolved.tamaguiValue;
    if (isCssVarOrAlias(literal) || isCssVarOrAlias(resolved.cssValue)) {
      continue;
    }
    if (typeof literal === "string" || typeof literal === "number") {
      semantic[token.tokenKey] = toLiteral(literal);
    }
  }

  return semantic;
}

function renderChildrenThemes(
  lightScales: Record<string, Record<string, string>>,
  darkScales: Record<string, Record<string, string>>
): string | undefined {
  const names = new Set([
    ...Object.keys(lightScales),
    ...Object.keys(darkScales)
  ]);

  if (names.size === 0) {
    return undefined;
  }

  const blocks: string[] = [];
  for (const name of [...names].toSorted((a, b) => a.localeCompare(b))) {
    const light = orderScaleForScheme(
      lightScales[name] ?? darkScales[name] ?? {},
      name,
      "light"
    );
    const dark = orderScaleForScheme(
      darkScales[name] ?? lightScales[name] ?? {},
      name,
      "dark"
    );
    if (Object.keys(light).length === 0 || Object.keys(dark).length === 0) {
      continue;
    }

    blocks.push(`    ${name}: {
      light: ${renderObjectLiteral(light, 8)},
      dark: ${renderObjectLiteral(dark, 8)}
    }`);
  }

  if (blocks.length === 0) {
    return undefined;
  }

  return `{\n${blocks.join(",\n")}\n  }`;
}

function collectReferencedThemeKeys(
  semantics: Record<string, string>[]
): string[] {
  const keys = new Set<string>();

  for (const semantic of semantics) {
    for (const expression of Object.values(semantic)) {
      for (const match of expression.matchAll(/theme\.([A-Z_$][\w$]*)/gi)) {
        if (match[1]) {
          keys.add(match[1]);
        }
      }

      for (const match of expression.matchAll(/theme\[(['"])(.+?)\1\]/g)) {
        keys.add(match[2]!);
      }
    }
  }

  return [...keys];
}

function collectChildrenThemeKeys(
  lightScales: Record<string, Record<string, string>>,
  darkScales: Record<string, Record<string, string>>
): string[] {
  const keys = new Set<string>();

  for (const scales of [lightScales, darkScales]) {
    for (const scale of Object.values(scales)) {
      for (const key of Object.keys(scale)) {
        keys.add(key);
      }
    }
  }

  return [...keys];
}

function collectBasePaletteThemeKeys(
  lightPalette?: string[],
  darkPalette?: string[]
): string[] {
  const paletteLength = Math.max(
    lightPalette?.length ?? 0,
    darkPalette?.length ?? 0
  );
  if (paletteLength === 0) {
    return [];
  }

  const keys: string[] = [];
  for (
    let step = 1;
    step <= Math.min(paletteLength, TAMAGUI_PALETTE_LENGTH);
    step++
  ) {
    keys.push(`color${step}`);
  }

  return keys;
}

/**
 * Collect theme keys from flattened token output — palettes, child scales, and
 * semantic aliases that `createV5Theme({ getTheme })` maps onto the theme object.
 */
function collectAppThemeKeys(options: {
  lightSemantic: Record<string, string>;
  darkSemantic: Record<string, string>;
  lightScales: Record<string, Record<string, string>>;
  darkScales: Record<string, Record<string, string>>;
  lightPalette?: string[];
  darkPalette?: string[];
}): string[] {
  const keys = new Set<string>();

  for (const key of Object.keys(options.lightSemantic)) {
    keys.add(key);
  }
  for (const key of Object.keys(options.darkSemantic)) {
    keys.add(key);
  }
  for (const key of collectReferencedThemeKeys([
    options.lightSemantic,
    options.darkSemantic
  ])) {
    keys.add(key);
  }
  for (const key of collectChildrenThemeKeys(
    options.lightScales,
    options.darkScales
  )) {
    keys.add(key);
  }
  for (const key of collectBasePaletteThemeKeys(
    options.lightPalette,
    options.darkPalette
  )) {
    keys.add(key);
  }

  return [...keys].toSorted((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  );
}

function renderThemeInterfaceProperty(key: string): string {
  const renderedKey = /^[A-Z_$][\w$]*$/i.test(key) ? key : toLiteral(key);

  return `  ${renderedKey}: string;`;
}

function renderThemeInterface(
  keys: string[],
  options: { specName?: string }
): string[] | undefined {
  if (keys.length === 0) {
    return undefined;
  }

  return [
    "/**",
    ` * Theme values available on \`useTheme()\` and \`$\` style props for the ${options.specName || "design system"}.`,
    " *",
    " * Derived from design tokens mapped by \`createV5Theme\` and \`getTheme\`.",
    " *",
    " * @see https://tamagui.dev/docs/guides/theme-builder#gettheme",
    " */",
    "export interface AppTheme {",
    ...keys.map(renderThemeInterfaceProperty),
    "}",
    ""
  ];
}

/**
 * Render a Tamagui v5 config module from flattened design tokens.
 *
 * Light and dark token sets are combined into one `createV5Theme` call.
 * Typography and font-family tokens are emitted as `createFont` entries.
 *
 * @see https://tamagui.dev/docs/core/config-v5
 * @see https://tamagui.dev/docs/core/font-language#font-tokens
 */
export function renderTamaguiConfig(
  spec: Schema,
  tokens: FlatToken[],
  options: TamaguiPluginOptions = {}
): string {
  const fonts = spec.fonts ?? {};
  const useDefaultConfig = options.useDefaultConfig !== false;
  const animations = options.animations ?? "css";
  const includeTypeAugmentation = options.includeTypeAugmentation !== false;

  const colorTokens = tokens.filter(token => token.category === "color");
  const lightColorTokens = tokensForScheme(colorTokens, "light");
  const darkColorTokens = tokensForScheme(colorTokens, "dark");

  const lightScales = collectColorScales(lightColorTokens);
  const darkScales = collectColorScales(
    darkColorTokens.length > 0 ? darkColorTokens : lightColorTokens
  );
  const { lightPalette, darkPalette, lightBaseName, darkBaseName } =
    resolveBasePalettes(tokens);
  const childrenThemes = renderChildrenThemes(lightScales, darkScales);

  const lightSemantic = semanticColorsForTheme(lightColorTokens, lightBaseName);
  const darkSemantic = semanticColorsForTheme(
    darkColorTokens.length > 0 ? darkColorTokens : lightColorTokens,
    darkColorTokens.length > 0 ? darkBaseName : lightBaseName
  );
  const appThemeKeys = collectAppThemeKeys({
    lightSemantic,
    darkSemantic,
    lightScales,
    darkScales,
    lightPalette,
    darkPalette
  });
  const themeInterfaceLines = renderThemeInterface(appThemeKeys, {
    specName: spec.name
  });

  const buckets = buildCategoryBuckets(tokensForScheme(tokens, "light"));
  const colorBucket = colorBucketForCreateTokens(
    lightColorTokens,
    darkColorTokens
  );
  const createTokensArgs: string[] = [];
  if (Object.keys(colorBucket).length > 0) {
    createTokensArgs.push(`  color: ${renderObjectLiteral(colorBucket, 4)}`);
  }

  for (const category of CREATE_TOKEN_CATEGORIES) {
    const bucket = buckets[category];
    if (bucket && Object.keys(bucket).length > 0) {
      createTokensArgs.push(`  ${category}: ${renderObjectLiteral(bucket, 4)}`);
    }
  }

  const themeOptions: string[] = [];
  if (lightPalette) {
    themeOptions.push(`  lightPalette: ${toLiteral(lightPalette)}`);
  }

  if (darkPalette) {
    themeOptions.push(`  darkPalette: ${toLiteral(darkPalette)}`);
  }

  if (childrenThemes) {
    themeOptions.push(`  childrenThemes: ${childrenThemes}`);
  }

  if (
    Object.keys(lightSemantic).length > 0 ||
    Object.keys(darkSemantic).length > 0
  ) {
    themeOptions.push(`  getTheme: ({ theme, scheme }: { theme: any; scheme: "light" | "dark" }) => {
    return scheme === "dark"
      ? ${renderThemeObjectLiteral(darkSemantic, 8)}
      : ${renderThemeObjectLiteral(lightSemantic, 8)};
  }`);
  }

  const imports: string[] = ["import { isWeb } from '@tamagui/constants';"];
  if (useDefaultConfig) {
    imports.push(
      `import { createV5Theme, defaultConfig, type CreateV5ThemeOptions } from "@tamagui/config/v5";`
    );
  } else {
    imports.push(
      `import { createV5Theme, type CreateV5ThemeOptions } from "@tamagui/config/v5";`
    );
  }

  if (animations !== false) {
    imports.push(
      `import { animations } from "${ANIMATION_IMPORTS[animations]}";`
    );
  }

  if (options.importConfig) {
    imports.push(`import userConfig from "${options.importConfig}";`);
  }

  const tamaguiImports = ["createTamagui", "px"];
  if (createTokensArgs.length > 0) {
    tamaguiImports.push("createTokens");
  }
  const assignedFonts = collectTamaguiFonts(
    tokensForScheme(tokens, "light"),
    fonts
  );
  if (assignedFonts.length > 0) {
    tamaguiImports.push("createFont");
  }
  imports.push(`import { ${tamaguiImports.join(", ")} } from "@tamagui/core";`);

  const lines: string[] = [
    "/* eslint-disable */",
    "",
    "/*",
    " * Generated by @razorwind/tamagui — Do not edit by hand.",
    ` * `,
    " * @see https://tamagui.dev/docs/core/config-v5",
    " */",
    "",
    ...imports,
    ""
  ];

  if (createTokensArgs.length > 0) {
    lines.push(
      `const tokens = createTokens({`,
      createTokensArgs.join(",\n"),
      `});`,
      ""
    );
  }

  const themeCall =
    themeOptions.length > 0
      ? `createV5Theme({\n${themeOptions.join(",\n")}\n})`
      : `createV5Theme()`;

  lines.push(`const themes = ${themeCall};`, "");

  const fontVarNames = new Map<string, string>();
  if (assignedFonts.length > 0) {
    for (const [index, font] of assignedFonts.entries()) {
      const varName = fontVarName(font.key, index);
      fontVarNames.set(font.key, varName);
      lines.push(renderCreateFont(font, varName), "");
    }
  }

  const configParts: string[] = [];
  if (useDefaultConfig) {
    configParts.push("  ...defaultConfig");
  }

  if (animations !== false) {
    configParts.push("  animations");
  }

  if (createTokensArgs.length > 0) {
    if (useDefaultConfig) {
      configParts.push(`  tokens: {
    ...defaultConfig.tokens,
    ...tokens,
    space: {
      ...defaultConfig.tokens.space,
      ...tokens.space
    },
    size: {
      ...defaultConfig.tokens.size,
      ...tokens.size
    },
    radius: {
      ...defaultConfig.tokens.radius,
      ...tokens.radius
    },
    zIndex: {
      ...defaultConfig.tokens.zIndex,
      ...tokens.zIndex
    }
  }`);
    } else {
      configParts.push("  tokens");
    }
  }
  configParts.push("  themes");

  if (fontVarNames.size > 0) {
    const fontLines = [...fontVarNames.entries()].map(([key, varName]) => {
      const renderedKey = /^[A-Z_$][\w$]*$/i.test(key) ? key : toLiteral(key);

      return `    ${renderedKey}: ${varName}`;
    });
    if (useDefaultConfig) {
      configParts.push(`  fonts: {
    ...defaultConfig.fonts,
${fontLines.join(",\n")}
  }`);
    } else {
      configParts.push(`  fonts: {
${fontLines.join(",\n")}
  }`);
    }
  }

  if (options.shorthands) {
    configParts.push(
      `  shorthands: ${renderObjectLiteral(options.shorthands, 4)}`
    );
  }

  if (options.media) {
    configParts.push(`  media: ${toLiteral(options.media)}`);
  }

  if (options.defaultFont) {
    configParts.push(`  defaultFont: ${toLiteral(options.defaultFont)}`);
  }

  lines.push(
    "",
    ...(themeInterfaceLines ?? []),
    `/**
 * The Tamagui v5 config for the ${spec.name || "design system"}.
 *
 * @see https://tamagui.dev/docs/core/config-v5
 */
export const config = createTamagui({`,
    configParts.join(",\n"),
    options.importConfig ? `, ...userConfig ` : "",
    `});`,
    "",
    `export type AppConfig = typeof config;`,
    ""
  );

  if (includeTypeAugmentation) {
    lines.push(
      `declare module "@tamagui/core" {`,
      `  // eslint-disable-next-line @typescript-eslint/no-empty-object-type`,
      `  interface TamaguiCustomConfig extends AppConfig {}`,
      `}`,
      ""
    );
  }

  lines.push(`export default config;`, "");

  return lines.join("\n");
}

export { renderInstallMd };

/**
 * Generate a Tamagui v5 config file from a Razorwind schema.
 */
export function generateTamaguiConfig(
  spec: Schema,
  options: TamaguiPluginOptions = {}
): GeneratorFunctionResult<Schema, TamaguiPluginOptions> {
  const hasTokens = spec.tokens && Object.keys(spec.tokens).length > 0;
  const hasFonts = spec.fonts && Object.keys(spec.fonts).length > 0;
  if (!hasTokens && !hasFonts) {
    return {};
  }

  const flat = hasTokens ? flattenTokens(spec.tokens, options) : [];
  if (flat.length === 0 && !hasFonts) {
    return {};
  }

  const outputPath = options.outputPath ?? "tamagui.config.ts";
  const content = renderTamaguiConfig(spec, flat, options);
  const installBody = options.installGuide ?? renderInstallMd({ outputPath });
  const installPath = join(dirname(outputPath), "INSTALL.md");

  return {
    [outputPath]: createDocument<Schema, TamaguiPluginOptions>(
      outputPath,
      content,
      { name: "razorwind-tamagui" },
      false,
      "typescript"
    ),
    [installPath]: createDocument<Schema, TamaguiPluginOptions>(
      installPath,
      installBody,
      { name: "razorwind-tamagui" },
      false,
      "markdown"
    )
  };
}
