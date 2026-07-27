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
import { createDocument } from "@razorwind/core/utils";
import { flattenTokens } from "./flatten";
import { toLiteral } from "./format";
import type {
  FlatToken,
  TamaguiAnimationDriver,
  TamaguiPluginOptions,
  TamaguiTokenCategory
} from "./types";

const PRIMARY_THEME_IDS = new Set(["default", "base", "light", "theme"]);
const PALETTE_SCALE_NAMES = new Set([
  "gray",
  "grey",
  "neutral",
  "slate",
  "zinc",
  "stone",
  "palette",
  "base"
]);

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

function pickPrimaryTheme(tokens: FlatToken[]): FlatToken[] {
  const themes = new Set(
    tokens.map(token => token.theme).filter((theme): theme is string => !!theme)
  );

  if (themes.size === 0) {
    return tokens;
  }

  for (const id of PRIMARY_THEME_IDS) {
    const match = tokens.filter(token => token.theme?.toLowerCase() === id);
    if (match.length > 0) {
      return match;
    }
  }

  const first = [...themes][0];

  return tokens.filter(token => token.theme === first);
}

function tokensByTheme(tokens: FlatToken[], themeId: string): FlatToken[] {
  return tokens.filter(token => token.theme?.toLowerCase() === themeId);
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
    a.localeCompare(b)
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
 * Detect 1–12 (or 0–11) stepped color scales for `createV5Theme` childrenThemes.
 *
 * Accepts keys like `blue1`…`blue12` or nested paths already flattened to those keys.
 */
export function collectColorScales(
  colorTokens: FlatToken[]
): Record<string, Record<string, string>> {
  const scales: Record<string, Record<string, string>> = {};
  const keyed = new Map<string, string>();

  for (const token of colorTokens) {
    if (!token.tokenKey || typeof token.tamaguiValue !== "string") {
      continue;
    }
    keyed.set(token.tokenKey, token.tamaguiValue);
  }

  const scalePattern = /^([A-Z]+)(\d{1,2})$/i;

  for (const [key, value] of keyed) {
    const match = scalePattern.exec(key);
    if (!match) {
      continue;
    }

    const [, name = "", stepRaw = ""] = match;
    const step = Number(stepRaw);
    if (step < 0 || step > 12) {
      continue;
    }

    const scale = scales[name] ?? {};
    scale[`${name}${step}`] = value;
    scales[name] = scale;
  }

  return Object.fromEntries(
    Object.entries(scales).filter(([, steps]) => Object.keys(steps).length >= 3)
  );
}

function paletteFromScale(
  scale: Record<string, string>,
  name: string
): string[] | undefined {
  const values: string[] = [];
  for (let step = 1; step <= 12; step++) {
    const value = scale[`${name}${step}`];
    if (!value) {
      return undefined;
    }
    values.push(value);
  }
  return values;
}

function resolveBasePalettes(tokens: FlatToken[]): {
  lightPalette?: string[];
  darkPalette?: string[];
} {
  const lightColors = pickPrimaryTheme(
    tokens.filter(token => token.category === "color")
  );
  const darkColors = tokensByTheme(
    tokens.filter(token => token.category === "color"),
    "dark"
  );

  const lightScales = collectColorScales(lightColors);
  const darkScales = collectColorScales(darkColors);

  let lightPalette: string[] | undefined;
  let darkPalette: string[] | undefined;

  for (const name of Object.keys(lightScales)) {
    if (PALETTE_SCALE_NAMES.has(name.toLowerCase())) {
      lightPalette = paletteFromScale(lightScales[name]!, name);
      if (lightPalette) {
        break;
      }
    }
  }

  for (const name of Object.keys(darkScales)) {
    if (PALETTE_SCALE_NAMES.has(name.toLowerCase())) {
      darkPalette = paletteFromScale(darkScales[name]!, name);
      if (darkPalette) {
        break;
      }
    }
  }

  return { lightPalette, darkPalette };
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

    // Skip stepped scale keys — those go to childrenThemes / palettes.
    if (/^[A-Z]+\d{1,2}$/i.test(token.tokenKey)) {
      const scaleName = token.tokenKey.replace(/\d{1,2}$/, "");
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
    if (PALETTE_SCALE_NAMES.has(name.toLowerCase())) {
      continue;
    }

    const light = lightScales[name] ?? darkScales[name];
    const dark = darkScales[name] ?? lightScales[name];
    if (!light || !dark) {
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

/**
 * Render a Tamagui v5 config module from flattened design tokens.
 *
 * @see https://tamagui.dev/docs/core/config-v5
 */
export function renderTamaguiConfig(
  tokens: FlatToken[],
  options: TamaguiPluginOptions = {}
): string {
  const useDefaultConfig = options.useDefaultConfig !== false;
  const animations =
    options.animations === undefined ? "css" : options.animations;
  const includeTypeAugmentation = options.includeTypeAugmentation !== false;

  const primary = pickPrimaryTheme(tokens);
  const buckets = buildCategoryBuckets(primary);

  const lightColorTokens = pickPrimaryTheme(
    tokens.filter(token => token.category === "color")
  );
  const darkColorTokens = tokensByTheme(
    tokens.filter(token => token.category === "color"),
    "dark"
  );

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

  const hasTokens = createTokensArgs.length > 0;

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
  if (hasTokens) {
    tamaguiImports.push("createTokens");
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

  if (hasTokens) {
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

  const configParts: string[] = [];
  if (useDefaultConfig) {
    configParts.push("  ...defaultConfig");
  }
  if (animations !== false) {
    configParts.push("  animations");
  }
  if (hasTokens) {
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

/**
 * Generate a Tamagui v5 config file from a Razorwind schema.
 */
export function generateTamaguiConfig(
  spec: Schema,
  options: TamaguiPluginOptions = {}
): GeneratorFunctionResult<Schema, TamaguiPluginOptions> {
  if (!spec.tokens || Object.keys(spec.tokens).length === 0) {
    return {};
  }

  const flat = flattenTokens(spec.tokens, options);
  if (flat.length === 0) {
    return {};
  }

  const outFile = options.outFile ?? "tamagui.config.ts";
  const content = renderTamaguiConfig(flat, options);

  return {
    [outFile]: createDocument<Schema, TamaguiPluginOptions>(
      outFile,
      content,
      { name: "razorwind-tamagui" },
      "typescript"
    )
  };
}
