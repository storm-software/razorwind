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
import { definePlugin } from "@razorwind/core/plugin";
import type { Schema, Tokens } from "@razorwind/core/schema";
import { createDocument, formatTokenValue } from "@razorwind/core/utils";
import { detectTailwindWorkspace } from "./extract";
import type { FlatThemeToken, TailwindGeneratePluginOptions } from "./types";

export type { FlatThemeToken, TailwindGeneratePluginOptions } from "./types";

/** Theme-like basename patterns used to split multi-theme token records. */
const THEME_BASENAME_PATTERN =
  /^(?:light|dark|dim|high-contrast|hc|default|base|theme)(?:[._-].+)?$/i;

const PRIMARY_THEME_IDS = new Set(["default", "base", "light", "theme"]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

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

/**
 * Convert a DTCG token path into a Tailwind `@theme` custom property.
 * Mirrors {@link nestFlatTokens}: `color.primary` → `--color-primary`,
 * and strips a trailing `DEFAULT` leaf (`radius.DEFAULT` → `--radius`).
 */
export function toThemeCssVar(path: string): string {
  const segments = path
    .split(".")
    .filter(Boolean)
    .filter(
      (segment, index, all) =>
        !(segment === "DEFAULT" && index === all.length - 1)
    );

  return `--${segments.join("-")}`;
}

function walkTokens(
  node: unknown,
  path: string[],
  inheritedType: string | undefined,
  out: FlatThemeToken[]
): void {
  if (!isPlainObject(node)) {
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
  if (!isPlainObject(tokens)) {
    return [];
  }

  const keys = Object.keys(tokens).filter(key => !key.startsWith("$"));
  const allThemes =
    keys.length > 0 && keys.every(key => THEME_BASENAME_PATTERN.test(key));

  if (allThemes) {
    return keys.map(id => ({
      id,
      tokens: (tokens as Record<string, Tokens>)[id]!
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

/**
 * Render a Tailwind v4 CSS entry from flattened theme tokens.
 */
export function renderTailwindCss(
  tokens: FlatThemeToken[],
  options: Pick<TailwindGeneratePluginOptions, "includeImport"> = {}
): string {
  const includeImport = options.includeImport !== false;
  const primary = tokens.filter(
    token => !token.theme || PRIMARY_THEME_IDS.has(token.theme.toLowerCase())
  );
  const dark = tokens.filter(token => token.theme?.toLowerCase() === "dark");

  const parts: string[] = [];
  if (includeImport) {
    parts.push(`@import "tailwindcss";\n`);
  }
  parts.push(renderThemeBlock(primary));
  if (dark.length > 0) {
    parts.push(renderDarkOverrides(dark));
  }

  return `${parts.join("\n").trimEnd()}\n`;
}

async function resolveOutFile(
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

  const outFile = await resolveOutFile(options);
  const content = renderTailwindCss(flat, options);

  return {
    [outFile]: createDocument<Schema, TailwindGeneratePluginOptions>(
      outFile,
      content,
      { name: "razorwind-tailwindcss" },
      "css"
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
export default definePlugin((options: TailwindGeneratePluginOptions = {}) => ({
  name: "tailwindcss:generate",
  generate: async spec => generateTailwindCss(spec, options)
}));
