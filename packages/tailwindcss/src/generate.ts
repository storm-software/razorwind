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
import { useExecution } from "@power-plant/core";
import {
  copyFontFiles,
  cssFontFamily,
  renderGoogleFontImports,
  renderLocalFontFaces
} from "@razorwind/core/lib/fonts";
import { definePlugin } from "@razorwind/core/plugin";
import type { Fonts, Schema, Tokens } from "@razorwind/core/schema";
import {
  createDocument,
  formatTokenValue,
  isObject,
  toThemeCssVar
} from "@razorwind/core/utils";
import { dirname, join } from "node:path";
import { detectTailwindWorkspace } from "./extract";
import { renderInstallMd } from "./install";
import type { FlatThemeToken, TailwindGeneratePluginOptions } from "./types";

export type { FlatThemeToken, TailwindGeneratePluginOptions } from "./types";
export { toThemeCssVar };

/** Theme-like basename patterns used to split multi-theme token records. */
const THEME_BASENAME_PATTERN =
  /^(?:light|dark|dim|high-contrast|hc|default|base|theme)(?:[._-].+)?$/i;

const PRIMARY_THEME_IDS = new Set(["default", "base", "light", "theme"]);

function isTokenLeaf(node: Record<string, unknown>): boolean {
  return "$value" in node || "value" in node || "$ref" in node || "ref" in node;
}

function readType(
  node: Record<string, unknown>,
  inherited?: string
): string | undefined {
  if (typeof node.$type === "string") {
    return node.$type;
  }
  if (typeof node.type === "string") {
    return node.type;
  }
  return inherited;
}

function readValue(node: Record<string, unknown>): unknown {
  if ("$value" in node) {
    return node.$value;
  }
  if ("value" in node) {
    return node.value;
  }
  if (typeof node.$ref === "string") {
    return node.$ref;
  }
  if (typeof node.ref === "string") {
    return node.ref;
  }
  return undefined;
}

function walkTokens(
  node: unknown,
  path: string[],
  inheritedType: string | undefined,
  out: FlatThemeToken[]
): void {
  if (!isObject(node)) {
    return;
  }

  const type = readType(node, inheritedType);

  if (isTokenLeaf(node)) {
    const value = readValue(node);
    const tokenPath = path.join(".");
    out.push({
      path: tokenPath,
      type,
      value,
      cssValue: formatTokenValue(value, type),
      cssVar: toThemeCssVar(tokenPath)
    });
    return;
  }

  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith("$")) {
      continue;
    }
    walkTokens(child, [...path, key], type, out);
  }
}

interface TokenSet {
  id: string;
  tokens: Tokens;
}

/**
 * Split `Schema.tokens` into one or more named token sets.
 *
 * A record whose keys all look like themes (`light`, `dark`, …) is treated as
 * multi-theme input; otherwise the whole document is a single set.
 */
export function resolveTokenSets(
  tokens: Tokens | Record<string, Tokens>
): TokenSet[] {
  if (!isObject(tokens)) {
    return [];
  }

  const keys = Object.keys(tokens).filter(key => !key.startsWith("$"));
  const allThemes =
    keys.length > 0 && keys.every(key => THEME_BASENAME_PATTERN.test(key));

  if (allThemes) {
    const themeTokens = tokens as Record<string, Tokens>;

    return keys.map(id => ({
      id,
      tokens: themeTokens[id]!
    }));
  }

  return [{ id: "default", tokens }];
}

/**
 * Flatten DTCG tokens into Tailwind `@theme` custom-property rows.
 */
export function flattenThemeTokens(
  tokens: Tokens | Record<string, Tokens>
): FlatThemeToken[] {
  const flat: FlatThemeToken[] = [];

  for (const set of resolveTokenSets(tokens)) {
    const setTokens: FlatThemeToken[] = [];
    walkTokens(set.tokens, [], undefined, setTokens);
    for (const token of setTokens) {
      flat.push({
        ...token,
        theme: set.id === "default" ? undefined : set.id
      });
    }
  }

  return flat;
}

function pickPrimaryTheme(sets: TokenSet[]): TokenSet | undefined {
  return (
    sets.find(set => PRIMARY_THEME_IDS.has(set.id.toLowerCase())) ?? sets[0]
  );
}

function renderThemeBlock(tokens: FlatThemeToken[]): string {
  if (tokens.length === 0) {
    return "@theme {\n}\n";
  }

  const lines = tokens
    .slice()
    .sort((a, b) => a.cssVar.localeCompare(b.cssVar))
    .map(token => `  ${token.cssVar}: ${token.cssValue};`);

  return `@theme {\n${lines.join("\n")}\n}\n`;
}

function renderDarkOverrides(tokens: FlatThemeToken[]): string {
  if (tokens.length === 0) {
    return "";
  }

  const lines = tokens
    .slice()
    .sort((a, b) => a.cssVar.localeCompare(b.cssVar))
    .map(token => `    ${token.cssVar}: ${token.cssValue};`);

  return `
@layer theme {
  .dark {
${lines.join("\n")}
  }
}
`;
}

function applyFontRoleVars(
  tokens: FlatThemeToken[],
  fonts: Fonts | undefined
): FlatThemeToken[] {
  if (!fonts) {
    return tokens;
  }

  const existing = new Set(
    tokens.filter(token => !token.theme).map(token => token.cssVar)
  );
  const extra: FlatThemeToken[] = [];

  for (const font of Object.values(fonts)) {
    if (!font.role) {
      continue;
    }

    const cssVar = `--font-${font.role}`;
    if (existing.has(cssVar)) {
      continue;
    }

    const cssValue = cssFontFamily(font);
    extra.push({
      path: `font.${font.role}`,
      type: "fontFamily",
      value: cssValue,
      cssValue,
      cssVar
    });
    existing.add(cssVar);
  }

  return extra.length > 0 ? [...tokens, ...extra] : tokens;
}

/**
 * Render a Tailwind v4 CSS entry from flattened theme tokens.
 */
export function renderTailwindCss(
  tokens: FlatThemeToken[],
  options: Pick<TailwindGeneratePluginOptions, "includeImport"> & {
    fonts?: Fonts;
  } = {}
): string {
  const includeImport = options.includeImport !== false;
  const fonts = options.fonts;
  const withFonts = applyFontRoleVars(tokens, fonts);
  const primary = withFonts.filter(
    token => !token.theme || PRIMARY_THEME_IDS.has(token.theme.toLowerCase())
  );
  const dark = withFonts.filter(token => token.theme?.toLowerCase() === "dark");

  const parts: string[] = [];
  const googleImports = fonts ? renderGoogleFontImports(fonts) : "";
  if (googleImports) {
    parts.push(`${googleImports}\n`);
  }
  if (includeImport) {
    parts.push(`@import "tailwindcss";\n`);
  }
  const faces = fonts ? renderLocalFontFaces(fonts) : "";
  if (faces) {
    parts.push(`${faces}\n`);
  }
  parts.push(renderThemeBlock(primary));
  if (dark.length > 0) {
    parts.push(renderDarkOverrides(dark));
  }

  return `${parts.join("\n").trimEnd()}\n`;
}

export { renderInstallMd };

async function resolveoutputPath(
  options: TailwindGeneratePluginOptions
): Promise<string> {
  if (options.cssPath) {
    return options.cssPath;
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks, react/rules-of-hooks
  const { cwd } = useExecution();
  const workspace = await detectTailwindWorkspace(cwd);

  return workspace.cssFile ?? "src/app.css";
}

/**
 * Generate a Tailwind v4 CSS entry (`@import` + `@theme`) from a Razorwind schema.
 */
export async function generateTailwindCss(
  spec: Schema,
  options: TailwindGeneratePluginOptions = {}
): Promise<GeneratorFunctionResult<Schema, TailwindGeneratePluginOptions>> {
  if (!spec.tokens || Object.keys(spec.tokens).length === 0) {
    return {};
  }

  const sets = resolveTokenSets(spec.tokens);
  if (sets.length === 0 || !pickPrimaryTheme(sets)) {
    return {};
  }

  const flat = flattenThemeTokens(spec.tokens);
  if (flat.length === 0) {
    return {};
  }

  const outputPath = await resolveoutputPath(options);
  const content = renderTailwindCss(flat, {
    ...options,
    fonts: spec.fonts
  });
  const includeImport = options.includeImport !== false;

  if (spec.fonts) {
    await copyFontFiles(spec.fonts, join(dirname(outputPath), "fonts"));
  }

  const installBody =
    options.installGuide ??
    renderInstallMd({ cssPath: outputPath, includeImport });
  const installPath = join(dirname(outputPath), "INSTALL.md");

  return {
    [outputPath]: createDocument<Schema, TailwindGeneratePluginOptions>(
      outputPath,
      content,
      { name: "razorwind-tailwindcss" },
      "css"
    ),
    [installPath]: createDocument<Schema, TailwindGeneratePluginOptions>(
      installPath,
      installBody,
      { name: "razorwind-tailwindcss" },
      "markdown"
    )
  };
}

/**
 * Razorwind plugin: generate a Tailwind v4 CSS entry from schema tokens.
 *
 * @example
 * ```ts
 * import { defineConfig } from "@razorwind/core";
 * import tailwindcss from "@razorwind/tailwindcss/generate";
 *
 * export default defineConfig({
 *   plugins: [tailwindcss()]
 * });
 * ```
 */
export default definePlugin((options?: TailwindGeneratePluginOptions) => ({
  name: "tailwindcss:generate",
  generate: async spec => generateTailwindCss(spec, options ?? {})
}));
