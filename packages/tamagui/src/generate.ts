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
/** DTCG `ring.*` shadows — themed via `createThemes`, not static `createTokens`. */
const RING_PATH_PATTERN = /^ring(?:\.|$)/i;

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
 * Tamagui configs emit `light` / `dark` themes (plus nested `createThemes` children).
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

const SHADOW_THEME_CATEGORIES = new Set<TamaguiTokenCategory>([
  "shadow",
  "insetShadow",
  "dropShadow",
  "textShadow",
  "boxShadow"
]);

function isSemanticShadowToken(token: FlatToken): boolean {
  return (
    !token.primitive &&
    Boolean(token.tokenKey) &&
    (token.type === "shadow" ||
      (token.category != null && SHADOW_THEME_CATEGORIES.has(token.category)))
  );
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
 * `createTokens({ color })` key for a primitive palette step.
 *
 * Light/dark primitives are prefixed (`lightBlue1`, `darkBlue1`) so both schemes
 * can coexist in one bucket.
 */
function paletteTokenKey(token: FlatToken): string {
  const stem = token.path.replace(/^color\./i, "").replaceAll(".", "");

  return token.theme
    ? `${token.theme}${stem[0]?.toUpperCase() ?? ""}${stem.slice(1)}`
    : stem;
}

function tokenColorRef(tokenKey: string): string {
  return `tokens.color.${tokenKey}.val`;
}

const BASE_PALETTE_NAMES = ["base", "gray", "grey", "neutral"] as const;
const ACCENT_PALETTE_NAMES = ["accent", "brand"] as const;
const FALLBACK_LIGHT_PALETTE = ['"#ffffff"', '"#000000"'] as const;
const FALLBACK_DARK_PALETTE = ['"#000000"', '"#ffffff"'] as const;

/**
 * Primitive scale identity from a flattened path (`color.base.1` → base / 1).
 */
function parseScaleToken(
  token: FlatToken
): { name: string; step: number } | undefined {
  if (token.category !== "color" || !token.primitive) {
    return undefined;
  }

  const relative = token.path.replace(/^color\./i, "");
  const parts = relative.split(".").filter(Boolean);
  const last = parts.at(-1);
  if (!last || parts.length < 2) {
    return undefined;
  }

  const step = Number(last);
  if (!Number.isFinite(step)) {
    return undefined;
  }

  return { name: parts.slice(0, -1).join(".").toLowerCase(), step };
}

function scaleStopExpression(
  token: FlatToken,
  colorBucket: TokenBucket
): string {
  const key = paletteTokenKey(token);
  if (key in colorBucket) {
    return tokenColorRef(key);
  }

  const value =
    typeof token.cssValue === "string" && token.cssValue.length > 0
      ? token.cssValue
      : typeof token.tamaguiValue === "string"
        ? token.tamaguiValue
        : undefined;

  return value ? toLiteral(value) : '"#000000"';
}

interface PaletteStop {
  step: number;
  expression: string;
  lightness?: number;
}

/**
 * Approximate perceptual lightness in 0–1 for hex and `oklch()` colors.
 *
 * Used to order `createThemes` palettes background → foreground regardless of
 * token step numbering.
 */
function colorLightness(css: string): number | undefined {
  const value = css.trim();
  const oklch = /^oklch\(\s*([0-9.]+)(%?)/i.exec(value);
  if (oklch) {
    const n = Number(oklch[1]);
    if (!Number.isFinite(n)) {
      return undefined;
    }

    return oklch[2] === "%" || n > 1 ? n / 100 : n;
  }

  const hex = /^#([\da-f]{3,8})$/i.exec(value);
  if (!hex) {
    return undefined;
  }

  const raw = hex[1]!;
  let r: number;
  let g: number;
  let b: number;
  if (raw.length === 3 || raw.length === 4) {
    r = Number.parseInt(raw[0]! + raw[0], 16);
    g = Number.parseInt(raw[1]! + raw[1], 16);
    b = Number.parseInt(raw[2]! + raw[2], 16);
  } else if (raw.length === 6 || raw.length === 8) {
    r = Number.parseInt(raw.slice(0, 2), 16);
    g = Number.parseInt(raw.slice(2, 4), 16);
    b = Number.parseInt(raw.slice(4, 6), 16);
  } else {
    return undefined;
  }

  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function collectScaleStops(
  tokens: FlatToken[],
  names: readonly string[],
  colorBucket: TokenBucket
): PaletteStop[] | undefined {
  const byName = new Map<string, PaletteStop[]>();

  for (const token of tokens) {
    const parsed = parseScaleToken(token);
    if (!parsed) {
      continue;
    }

    const css =
      typeof token.cssValue === "string" && token.cssValue.length > 0
        ? token.cssValue
        : undefined;
    const list = byName.get(parsed.name) ?? [];
    list.push({
      step: parsed.step,
      expression: scaleStopExpression(token, colorBucket),
      lightness: css ? colorLightness(css) : undefined
    });
    byName.set(parsed.name, list);
  }

  for (const name of names) {
    const list = byName.get(name);
    if (!list || list.length === 0) {
      continue;
    }

    const unique = new Map<number, PaletteStop>();
    for (const item of list.toSorted((a, b) => a.step - b.step)) {
      unique.set(item.step, item);
    }

    return [...unique.values()];
  }

  return undefined;
}

/**
 * Tamagui palettes are a background → foreground gradient.
 *
 * Light: lightest first (`#fff` → `#000`). Dark: darkest first (`#000` → `#fff`).
 *
 * @see https://tamagui.dev/docs/guides/theme-builder
 */
function orderPaletteForScheme(
  stops: PaletteStop[],
  scheme: ColorScheme
): string[] {
  const known = stops.filter(stop => stop.lightness != null);
  if (known.length >= 2) {
    return [...stops]
      .toSorted((a, b) => {
        const left = a.lightness ?? 0.5;
        const right = b.lightness ?? 0.5;

        return scheme === "light" ? right - left : left - right;
      })
      .map(stop => stop.expression);
  }

  const expressions = stops
    .toSorted((a, b) => a.step - b.step)
    .map(stop => stop.expression);

  return scheme === "light" ? expressions : [...expressions].toReversed();
}

function ensureTwoStops(
  palette: string[],
  fallback: readonly string[]
): string[] {
  if (palette.length >= 2) {
    return palette;
  }

  if (palette.length === 1) {
    return [palette[0]!, fallback[1] ?? '"#000000"'];
  }

  return [...fallback];
}

/**
 * Light/dark palettes for `createThemes`. Primitive scales named `base` /
 * `gray` / `grey` / `neutral` (or `accent` / `brand`) feed token refs; a two-stop
 * fallback is used when no matching scale exists.
 *
 * Stops are ordered background → foreground: light palettes go light → dark,
 * dark palettes go dark → light.
 *
 * `createThemes` requires at least two stops and same-length light/dark arrays.
 *
 * @see https://tamagui.dev/docs/guides/theme-builder
 */
function schemePalettes(
  lightTokens: FlatToken[],
  darkTokens: FlatToken[],
  names: readonly string[],
  colorBucket: TokenBucket,
  fallbackLight: readonly string[],
  fallbackDark: readonly string[]
): { light: string[]; dark: string[] } {
  const lightScale = collectScaleStops(lightTokens, names, colorBucket);
  const darkScale = collectScaleStops(darkTokens, names, colorBucket);

  if (lightScale && darkScale) {
    return {
      light: ensureTwoStops(
        orderPaletteForScheme(lightScale, "light"),
        fallbackLight
      ),
      dark: ensureTwoStops(
        orderPaletteForScheme(darkScale, "dark"),
        fallbackDark
      )
    };
  }

  if (lightScale) {
    const light = ensureTwoStops(
      orderPaletteForScheme(lightScale, "light"),
      fallbackLight
    );

    return { light, dark: [...light].toReversed() };
  }

  if (darkScale) {
    const dark = ensureTwoStops(
      orderPaletteForScheme(darkScale, "dark"),
      fallbackDark
    );

    return { light: [...dark].toReversed(), dark };
  }

  return {
    light: [...fallbackLight],
    dark: [...fallbackDark]
  };
}

function isSemanticColorToken(token: FlatToken): boolean {
  return (
    token.category === "color" && !token.primitive && Boolean(token.tokenKey)
  );
}

/**
 * Color entries for `createTokens({ color })` — CSS strings, not DTCG objects.
 *
 * Palette / primitive scales only ({@link paletteTokenKey}). Semantic colors
 * (including computed state siblings) belong in {@link collectThemeMaps}.
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

  for (const token of lightColorTokens) {
    if (!token.tokenKey || isSemanticColorToken(token)) {
      continue;
    }
    put(paletteTokenKey(token), token);
  }

  for (const token of darkColorTokens) {
    if (!token.tokenKey || !token.primitive) {
      continue;
    }
    put(paletteTokenKey(token), token);
  }

  return bucket;
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
 * otherwise a concrete color literal for `createThemes` extra values.
 *
 * Semantic tokens are never in the color bucket, so they only get a
 * `tokens.color.*` ref when they resolve to a primitive still stored there.
 * Computed state hex values (hover / pressed / disabled) fall through to a
 * literal — child themes override `$backgroundHover`, not a global token.
 */
function resolveColorTokenReference(
  token: FlatToken,
  lookups: TokenLookups,
  colorBucket: Readonly<Record<string, string | number>>
): string | undefined {
  if (
    token.tokenKey &&
    bucketValueMatchesToken(token, lookups, colorBucket, token.tokenKey)
  ) {
    return tokenColorRef(token.tokenKey);
  }

  const resolved = resolveAliasChain(token, lookups.byPath, lookups.byCssVar);
  if (
    resolved.tokenKey &&
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
 * (`tokens.color.blue1.val`, …) rather than raw literals.
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

/**
 * Role key inside a semantic children theme.
 *
 * `foregroundSuccess` + theme `success` → `foreground`.
 * `backgroundPrimarySubtle` + theme `primary` → `backgroundSubtle`.
 * `ringPrimarySubtle` + theme `primary` → `ringSubtle`.
 * `foregroundOnSuccess` + theme `success` → `foregroundOn`.
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

/**
 * Source key used when placing a token on a Tamagui theme.
 *
 * Colors use {@link FlatToken.tokenKey} (`color.` already stripped). Shadows
 * keep the path family (`ring.primary` → `ringPrimary`, `shadow.primary` →
 * `shadowPrimary`) so stripping the theme name leaves `ring` / `shadow`.
 */
function themeValueKey(token: FlatToken): string | undefined {
  if (isSemanticShadowToken(token)) {
    const fromPath = toCamelCaseKey(token.path.split(".").filter(Boolean));

    return fromPath || token.tokenKey;
  }

  return token.tokenKey;
}

function isSchemeChildTheme(name: string): boolean {
  const lower = name.toLowerCase();

  return isLightThemeId(lower) || isDarkThemeId(lower);
}

interface ThemeMaps {
  base: Record<string, string>;
  children: Record<string, Record<string, string>>;
}

function putThemeValue(
  maps: ThemeMaps,
  token: FlatToken,
  expression: string
): void {
  const sourceKey = themeValueKey(token);
  if (!sourceKey) {
    return;
  }

  const raw = token.childTheme?.trim();
  if (!raw || isSchemeChildTheme(raw)) {
    maps.base[sourceKey] = expression;
    return;
  }

  const themeName = toCamelCaseKey([raw]);
  const key = childThemeColorKey(sourceKey, themeName);
  if (!key) {
    return;
  }

  const colors = maps.children[themeName] ?? {};
  colors[key] = expression;
  maps.children[themeName] = colors;
}

function resolveShadowExpression(
  token: FlatToken,
  lookups: TokenLookups
): string | undefined {
  const css =
    typeof token.tamaguiValue === "string"
      ? token.tamaguiValue
      : token.cssValue;
  if (typeof css !== "string" || css.length === 0) {
    return undefined;
  }

  const resolved = resolveCssReferencesInValue(css, lookups);
  if (resolved.length === 0 || containsCssVarOrAlias(resolved)) {
    return undefined;
  }

  const value =
    token.category === "dropShadow" ? toDropShadowFilter(resolved) : resolved;

  return toLiteral(value);
}

/**
 * Group semantic colors and shadows into Tamagui themes.
 *
 * Tokens without `palette` / `primitive` that declare `theme` / `$theme` land
 * on that nested theme, with the theme name stripped from the token key:
 * `backgroundPrimarySubtle` + `theme: "primary"` → `backgroundSubtle` on
 * `primary`; `ringPrimarySubtle` + `theme: "primary"` → `ringSubtle`.
 * Untagged semantic colors (and untagged rings) stay on the scheme's base theme.
 */
function collectThemeMaps(
  tokens: FlatToken[],
  colorBucket: Readonly<Record<string, string | number>>
): ThemeMaps {
  const lookups = tokenLookups(tokens);
  const maps: ThemeMaps = { base: {}, children: {} };

  for (const token of tokens) {
    if (isSemanticColorToken(token)) {
      const expression = resolveColorTokenReference(
        token,
        lookups,
        colorBucket
      );
      if (expression) {
        putThemeValue(maps, token, expression);
      }
      continue;
    }

    if (!isSemanticShadowToken(token)) {
      continue;
    }

    const expression = resolveShadowExpression(token, lookups);
    if (!expression) {
      continue;
    }

    const raw = token.childTheme?.trim();
    if ((raw && !isSchemeChildTheme(raw)) || isRingToken(token)) {
      putThemeValue(maps, token, expression);
    }
  }

  return maps;
}

function collectAppThemeKeys(maps: ThemeMaps[]): string[] {
  const keys = new Set<string>();

  for (const map of maps) {
    for (const key of Object.keys(map.base)) {
      keys.add(key);
    }
    for (const scale of Object.values(map.children)) {
      for (const key of Object.keys(scale)) {
        keys.add(key);
      }
    }
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
    " * Derived from semantic color tokens mapped by \`createThemes\`. Nested",
    " * themes (`light_primary`, `dark_danger`, …) come from each token's",
    " * `theme` / `$theme` property.",
    " *",
    " * @see https://tamagui.dev/docs/intro/themes",
    " */",
    "export interface AppTheme {",
    ...keys.map(renderThemeInterfaceProperty),
    "}",
    ""
  ];
}

function hasThemeValues(values: Record<string, string>): boolean {
  return Object.keys(values).length > 0;
}

function renderIdentifierKey(key: string): string {
  return /^[A-Z_$][\w$]*$/i.test(key) ? key : toLiteral(key);
}

function renderExpressionArray(expressions: string[], indent: number): string {
  const pad = " ".repeat(indent);
  const close = " ".repeat(Math.max(indent - 2, 0));

  return `[\n${expressions.map(expression => `${pad}${expression}`).join(",\n")}\n${close}]`;
}

function renderPaletteBlock(
  light: string[],
  dark: string[],
  indent: number
): string {
  const pad = " ".repeat(indent);
  const close = " ".repeat(Math.max(indent - 2, 0));
  const inner = indent + 2;

  return `{
${pad}light: ${renderExpressionArray(light, inner)},
${pad}dark: ${renderExpressionArray(dark, inner)}
${close}}`;
}

function renderExtraBlock(
  light: Record<string, string>,
  dark: Record<string, string>,
  indent: number
): string {
  const pad = " ".repeat(indent);
  const close = " ".repeat(Math.max(indent - 2, 0));
  const inner = indent + 2;

  return `{
${pad}light: ${renderConfigObjectLiteral(light, inner)},
${pad}dark: ${renderConfigObjectLiteral(dark, inner)}
${close}}`;
}

function renderChildThemeMap(
  children: Record<string, Record<string, string>>,
  indent: number
): string {
  const entries = Object.entries(children).toSorted(([a], [b]) =>
    a.localeCompare(b)
  );
  if (entries.length === 0) {
    return "{}";
  }

  const pad = " ".repeat(indent);
  const close = " ".repeat(Math.max(indent - 2, 0));
  const inner = indent + 2;
  const lines = entries.map(
    ([name, values]) =>
      `${pad}${renderIdentifierKey(name)}: ${renderConfigObjectLiteral(values, inner)}`
  );

  return `{\n${lines.join(",\n")}\n${close}}`;
}

function renderEmptyChildrenThemes(names: string[], indent: number): string {
  const pad = " ".repeat(indent);
  const close = " ".repeat(Math.max(indent - 2, 0));
  const lines = names.map(name => `${pad}${renderIdentifierKey(name)}: {}`);

  return `{\n${lines.join(",\n")}\n${close}}`;
}

function renderChildThemeExtrasConst(
  light: Record<string, Record<string, string>>,
  dark: Record<string, Record<string, string>>
): string {
  return `const childThemeExtras: {
  light: Record<string, Record<string, string>>;
  dark: Record<string, Record<string, string>>;
} = {
  light: ${renderChildThemeMap(light, 4)},
  dark: ${renderChildThemeMap(dark, 4)}
};`;
}

function childrenForScheme(
  maps: ThemeMaps,
  fallback: ThemeMaps,
  names: string[]
): Record<string, Record<string, string>> {
  return Object.fromEntries(
    names.map(name => [
      name,
      maps.children[name] ?? fallback.children[name] ?? {}
    ])
  );
}

/**
 * Emit `createThemes` from `@tamagui/theme-builder`.
 *
 * Untagged semantics land on `base.extra`. A semantic `accent` child uses the
 * first-class `accent` slot (palette + extra). Other `theme` / `$theme` names
 * become `childrenThemes` with extras applied through `getTheme`. Nested Tamagui
 * names use underscores (`light_primary`) so `<Theme name="primary">` resolves
 * under light/dark.
 *
 * @see https://tamagui.dev/docs/guides/theme-builder
 */
function renderThemesModule(
  light: ThemeMaps,
  dark: ThemeMaps,
  colorBucket: TokenBucket,
  lightColorTokens: FlatToken[],
  darkColorTokens: FlatToken[]
): { statements: string[]; hasThemes: boolean } {
  const childNames = [
    ...new Set([...Object.keys(light.children), ...Object.keys(dark.children)])
  ].toSorted((a, b) => a.localeCompare(b));
  const hasAccent = childNames.includes("accent");
  const nestedNames = childNames.filter(name => name !== "accent");
  const hasBase = hasThemeValues(light.base) || hasThemeValues(dark.base);

  if (!hasBase && childNames.length === 0) {
    return { statements: [], hasThemes: false };
  }

  const basePalette = schemePalettes(
    lightColorTokens,
    darkColorTokens,
    BASE_PALETTE_NAMES,
    colorBucket,
    FALLBACK_LIGHT_PALETTE,
    FALLBACK_DARK_PALETTE
  );
  const accentPalette = schemePalettes(
    lightColorTokens,
    darkColorTokens,
    ACCENT_PALETTE_NAMES,
    colorBucket,
    basePalette.light,
    basePalette.dark
  );

  const statements: string[] = [];
  const createThemesFields: string[] = ["  componentThemes: false"];

  const baseFields = [
    `    palette: ${renderPaletteBlock(basePalette.light, basePalette.dark, 6)}`
  ];
  if (hasBase) {
    baseFields.push(`    extra: ${renderExtraBlock(light.base, dark.base, 6)}`);
  }
  createThemesFields.push(`  base: {\n${baseFields.join(",\n")}\n  }`);

  if (hasAccent) {
    const lightAccent = light.children.accent ?? dark.children.accent ?? {};
    const darkAccent = dark.children.accent ?? light.children.accent ?? {};
    createThemesFields.push(`  accent: {
    palette: ${renderPaletteBlock(accentPalette.light, accentPalette.dark, 6)},
    extra: ${renderExtraBlock(lightAccent, darkAccent, 6)}
  }`);
  }

  if (nestedNames.length > 0) {
    const lightNested = childrenForScheme(light, dark, nestedNames);
    const darkNested = childrenForScheme(dark, light, nestedNames);
    statements.push(renderChildThemeExtrasConst(lightNested, darkNested), "");
    createThemesFields.push(
      `  childrenThemes: ${renderEmptyChildrenThemes(nestedNames, 4)}`
    );
    const skipAccent = hasAccent ? ' || child === "accent"' : "";
    createThemesFields.push(`  getTheme: ({ name, theme, scheme }) => {
    const child = name.replace(/^(?:light|dark)_/, "");
    if (child === name${skipAccent}) {
      return theme;
    }

    const extras = childThemeExtras[scheme ?? "light"][child];

    return extras ? { ...theme, ...extras } : theme;
  }`);
  }

  statements.push(
    `const themes = createThemes({\n${createThemesFields.join(",\n")}\n});`
  );

  return { statements, hasThemes: true };
}

/**
 * Render a Tamagui config module from flattened design tokens.
 *
 * `createTokens({ color })` holds palette / primitive scales. Light and dark
 * semantic colors become `createThemes` extra maps (tagged `$theme` names as
 * `light_<name>` / `dark_<name>`, with the theme name stripped from the token
 * key). Each typography token is emitted as its own `createFont` entry with
 * that token's size, line height, and weight (not a shared type scale).
 *
 * @see https://tamagui.dev/docs/core/configuration
 * @see https://tamagui.dev/docs/intro/themes
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
  const hasDark = darkColorTokens.length > 0;

  const colorBucket = colorBucketForCreateTokens(
    lightColorTokens,
    darkColorTokens
  );

  const lightSchemeTokens = tokensForScheme(tokens, "light");
  const darkSchemeTokens = hasDark
    ? tokensForScheme(tokens, "dark")
    : lightSchemeTokens;
  const lightMaps = collectThemeMaps(lightSchemeTokens, colorBucket);
  const darkMaps = collectThemeMaps(darkSchemeTokens, colorBucket);
  const { statements: themeStatements, hasThemes } = renderThemesModule(
    lightMaps,
    darkMaps,
    colorBucket,
    lightColorTokens,
    darkColorTokens
  );
  const appThemeKeys = collectAppThemeKeys(
    hasDark ? [lightMaps, darkMaps] : [lightMaps]
  );
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

  const imports: string[] = ["import { isWeb } from '@tamagui/constants';"];
  if (useDefaultConfig) {
    imports.push(`import { defaultConfig } from "@tamagui/config/v5";`);
  }

  if (animations !== false) {
    imports.push(
      `import { animations } from "${ANIMATION_IMPORTS[animations]}";`
    );
  }

  if (options.importConfig) {
    imports.push(`import userConfig from "${options.importConfig}";`);
  }

  if (hasThemes) {
    imports.push(`import { createThemes } from "@tamagui/theme-builder";`);
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
    " * @see https://tamagui.dev/docs/core/configuration",
    " * @see https://tamagui.dev/docs/intro/themes",
    " * @see https://tamagui.dev/docs/guides/theme-builder",
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

  if (themeStatements.length > 0) {
    lines.push(...themeStatements, "");
  }

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
  if (hasThemes) {
    configParts.push("  themes");
  }

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
 * The Tamagui config for the ${spec.name || "design system"}.
 *
 * @see https://tamagui.dev/docs/core/configuration
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
 * Generate a Tamagui config file from a Razorwind schema.
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
