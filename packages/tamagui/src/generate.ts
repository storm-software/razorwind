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
import { cssFontFamily, fontFamilyName } from "@razorwind/core/lib/fonts";
import type { Font, Fonts, LocalFont, Schema } from "@razorwind/core/schema";
import { createDocument } from "@razorwind/core/utils";
import { basename, dirname, join } from "node:path";
import { flattenTokens, toCamelCaseKey } from "./flatten";
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

function buildCategoryBuckets(
  tokens: FlatToken[]
): Partial<Record<TamaguiTokenCategory, TokenBucket>> {
  const buckets: Partial<Record<TamaguiTokenCategory, TokenBucket>> = {};

  for (const token of tokens) {
    if (!token.category || !token.tokenKey) {
      continue;
    }

    const bucket = buckets[token.category] ?? {};
    bucket[token.tokenKey] = token.tamaguiValue;
    buckets[token.category] = bucket;
  }

  return buckets;
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
    const safeKey = /^[A-Z_$][\w$]*$/i.test(key) ? key : toLiteral(key);

    return `${pad}${safeKey}: ${toLiteral(value)}`;
  });

  return `{\n${lines.join(",\n")}\n${" ".repeat(Math.max(indent - 2, 0))}}`;
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
    if (!token.palette || typeof token.tamaguiValue !== "string") {
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
): string[] | undefined {
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
      return palette;
    }
  }

  return undefined;
}

function resolveBasePalettes(tokens: FlatToken[]): {
  lightPalette?: string[];
  darkPalette?: string[];
} {
  const colors = tokens.filter(
    token => token.category === "color" || token.palette
  );
  const lightScales = collectColorScales(tokensForScheme(colors, "light"));
  const darkScales = collectColorScales(tokensForScheme(colors, "dark"));

  return {
    lightPalette: pickBasePalette(lightScales, "light"),
    darkPalette: pickBasePalette(darkScales, "dark")
  };
}

function semanticColorsForTheme(tokens: FlatToken[]): Record<string, string> {
  const scales = collectColorScales(tokens);
  const semantic: Record<string, string> = {};

  for (const token of tokens) {
    if (
      token.category !== "color" ||
      !token.tokenKey ||
      typeof token.tamaguiValue !== "string"
    ) {
      continue;
    }

    // Skip palette / stepped scale keys — those go to childrenThemes / palettes.
    if (token.palette) {
      continue;
    }
    if (/^[A-Z]+\d{1,3}$/i.test(token.tokenKey)) {
      const scaleName = token.tokenKey.replace(/\d{1,3}$/, "");
      if (scales[scaleName]) {
        continue;
      }
    }

    semantic[token.tokenKey] = token.tamaguiValue;
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

function tamaguiFontKey(font: Font): string {
  switch (font.role) {
    case "heading":
    case "display": {
      return "heading";
    }
    case "mono":
    case "code": {
      return "mono";
    }
    case "sans":
    case "body":
    case "serif": {
      return "body";
    }
    case undefined:
    default: {
      return font.name?.replaceAll(/\W/g, "") || "body";
    }
  }
}

function assignTamaguiFonts(fonts: Fonts): Map<string, Font> {
  const assigned = new Map<string, Font>();

  for (const font of Object.values(fonts)) {
    const key = tamaguiFontKey(font);
    const existing = assigned.get(key);
    if (!existing || (font.role === key && existing.role !== key)) {
      assigned.set(key, font);
    }
  }

  return assigned;
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

function renderCreateFont(font: Font, varName: string): string {
  const face = font.source === "local" ? renderFaceLiteral(font) : undefined;
  const lines = [
    `const ${varName} = createFont({`,
    `  family: isWeb ? ${toLiteral(cssFontFamily(font))} : ${toLiteral(fontFamilyName(font))},`,
    `  size: {`,
    `    1: 12,`,
    `    2: 14,`,
    `    3: 16,`,
    `    4: 18,`,
    `    5: 20,`,
    `    6: 24,`,
    `    7: 28,`,
    `    8: 32,`,
    `    9: 40,`,
    `    10: 48`,
    `  }${face ? "," : ""}`
  ];

  if (face) {
    lines.push(`  face: ${face}`);
  }

  lines.push(`});`);
  return lines.join("\n");
}

/**
 * Render a Tamagui v5 config module from flattened design tokens.
 *
 * Light and dark token sets are combined into one `createV5Theme` call.
 *
 * @see https://tamagui.dev/docs/core/config-v5
 */
export function renderTamaguiConfig(
  tokens: FlatToken[],
  options: TamaguiPluginOptions = {},
  fonts?: Fonts
): string {
  const useDefaultConfig = options.useDefaultConfig !== false;
  const animations = options.animations ?? "css";
  const includeTypeAugmentation = options.includeTypeAugmentation !== false;

  const primary = tokensForScheme(tokens, "light");
  const buckets = buildCategoryBuckets(primary);

  const colorTokens = tokens.filter(token => token.category === "color");
  const lightColorTokens = tokensForScheme(colorTokens, "light");
  const darkColorTokens = tokensForScheme(colorTokens, "dark");

  const lightScales = collectColorScales(lightColorTokens);
  const darkScales = collectColorScales(
    darkColorTokens.length > 0 ? darkColorTokens : lightColorTokens
  );
  const { lightPalette, darkPalette } = resolveBasePalettes(tokens);
  const childrenThemes = renderChildrenThemes(lightScales, darkScales);

  const lightSemantic = semanticColorsForTheme(lightColorTokens);
  const darkSemantic = semanticColorsForTheme(
    darkColorTokens.length > 0 ? darkColorTokens : lightColorTokens
  );
  const hasSemantic =
    Object.keys(lightSemantic).length > 0 ||
    Object.keys(darkSemantic).length > 0;

  const createTokensArgs: string[] = [];
  for (const category of [
    "color",
    "space",
    "size",
    "radius",
    "zIndex"
  ] as const) {
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

  if (hasSemantic) {
    themeOptions.push(`  getTheme: ({ scheme }) => {
    const semantic = scheme === "dark"
      ? ${renderObjectLiteral(darkSemantic, 8)}
      : ${renderObjectLiteral(lightSemantic, 8)};
    return semantic;
  }`);
  }

  const imports: string[] = [];
  if (useDefaultConfig) {
    imports.push(
      `import { createV5Theme, defaultConfig } from "@tamagui/config/v5";`
    );
  } else {
    imports.push(`import { createV5Theme } from "@tamagui/config/v5";`);
  }

  if (animations !== false) {
    imports.push(
      `import { animations } from "${ANIMATION_IMPORTS[animations]}";`
    );
  }

  const tamaguiImports = ["createTamagui"];
  if (createTokensArgs.length > 0) {
    tamaguiImports.push("createTokens");
  }
  const assignedFonts = fonts
    ? assignTamaguiFonts(fonts)
    : new Map<string, Font>();
  if (assignedFonts.size > 0) {
    tamaguiImports.push("createFont", "isWeb");
  }
  imports.push(`import { ${tamaguiImports.join(", ")} } from "tamagui";`);

  const lines: string[] = [
    "/* eslint-disable */",
    "/*",
    " * Generated by @razorwind/tamagui — do not edit by hand.",
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
  if (assignedFonts.size > 0) {
    let index = 0;
    for (const [key, font] of assignedFonts) {
      const varName = `${key}Font`.replaceAll(/\W/g, "") || `font${index}`;
      fontVarNames.set(key, varName);
      lines.push(renderCreateFont(font, varName), "");
      index += 1;
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
    color: {
      ...defaultConfig.tokens.color,
      ...tokens.color
    },
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
    const fontLines = [...fontVarNames.entries()].map(
      ([key, varName]) => `    ${key}: ${varName}`
    );
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

  lines.push(
    `export const config = createTamagui({`,
    configParts.join(",\n"),
    `});`,
    "",
    `export type AppConfig = typeof config;`,
    ""
  );

  if (includeTypeAugmentation) {
    lines.push(
      `declare module "tamagui" {`,
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
  const content = renderTamaguiConfig(flat, options, spec.fonts);
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
