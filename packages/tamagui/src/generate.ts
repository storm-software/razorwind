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
/** DTCG `ring.*` shadows — themed via `getTheme`, not static `createTokens`. */
const RING_PATH_PATTERN = /^ring(?:\.|$)/i;
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

function isRingToken(token: FlatToken): boolean {
  return RING_PATH_PATTERN.test(token.path) && token.category === "shadow";
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

/**
 * Terminal `createTokens` value after following DTCG / `var()` aliases.
 *
 * Semantic radius tokens (`{border-radius.lg}`) must resolve to the primitive
 * number — unresolved `{…}` / `var()` strings are omitted from the bucket.
 */
function bucketTokenValue(
  token: FlatToken,
  lookups: TokenLookups
): string | number {
  const terminal = resolveAliasChain(token, lookups.byPath, lookups.byCssVar);
  const tamaguiValue = terminal.tamaguiValue;

  if (
    token.category &&
    PX_TOKEN_CATEGORIES.has(token.category) &&
    typeof tamaguiValue === "number"
  ) {
    return `px(${tamaguiValue})`;
  }

  if (typeof tamaguiValue === "string") {
    const resolved = resolveCssReferencesInValue(tamaguiValue, lookups);
    if (token.category === "dropShadow") {
      return toDropShadowFilter(resolved);
    }

    return resolved;
  }

  return tamaguiValue;
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
  const lookups = tokenLookups(tokens);

  for (const token of tokens) {
    if (
      !token.category ||
      token.category === "color" ||
      !token.tokenKey ||
      isRingToken(token)
    ) {
      continue;
    }

    const key = bucketTokenKey(token);
    if (!key) {
      continue;
    }

    const value = bucketTokenValue(token, lookups);
    if (typeof value === "string" && containsCssVarOrAlias(value)) {
      continue;
    }

    const bucket = buckets[token.category] ?? {};
    bucket[key] = value;
    buckets[token.category] = bucket;
  }

  return buckets;
}

/**
 * `createTokens({ color })` key for a color token.
 *
 * Light/dark tokens are prefixed (`lightBlue1`, `darkForegroundDanger`) so both
 * schemes can coexist in one bucket. Tokens without a scheme keep `tokenKey`.
 */
function paletteTokenKey(token: FlatToken): string {
  const stem =
    token.tokenKey ?? token.path.replace(/^color\./i, "").replaceAll(".", "");

  return token.theme
    ? `${token.theme}${stem[0]?.toUpperCase() ?? ""}${stem.slice(1)}`
    : stem;
}

function tokenColorRef(tokenKey: string): string {
  return `tokens.color.${tokenKey}.val`;
}

/**
 * Color entries for `createTokens({ color })` — CSS strings, not DTCG objects.
 *
 * Primitive palettes and semantic colors both use {@link paletteTokenKey}.
 * DTCG aliases / CSS `var()` values are resolved to concrete colors so
 * `createV5Theme` can reference `tokens.color.<name>.val`.
 *
 * @see https://tamagui.dev/docs/core/tokens
 */
function colorBucketForCreateTokens(
  lightColorTokens: FlatToken[],
  darkColorTokens: FlatToken[]
): TokenBucket {
  const bucket: TokenBucket = {};
  const lightLookups = tokenLookups(lightColorTokens);
  const darkLookups = tokenLookups(darkColorTokens);

  const put = (token: FlatToken, lookups: TokenLookups): void => {
    if (!token.tokenKey) {
      return;
    }

    const value = resolvedColorLiteral(token, lookups);
    if (
      typeof value !== "string" ||
      value.length === 0 ||
      value === "[object Object]"
    ) {
      return;
    }

    bucket[paletteTokenKey(token)] = value;
  };

  for (const token of lightColorTokens) {
    put(token, lightLookups);
  }

  for (const token of darkColorTokens) {
    put(token, darkLookups);
  }

  return bucket;
}

function collectPaletteTokenKeys(
  colorTokens: FlatToken[]
): Record<string, Record<string, string>> {
  const indicated: Record<string, Record<string, string>> = {};

  for (const token of colorTokens) {
    if (!token.primitive) {
      continue;
    }

    const parsed = parseScaleToken(token);
    if (!parsed) {
      continue;
    }

    const bucketKey = paletteTokenKey(token);
    if (!bucketKey) {
      continue;
    }

    const scale = indicated[parsed.name] ?? {};
    scale[`${parsed.name}${parsed.step}`] = bucketKey;
    indicated[parsed.name] = scale;
  }

  const indicatedScales = Object.fromEntries(
    Object.entries(indicated).filter(
      ([, steps]) => Object.keys(steps).length >= 2
    )
  );

  if (Object.keys(indicatedScales).length > 0) {
    return indicatedScales;
  }

  const fallback: Record<string, Record<string, string>> = {};
  for (const token of colorTokens) {
    const parsed = parseScaleToken(token);
    if (!parsed) {
      continue;
    }

    const bucketKey = token.tokenKey ?? paletteTokenKey(token);
    if (!bucketKey) {
      continue;
    }

    const scale = fallback[parsed.name] ?? {};
    scale[`${parsed.name}${parsed.step}`] = bucketKey;
    fallback[parsed.name] = scale;
  }

  return Object.fromEntries(
    Object.entries(fallback).filter(
      ([, steps]) => Object.keys(steps).length >= 3
    )
  );
}

function bucketValueMatchesToken(
  token: FlatToken,
  lookups: TokenLookups,
  colorBucket: Readonly<Record<string, string | number>>,
  bucketKey: string
): boolean {
  const bucketValue = colorBucket[bucketKey];
  if (typeof bucketValue !== "string") {
    return false;
  }

  const literal = resolvedColorLiteral(token, lookups);

  return literal != null && literal === bucketValue;
}

/**
 * `tokens.color.*` when the token (or its resolved alias) is in the color bucket;
 * otherwise a concrete color literal for `createV5Theme` extras.
 */
function resolveColorTokenReference(
  token: FlatToken,
  lookups: TokenLookups,
  colorBucket: Readonly<Record<string, string | number>>
): string | undefined {
  const ownKey = paletteTokenKey(token);
  if (bucketValueMatchesToken(token, lookups, colorBucket, ownKey)) {
    return tokenColorRef(ownKey);
  }

  if (
    token.tokenKey &&
    token.tokenKey !== ownKey &&
    bucketValueMatchesToken(token, lookups, colorBucket, token.tokenKey)
  ) {
    return tokenColorRef(token.tokenKey);
  }

  const resolved = resolveAliasChain(token, lookups.byPath, lookups.byCssVar);
  const resolvedKey = paletteTokenKey(resolved);
  if (
    resolvedKey !== ownKey &&
    bucketValueMatchesToken(token, lookups, colorBucket, resolvedKey)
  ) {
    return tokenColorRef(resolvedKey);
  }

  if (
    resolved.tokenKey &&
    resolved.tokenKey !== resolvedKey &&
    bucketValueMatchesToken(token, lookups, colorBucket, resolved.tokenKey)
  ) {
    return tokenColorRef(resolved.tokenKey);
  }

  if (resolved.primitive) {
    const paletteKey = paletteTokenKey(resolved);
    if (bucketValueMatchesToken(token, lookups, colorBucket, paletteKey)) {
      return tokenColorRef(paletteKey);
    }
  }

  const literal = resolvedColorLiteral(token, lookups);
  if (literal) {
    return toLiteral(literal);
  }

  return undefined;
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
 * Render a config object whose values are already TypeScript expressions
 * (`tokens.color.blue1.val`, `theme.color1`, …) rather than raw literals.
 */
function renderConfigObjectLiteral(
  values: Record<string, string>,
  indent = 2
): string {
  const pad = " ".repeat(indent);
  const entries = Object.entries(values).toSorted(([a], [b]) =>
    a.localeCompare(b, undefined, { numeric: true })
  );

  if (entries.length === 0) {
    return "{}";
  }

  const lines = entries.map(([key, expression]) => {
    return `${pad}${
      /^[A-Z_$][\w$]*$/i.test(key) ? key : toLiteral(key)
    }: ${expression}`;
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
const DTCG_ALIAS_GLOBAL_PATTERN = /\{([^{}]+)\}/g;
const CSS_VAR_PATTERN = /^var\((--[^),\s]+)(?:\s*,[^)]*)?\)$/;
const CSS_VAR_GLOBAL_PATTERN = /var\((--[^),\s]+)(?:\s*,[^)]*)?\)/g;

interface TokenLookups {
  byPath: Map<string, FlatToken>;
  byCssVar: Map<string, FlatToken>;
}

function tokenLookups(tokens: FlatToken[]): TokenLookups {
  return {
    byPath: new Map(tokens.map(token => [token.path, token])),
    byCssVar: new Map(tokens.map(token => [toThemeCssVar(token.path), token]))
  };
}

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

function containsCssVarOrAlias(value: string): boolean {
  return /var\(|\{[^{}]+\}/.test(value);
}

/**
 * Terminal CSS color string for a token after following DTCG / `var()` aliases.
 * Returns `undefined` when the chain still ends on a reference.
 */
function resolvedColorLiteral(
  token: FlatToken,
  lookups: TokenLookups
): string | undefined {
  const resolved = resolveAliasChain(token, lookups.byPath, lookups.byCssVar);
  if (resolved.category != null && resolved.category !== "color") {
    return undefined;
  }

  const candidates = [resolved.cssValue, resolved.tamaguiValue];
  for (const candidate of candidates) {
    if (
      typeof candidate === "string" &&
      candidate.length > 0 &&
      !isCssVarOrAlias(candidate)
    ) {
      return candidate;
    }
  }

  return undefined;
}

/**
 * Replace DTCG aliases and CSS `var(--…)` references in a CSS string with
 * resolved color constants (hex / oklch / rgb).
 *
 * Shadow / ring tokens store `{color.border.accent}` as `var(--color-border-accent)`
 * after flatten — Tamagui `createTokens` needs the concrete color instead.
 */
function resolveCssReferencesInValue(
  value: string,
  lookups: TokenLookups
): string {
  const replaceAlias = (match: string, tokenPath: string): string => {
    const next = lookups.byPath.get(tokenPath.trim());
    if (!next) {
      return match;
    }

    return resolvedColorLiteral(next, lookups) ?? match;
  };

  const replaceCssVar = (match: string, cssVar: string): string => {
    const next = lookups.byCssVar.get(cssVar);
    if (!next) {
      return match;
    }

    return resolvedColorLiteral(next, lookups) ?? match;
  };

  return value
    .replace(DTCG_ALIAS_GLOBAL_PATTERN, replaceAlias)
    .replace(CSS_VAR_GLOBAL_PATTERN, replaceCssVar);
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
 * Mirror a palette step across a numbered scale (`1` ↔ `max`, `2` ↔ `max-1`).
 *
 * Dark palettes are emitted darkest-first (`color1` / `red1` are the darkest
 * stops), so a DTCG alias `{color.red.7}` must read `theme.red3` on a 9-step
 * scale to keep pointing at the original token color.
 */
export function flipPaletteStep(step: number, maxStep: number): number {
  if (maxStep < 1) {
    return step;
  }

  return maxStep + 1 - step;
}

function wasPaletteReversed(
  values: readonly string[],
  scheme: ColorScheme
): boolean {
  if (values.length < 2) {
    return false;
  }

  const ordered = orderPaletteForScheme(values, scheme);

  return ordered.some((value, index) => value !== values[index]);
}

/**
 * Remap a DTCG scale step onto the Tamagui theme key for this scheme.
 *
 * Light palettes stay lightest-first, so steps are unchanged. Dark palettes
 * that were reversed darkest-first flip `step` across the scale (`max + 1 - n`).
 */
function scaleStepForScheme(
  step: number,
  name: string,
  scales: Record<string, Record<string, string>>,
  scheme: ColorScheme
): number {
  const scale = scales[name];
  if (!scale || scheme !== "dark") {
    return step;
  }

  const entries = orderedScaleEntries(scale, name);
  if (entries.length < 2) {
    return step;
  }

  const values = entries.map(([, value]) => value);
  if (!wasPaletteReversed(values, scheme)) {
    return step;
  }

  return flipPaletteStep(step, entries[entries.length - 1]![0]);
}

/**
 * Map a resolved color token onto a Tamagui `theme` object key.
 *
 * Base palettes (`lightPalette` / `darkPalette`) become `color1`–`color12`.
 * Children palette themes also use `color1`–`color12` inside each child theme.
 * Root `getTheme` extras still reference palette steps as `theme.blue6`, etc.
 * Dark scheme steps are flipped when the matching palette was reversed darkest-first.
 */
function themePropertyForToken(
  token: FlatToken,
  basePaletteName: string | undefined,
  scales: Record<string, Record<string, string>>,
  scheme: ColorScheme
): string | undefined {
  const parsed = parseScaleToken(token);
  if (!parsed) {
    return undefined;
  }

  const step = scaleStepForScheme(parsed.step, parsed.name, scales, scheme);

  if (
    (basePaletteName &&
      parsed.name.toLowerCase() === basePaletteName.toLowerCase()) ||
    scales[parsed.name]
  ) {
    return `${parsed.name}${step}`;
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

function sourceStepForOrderedPaletteValue(
  entries: Array<[number, string]>,
  ordered: string[],
  index: number
): number {
  const targetValue = ordered[index];
  const sourceEntry = entries.find(([, value]) => value === targetValue);

  return sourceEntry?.[0] ?? entries[index]?.[0] ?? index + 1;
}

/**
 * Palette child themes reference `tokens.color.*` keys while preserving Tamagui
 * palette ordering (dark palettes flip step assignment onto `name1`–`name12`).
 */
function orderScaleTokenRefsForScheme(
  valueScale: Record<string, string>,
  tokenKeyScale: Record<string, string>,
  name: string,
  scheme: ColorScheme
): Record<string, string> {
  const entries = orderedScaleEntries(valueScale, name);
  if (entries.length === 0) {
    return {};
  }

  const ordered = orderPaletteForScheme(
    entries.map(([, value]) => value),
    scheme
  );
  const result: Record<string, string> = {};

  for (const [index, [step]] of entries.entries()) {
    const sourceStep = sourceStepForOrderedPaletteValue(
      entries,
      ordered,
      index
    );
    const scaleKey = `${name}${sourceStep}`;
    const tokenKey = tokenKeyScale[scaleKey];
    if (!tokenKey) {
      continue;
    }

    result[`${name}${step}`] = tokenColorRef(tokenKey);
  }

  return result;
}

function renderPaletteTokenRefArray(
  valueScale: Record<string, string>,
  tokenKeyScale: Record<string, string>,
  paletteName: string,
  scheme: ColorScheme
): string | undefined {
  const entries = orderedScaleEntries(valueScale, paletteName);
  if (entries.length < 2) {
    return undefined;
  }

  const ordered = orderPaletteForScheme(
    entries.map(([, value]) => value),
    scheme
  );
  const refs: string[] = [];

  for (const [index] of entries.entries()) {
    const sourceStep = sourceStepForOrderedPaletteValue(
      entries,
      ordered,
      index
    );
    const tokenKey = tokenKeyScale[`${paletteName}${sourceStep}`];
    if (!tokenKey) {
      return undefined;
    }
    refs.push(tokenColorRef(tokenKey));
  }

  const padded = [...refs];
  const last = padded.at(-1);
  if (last == null) {
    return undefined;
  }

  while (padded.length < TAMAGUI_PALETTE_LENGTH) {
    padded.push(last);
  }

  return `[${padded.join(",")}]`;
}

function isPaletteScale(scale: Record<string, string>, name: string): boolean {
  return orderedScaleEntries(scale, name).length >= 2;
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

/**
 * Unique semantic `theme` / `$theme` tags, excluding light/dark scheme ids.
 *
 * Tags like `theme: "danger"` feed {@link collectSemanticRoles} for `getTheme`
 * aliases. Appearance set ids (`light`, `dark`, `default`) are ignored.
 */
function collectChildThemeNames(tokens: FlatToken[]): string[] {
  const byLower = new Map<string, string>();

  for (const token of tokens) {
    const raw = token.childTheme?.trim();
    if (!raw) {
      continue;
    }

    const lower = raw.toLowerCase();
    if (isLightThemeId(lower) || isDarkThemeId(lower)) {
      continue;
    }

    if (!byLower.has(lower)) {
      byLower.set(lower, toCamelCaseKey([raw]));
    }
  }

  return [...byLower.values()].toSorted((a, b) => a.localeCompare(b));
}

/**
 * Role key inside a semantic children theme.
 *
 * `foregroundSuccess` + theme `success` → `foreground`.
 * `backgroundSuccessSubtle` → `backgroundSubtle`.
 * `foregroundOnSuccess` → `foregroundOn`.
 */
function childThemeColorKey(
  tokenKey: string,
  childTheme: string
): string | undefined {
  const themeLower = childTheme.toLowerCase();
  const parts = tokenKey.split(/(?=[A-Z])/).filter(Boolean);
  const kept = parts.filter(part => part.toLowerCase() !== themeLower);
  if (kept.length === 0) {
    return undefined;
  }

  return toCamelCaseKey(kept);
}

type BaseRank = "primary" | "secondary" | "tertiary";

function isBaseChildTheme(name: string): boolean {
  return name.toLowerCase() === "base";
}

/**
 * Semantic children-theme tags used by `getTheme` to pick `foregroundWarning`
 * vs `foregroundPrimary`. `base` is excluded — it uses the Primary aliases.
 */
function collectSemanticRoles(tokens: FlatToken[]): string[] {
  return collectChildThemeNames(tokens).filter(name => !isBaseChildTheme(name));
}

function capitalizeRole(role: string): string {
  return `${role.charAt(0).toUpperCase()}${role.slice(1)}`;
}

/**
 * Short theme keys overlaid in `getTheme` from qualified semantic sources.
 *
 * `name: "dark"` / `"dark_base"` / `"dark_yellow"` → Primary (`foregroundPrimary`).
 * `name: "dark_warning"` / `"dark_warning_Button"` → Warning (`foregroundWarning`).
 */
const ROLE_ALIAS_BINDINGS: ReadonlyArray<{
  alias: string;
  source: (role: string) => string;
}> = [
  { alias: "background", source: role => `background${role}` },
  { alias: "backgroundDisabled", source: role => `background${role}Disabled` },
  { alias: "backgroundHover", source: role => `background${role}Hover` },
  {
    alias: "backgroundSubtle",
    source: role =>
      role === "Primary" ? "backgroundSecondary" : `background${role}Subtle`
  },
  { alias: "border", source: role => `border${role}` },
  { alias: "borderDisabled", source: role => `border${role}Disabled` },
  { alias: "borderHover", source: role => `border${role}Hover` },
  {
    alias: "borderSubtle",
    source: role =>
      role === "Primary" ? "borderSecondary" : `border${role}Subtle`
  },
  { alias: "foreground", source: role => `foreground${role}` },
  { alias: "foregroundDisabled", source: role => `foreground${role}Disabled` },
  { alias: "foregroundHover", source: role => `foreground${role}Hover` },
  { alias: "foregroundOn", source: role => `foregroundOn${role}` },
  {
    alias: "foregroundOnDisabled",
    source: role => `foregroundOn${role}Disabled`
  },
  { alias: "foregroundOnHover", source: role => `foregroundOn${role}Hover` }
];

function collectRoleAliasThemeKeys(
  lightSemantic: Record<string, string>,
  darkSemantic: Record<string, string>,
  roles: readonly string[]
): string[] {
  const sources = new Set([
    ...Object.keys(lightSemantic),
    ...Object.keys(darkSemantic)
  ]);
  const capitalized = ["Primary", ...roles.map(capitalizeRole)];
  const aliases: string[] = [];

  for (const { alias, source } of ROLE_ALIAS_BINDINGS) {
    if (capitalized.some(role => sources.has(source(role)))) {
      aliases.push(alias);
    }
  }

  return aliases;
}

/**
 * Turn stripped semantic children maps into numbered palettes so Tamagui still
 * generates `dark_warning` / `light_danger` without putting `foreground` on
 * the root extra (`createV5Theme` flattens children maps onto base extra).
 *
 * `base` is omitted — the numbered `base` scale from {@link collectColorScales}
 * already creates `dark_base`.
 */
function semanticRolesAsNumberedPalettes(
  semantic: Record<string, Record<string, string>>
): Record<string, Record<string, string>> {
  const result: Record<string, Record<string, string>> = {};

  for (const [name, colors] of Object.entries(semantic)) {
    if (isBaseChildTheme(name)) {
      continue;
    }

    const values = Object.values(colors);
    if (values.length === 0) {
      continue;
    }

    const scale: Record<string, string> = {};
    for (const [index, value] of values.entries()) {
      scale[`${name}${index + 1}`] = value;
    }
    if (Object.keys(scale).length === 1) {
      scale[`${name}2`] = values[0]!;
    }

    result[name] = scale;
  }

  return result;
}

/**
 * Parse `foregroundPrimary` / `backgroundSecondary` / `foregroundOnPrimary`
 * into a role plus rank. Used only for the `base` children theme.
 */
function parseBaseRankKey(
  tokenKey: string
): { role: string; rank: BaseRank } | undefined {
  const parts = tokenKey.split(/(?=[A-Z])/).filter(Boolean);
  const last = parts.at(-1)?.toLowerCase();
  if (last !== "primary" && last !== "secondary" && last !== "tertiary") {
    return undefined;
  }
  if (parts.length < 2) {
    return undefined;
  }

  return { role: toCamelCaseKey(parts.slice(0, -1)), rank: last };
}

function isSemanticColorToken(token: FlatToken): boolean {
  return (
    token.category === "color" && !token.primitive && Boolean(token.tokenKey)
  );
}

/**
 * `base` children theme: `xPrimary` → `x`, `xSecondary` → `xSubtle`
 * (fall back to `xTertiary` when secondary is missing).
 *
 * Primary tokens are tagged `theme: "base"`; secondary/tertiary often are not,
 * so untagged rank tokens are included unless they belong to another children
 * theme.
 */
function collectBaseChildrenColors(
  tokens: FlatToken[],
  lookups: TokenLookups,
  colorBucket: Readonly<Record<string, string | number>>
): Record<string, string> {
  const ranks = new Map<
    string,
    { primary?: string; secondary?: string; tertiary?: string }
  >();
  const extras: Record<string, string> = {};

  for (const token of tokens) {
    if (!isSemanticColorToken(token) || !token.tokenKey) {
      continue;
    }

    const childLower = token.childTheme?.toLowerCase();
    if (childLower && childLower !== "base") {
      continue;
    }

    const expression = resolveColorTokenReference(token, lookups, colorBucket);
    if (!expression) {
      continue;
    }

    const parsed = parseBaseRankKey(token.tokenKey);
    if (parsed) {
      const entry = ranks.get(parsed.role) ?? {};
      entry[parsed.rank] = expression;
      ranks.set(parsed.role, entry);
      continue;
    }

    if (childLower === "base") {
      const key = childThemeColorKey(token.tokenKey, "base");
      if (key) {
        extras[key] = expression;
      }
    }
  }

  const colors: Record<string, string> = { ...extras };
  for (const [role, entry] of ranks) {
    if (entry.primary) {
      colors[role] = entry.primary;
    }

    const subtle = entry.secondary ?? entry.tertiary;
    if (subtle) {
      colors[`${role}Subtle`] = subtle;
    }
  }

  return colors;
}

/**
 * Build semantic color maps from token `theme` tags (stripped keys).
 *
 * Not passed to `childrenThemes` as-is — Tamagui would flatten `foreground`
 * onto the root extra. {@link semanticRolesAsNumberedPalettes} rewrites these
 * maps to `warning1` / `danger2` palettes so named themes still exist.
 *
 * `base` is special: `backgroundPrimary` → `background`,
 * `backgroundSecondary` → `backgroundSubtle` (or `backgroundTertiary`).
 */
function collectSemanticChildrenScales(
  tokens: FlatToken[],
  colorBucket: Readonly<Record<string, string | number>>
): Record<string, Record<string, string>> {
  const lookups = tokenLookups(tokens);
  const result: Record<string, Record<string, string>> = {};

  for (const childTheme of collectChildThemeNames(tokens)) {
    if (isBaseChildTheme(childTheme)) {
      const colors = collectBaseChildrenColors(tokens, lookups, colorBucket);
      if (Object.keys(colors).length > 0) {
        result[childTheme] = colors;
      }
      continue;
    }

    const colors: Record<string, string> = {};
    const childLower = childTheme.toLowerCase();

    for (const token of tokens) {
      if (
        !isSemanticColorToken(token) ||
        token.childTheme?.toLowerCase() !== childLower
      ) {
        continue;
      }

      const key = childThemeColorKey(token.tokenKey!, childTheme);
      if (!key) {
        continue;
      }

      const expression = resolveColorTokenReference(
        token,
        lookups,
        colorBucket
      );
      if (!expression) {
        continue;
      }

      colors[key] = expression;
    }

    if (Object.keys(colors).length > 0) {
      result[childTheme] = colors;
    }
  }

  return result;
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
 * Tamagui passes into `getTheme`. Dark scheme steps are flipped when palettes
 * were reversed darkest-first. Direct hex colors stay as string literals.
 * CSS `var()` strings are never emitted — they are not valid Tamagui theme
 * values.
 *
 * @see https://tamagui.dev/docs/guides/theme-builder#gettheme
 */
function semanticColorsForTheme(
  tokens: FlatToken[],
  basePaletteName: string | undefined,
  scheme: ColorScheme
): Record<string, string> {
  const scales = collectColorScales(tokens);
  const { byPath, byCssVar } = tokenLookups(tokens);
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
    const property = themePropertyForToken(
      resolved,
      basePaletteName,
      scales,
      scheme
    );
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

type ShadowPart =
  { kind: "text"; value: string } | { kind: "theme"; property: string };

function escapeTemplateLiteral(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("`", "\\`")
    .replaceAll("${", "\\${");
}

function colorTokenToShadowPart(
  token: FlatToken,
  lookups: TokenLookups,
  basePaletteName: string | undefined,
  scales: Record<string, Record<string, string>>,
  scheme: ColorScheme
): ShadowPart | undefined {
  const resolved = resolveAliasChain(token, lookups.byPath, lookups.byCssVar);
  const property = themePropertyForToken(
    resolved,
    basePaletteName,
    scales,
    scheme
  );
  if (property) {
    return { kind: "theme", property };
  }

  const literal = resolvedColorLiteral(resolved, lookups);
  if (literal) {
    return { kind: "text", value: literal };
  }

  return undefined;
}

/**
 * Split a CSS box-shadow string on DTCG aliases and `var(--…)` color refs.
 * Returns `undefined` when any reference cannot be resolved.
 */
function splitShadowColorRefs(
  value: string,
  lookups: TokenLookups,
  basePaletteName: string | undefined,
  scales: Record<string, Record<string, string>>,
  scheme: ColorScheme
): ShadowPart[] | undefined {
  const parts: ShadowPart[] = [];
  const pattern = /\{([^{}]+)\}|var\((--[^),\s]+)(?:\s*,[^)]*)?\)/g;
  let lastIndex = 0;

  for (const match of value.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      parts.push({ kind: "text", value: value.slice(lastIndex, index) });
    }

    const token = match[1]
      ? lookups.byPath.get(match[1].trim())
      : match[2]
        ? lookups.byCssVar.get(match[2])
        : undefined;
    if (!token) {
      return undefined;
    }

    const part = colorTokenToShadowPart(
      token,
      lookups,
      basePaletteName,
      scales,
      scheme
    );
    if (!part) {
      return undefined;
    }

    parts.push(part);
    lastIndex = index + match[0].length;
  }

  if (lastIndex < value.length) {
    parts.push({ kind: "text", value: value.slice(lastIndex) });
  }

  return parts;
}

function renderShadowParts(parts: ShadowPart[]): string {
  const hasTheme = parts.some(part => part.kind === "theme");
  if (!hasTheme) {
    return toLiteral(
      parts.map(part => (part.kind === "text" ? part.value : "")).join("")
    );
  }

  const body = parts
    .map(part => {
      if (part.kind === "theme") {
        return `\${${themePropertyAccess(part.property)}}`;
      }

      return escapeTemplateLiteral(part.value);
    })
    .join("");

  return `\`${body}\``;
}

/**
 * Ring box-shadow extras for `createV5Theme({ getTheme })`.
 *
 * Palette-mapped colors become `${theme.color7}` interpolations so light/dark
 * inversion is handled by Tamagui palettes (with dark steps flipped to match). Other colors stay scheme-specific literals.
 *
 * @see https://tamagui.dev/docs/guides/theme-builder#gettheme
 */
function ringShadowsForTheme(
  tokens: FlatToken[],
  basePaletteName: string | undefined,
  scheme: ColorScheme
): Record<string, string> {
  const lookups = tokenLookups(tokens);
  const scales = collectColorScales(
    tokens.filter(token => token.category === "color")
  );
  const rings: Record<string, string> = {};

  for (const token of tokens) {
    if (!isRingToken(token) || !token.tokenKey) {
      continue;
    }

    const css =
      typeof token.tamaguiValue === "string"
        ? token.tamaguiValue
        : token.cssValue;
    if (typeof css !== "string" || css.length === 0) {
      continue;
    }

    const parts = splitShadowColorRefs(
      css,
      lookups,
      basePaletteName,
      scales,
      scheme
    );
    if (!parts) {
      continue;
    }

    rings[token.tokenKey] = renderShadowParts(parts);
  }

  return rings;
}

function renderChildrenThemes(
  lightScales: Record<string, Record<string, string>>,
  darkScales: Record<string, Record<string, string>>,
  lightPaletteTokenKeys: Record<string, Record<string, string>>,
  darkPaletteTokenKeys: Record<string, Record<string, string>>,
  useTokenRefs: boolean
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
    const lightValueScale = lightScales[name] ?? darkScales[name] ?? {};
    const darkValueScale = darkScales[name] ?? lightScales[name] ?? {};
    if (
      Object.keys(lightValueScale).length === 0 ||
      Object.keys(darkValueScale).length === 0
    ) {
      continue;
    }

    const paletteChild =
      isPaletteScale(lightValueScale, name) ||
      isPaletteScale(darkValueScale, name);

    let light: Record<string, string>;
    let dark: Record<string, string>;

    if (useTokenRefs && paletteChild) {
      light = orderScaleTokenRefsForScheme(
        lightValueScale,
        lightPaletteTokenKeys[name] ?? darkPaletteTokenKeys[name] ?? {},
        name,
        "light"
      );
      dark = orderScaleTokenRefsForScheme(
        darkValueScale,
        darkPaletteTokenKeys[name] ?? lightPaletteTokenKeys[name] ?? {},
        name,
        "dark"
      );
      // Semantic role palettes already store `tokens.color.*.val` expressions
      // under `warning1` / `danger2` — there is no primitive token-key scale.
      if (Object.keys(light).length === 0) {
        light = lightValueScale;
      }
      if (Object.keys(dark).length === 0) {
        dark = darkValueScale;
      }
    } else if (paletteChild) {
      light = orderScaleForScheme(lightValueScale, name, "light");
      dark = orderScaleForScheme(darkValueScale, name, "dark");
    } else {
      light = lightValueScale;
      dark = darkValueScale;
    }

    if (Object.keys(light).length === 0 || Object.keys(dark).length === 0) {
      continue;
    }

    const renderLiteral =
      paletteChild && !useTokenRefs
        ? (values: Record<string, string>, indent: number) =>
            renderObjectLiteral(values, indent)
        : renderConfigObjectLiteral;

    blocks.push(`    ${name}: {
      light: ${renderLiteral(light, 8)},
      dark: ${renderLiteral(dark, 8)}
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
    keys.push(`base${step}`);
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
  semanticRoles?: readonly string[];
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
  for (const key of collectRoleAliasThemeKeys(
    options.lightSemantic,
    options.darkSemantic,
    options.semanticRoles ?? []
  )) {
    keys.add(key);
  }

  return [...keys].toSorted((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  );
}

function renderSemanticRolesConst(roles: readonly string[]): string {
  const rolesLiteral = roles.map(role => toLiteral(role)).join(", ");

  return `const SEMANTIC_ROLES = new Set([${rolesLiteral}]);`;
}

function renderGetTheme(
  lightSemantic: Record<string, string>,
  darkSemantic: Record<string, string>
): string {
  return `  getTheme: ({ theme, scheme, name }: { theme: AppTheme; scheme: "light" | "dark"; name?: string }) => {
    const values: Record<string, string> = scheme === "dark"
      ? ${renderThemeObjectLiteral(darkSemantic, 8)}
      : ${renderThemeObjectLiteral(lightSemantic, 8)};
    const child = name?.split("_")[1];
    const role =
      child && SEMANTIC_ROLES.has(child)
        ? child.charAt(0).toUpperCase() + child.slice(1)
        : "Primary";
    const overlay: Record<string, string> = {};
    const assign = (alias: string, source: string) => {
      const value = values[source];
      if (value !== undefined) {
        overlay[alias] = value;
      }
    };
    assign("background", \`background\${role}\`);
    assign("backgroundDisabled", \`background\${role}Disabled\`);
    assign("backgroundHover", \`background\${role}Hover\`);
    assign("backgroundSubtle", role === "Primary" ? "backgroundSecondary" : \`background\${role}Subtle\`);
    assign("border", \`border\${role}\`);
    assign("borderDisabled", \`border\${role}Disabled\`);
    assign("borderHover", \`border\${role}Hover\`);
    assign("borderSubtle", role === "Primary" ? "borderSecondary" : \`border\${role}Subtle\`);
    assign("foreground", \`foreground\${role}\`);
    assign("foregroundDisabled", \`foreground\${role}Disabled\`);
    assign("foregroundHover", \`foreground\${role}Hover\`);
    assign("foregroundOn", \`foregroundOn\${role}\`);
    assign("foregroundOnDisabled", \`foregroundOn\${role}Disabled\`);
    assign("foregroundOnHover", \`foregroundOn\${role}Hover\`);
    return {
      ...values,
      ...overlay
    };
  }`;
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
 * Each typography token is emitted as its own `createFont` entry with that
 * token's size, line height, and weight (not a shared type scale).
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
  const useDefaultConfig = options.useDefaultConfig === true;
  const animations = options.animations ?? "css";
  const includeTypeAugmentation = options.includeTypeAugmentation !== false;

  const colorTokens = tokens.filter(token => token.category === "color");
  const lightColorTokens = tokensForScheme(colorTokens, "light");
  const darkColorTokens = tokensForScheme(colorTokens, "dark");
  const darkColorTokensOrLight =
    darkColorTokens.length > 0 ? darkColorTokens : lightColorTokens;

  const colorBucket = colorBucketForCreateTokens(
    lightColorTokens,
    darkColorTokens
  );
  const useTokenRefs = Object.keys(colorBucket).length > 0;
  const lightPaletteTokenKeys = collectPaletteTokenKeys(lightColorTokens);
  const darkPaletteTokenKeys = collectPaletteTokenKeys(darkColorTokensOrLight);

  const lightPaletteScales = collectColorScales(lightColorTokens);
  const darkPaletteScales = collectColorScales(darkColorTokensOrLight);
  const semanticRoles = collectSemanticRoles([
    ...lightColorTokens,
    ...darkColorTokensOrLight
  ]);
  // Palette scales win on name collision (`base` stays a 1–12 scale). Semantic
  // roles that are not palettes become numbered children so Tamagui still
  // generates `dark_warning` without putting `foreground` on the root extra.
  const lightScales = {
    ...semanticRolesAsNumberedPalettes(
      collectSemanticChildrenScales(lightColorTokens, colorBucket)
    ),
    ...lightPaletteScales
  };
  const darkScales = {
    ...semanticRolesAsNumberedPalettes(
      collectSemanticChildrenScales(darkColorTokensOrLight, colorBucket)
    ),
    ...darkPaletteScales
  };
  const { lightPalette, darkPalette, lightBaseName, darkBaseName } =
    resolveBasePalettes(tokens);
  const childrenThemes = renderChildrenThemes(
    lightScales,
    darkScales,
    lightPaletteTokenKeys,
    darkPaletteTokenKeys,
    useTokenRefs
  );

  const lightPaletteExpr =
    useTokenRefs && lightBaseName
      ? renderPaletteTokenRefArray(
          lightPaletteScales[lightBaseName] ?? {},
          lightPaletteTokenKeys[lightBaseName] ?? {},
          lightBaseName,
          "light"
        )
      : undefined;
  const darkPaletteExpr =
    useTokenRefs && darkBaseName
      ? renderPaletteTokenRefArray(
          darkPaletteScales[darkBaseName] ?? {},
          darkPaletteTokenKeys[darkBaseName] ?? {},
          darkBaseName,
          "dark"
        )
      : undefined;

  const lightSchemeTokens = tokensForScheme(tokens, "light");
  const darkSchemeTokens = tokensForScheme(tokens, "dark");
  const darkSchemeOrLight =
    darkColorTokens.length > 0 ? darkSchemeTokens : lightSchemeTokens;
  const darkBaseNameOrLight =
    darkColorTokens.length > 0 ? darkBaseName : lightBaseName;

  const lightSemantic = {
    ...semanticColorsForTheme(lightColorTokens, lightBaseName, "light"),
    ...ringShadowsForTheme(lightSchemeTokens, lightBaseName, "light")
  };
  const darkSemantic = {
    ...semanticColorsForTheme(
      darkColorTokens.length > 0 ? darkColorTokens : lightColorTokens,
      darkBaseNameOrLight,
      "dark"
    ),
    ...ringShadowsForTheme(darkSchemeOrLight, darkBaseNameOrLight, "dark")
  };
  const appThemeKeys = collectAppThemeKeys({
    lightSemantic,
    darkSemantic,
    lightScales,
    darkScales,
    lightPalette,
    darkPalette,
    semanticRoles
  });
  const themeInterfaceLines = renderThemeInterface(appThemeKeys, {
    specName: spec.name
  });

  const buckets = buildCategoryBuckets(lightSchemeTokens);
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
  if (lightPaletteExpr) {
    themeOptions.push(`  lightPalette: ${lightPaletteExpr}`);
  } else if (lightPalette) {
    themeOptions.push(`  lightPalette: ${toLiteral(lightPalette)}`);
  }

  if (darkPaletteExpr) {
    themeOptions.push(`  darkPalette: ${darkPaletteExpr}`);
  } else if (darkPalette) {
    themeOptions.push(`  darkPalette: ${toLiteral(darkPalette)}`);
  }

  if (childrenThemes) {
    themeOptions.push(`  childrenThemes: ${childrenThemes}`);
  }

  if (
    Object.keys(lightSemantic).length > 0 ||
    Object.keys(darkSemantic).length > 0
  ) {
    themeOptions.push(renderGetTheme(lightSemantic, darkSemantic));
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
  const assignedFonts = collectTamaguiFonts(tokens, fonts);
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

  const emitGetTheme =
    Object.keys(lightSemantic).length > 0 ||
    Object.keys(darkSemantic).length > 0;

  if (emitGetTheme) {
    lines.push(renderSemanticRolesConst(semanticRoles), "");
  }

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
