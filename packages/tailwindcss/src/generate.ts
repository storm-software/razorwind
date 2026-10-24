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
  aliasDuplicateColors,
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

type RawThemeToken = Pick<FlatThemeToken, "path" | "type" | "value">;

function walkTokens(
  node: unknown,
  path: string[],
  inheritedType: string | undefined,
  out: RawThemeToken[]
): RawThemeToken[] {
  if (!isObject(node)) {
    return out;
  }

  const type = readType(node, inheritedType);

  if (isTokenLeaf(node)) {
    out.push({ path: path.join("."), type, value: readValue(node) });
    return out;
  }

  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith("$")) {
      continue;
    }
    walkTokens(child, [...path, key], type, out);
  }

  return out;
}

/**
 * Token groups whose Tailwind v4 theme namespace differs from the group name,
 * keyed by the group name lower-cased without separators (`font-size`,
 * `fontSize` and `font.size` all read as `fontsize`).
 *
 * @see https://tailwindcss.com/docs/theme#theme-variable-namespaces
 */
const TAILWIND_NAMESPACES: Record<string, string> = {
  borderradius: "radius",
  fontfamily: "font",
  fontsize: "text",
  fontweight: "font-weight",
  letterspacing: "tracking",
  lineheight: "leading",
  radii: "radius"
};

/**
 * Rename a token path's group to its Tailwind v4 theme namespace, so the
 * generated variables drive Tailwind's utilities.
 *
 * @example
 * toTailwindThemePath("font-size.sm") // "text.sm"
 * toTailwindThemePath("font.weight.bold") // "font-weight.bold"
 * toTailwindThemePath("color.primary") // "color.primary"
 */
export function toTailwindThemePath(path: string): string {
  const segments = path.split(".");
  for (const length of [1, 2]) {
    const group = segments.slice(0, length).join("");
    const namespace =
      TAILWIND_NAMESPACES[group.toLowerCase().replace(/[-_]/g, "")];
    if (namespace && segments.length > length) {
      return [namespace, ...segments.slice(length)].join(".");
    }
  }

  return path;
}

const REFERENCE_PATTERN = /\{([^{}]+)\}/g;

/** Replace every DTCG `{path}` reference in a token value. */
function mapReferences(
  value: unknown,
  replace: (path: string) => string
): unknown {
  if (typeof value === "string") {
    return value.replace(REFERENCE_PATTERN, (_, path: string) =>
      replace(path.trim())
    );
  }
  if (Array.isArray(value)) {
    return value.map(item => mapReferences(item, replace));
  }
  if (isObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        mapReferences(item, replace)
      ])
    );
  }

  return value;
}

/**
 * Where a composite typography token's properties land in the Tailwind theme.
 * With a `fontSize`, the rest pair with it on `text-<name>`
 * (`--text-<name>--line-height`); otherwise they stand alone
 * (`--leading-<name>`).
 */
const TYPOGRAPHY_PROPERTIES: {
  property: string;
  type: string;
  namespace: string;
  paired?: string;
}[] = [
  { property: "fontFamily", type: "fontFamily", namespace: "font" },
  { property: "fontSize", type: "dimension", namespace: "text" },
  {
    property: "fontWeight",
    type: "fontWeight",
    namespace: "font-weight",
    paired: "font-weight"
  },
  {
    property: "letterSpacing",
    type: "dimension",
    namespace: "tracking",
    paired: "letter-spacing"
  },
  {
    property: "lineHeight",
    type: "number",
    namespace: "leading",
    paired: "line-height"
  }
];

function expandTypography(
  token: RawThemeToken,
  format: (value: unknown, type: string) => string
): FlatThemeToken[] {
  const value = token.value as Record<string, unknown>;
  const name = token.path.split(".").slice(1).join(".") || token.path;
  const text = toThemeCssVar(`text.${name}`);

  return TYPOGRAPHY_PROPERTIES.filter(
    ({ property }) => value[property] !== undefined
  ).map(({ property, type, namespace, paired }) => ({
    path: `${token.path}.${property}`,
    type,
    value: value[property],
    cssValue: format(value[property], type),
    cssVar:
      paired && value.fontSize !== undefined
        ? `${text}--${paired}`
        : toThemeCssVar(`${namespace}.${name}`)
  }));
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
 * Flatten DTCG tokens into Tailwind `@theme` custom-property rows, named by
 * Tailwind v4 namespace (`font-size.sm` → `--text-sm`).
 */
export function flattenThemeTokens(
  tokens: Tokens | Record<string, Tokens>,
  options: Pick<TailwindGeneratePluginOptions, "outputReferences"> = {}
): FlatThemeToken[] {
  const outputReferences = options.outputReferences !== false;
  const flat: FlatThemeToken[] = [];
  const sets = resolveTokenSets(tokens);

  // A primary alias must not cross a `.dark` override boundary, or the
  // aliasing token would silently pick up the dark value.
  const dark = sets.find(set => set.id.toLowerCase() === "dark");
  const darkPaths = new Set(
    dark ? walkTokens(dark.tokens, [], undefined, []).map(t => t.path) : []
  );
  const primary = pickPrimaryTheme(sets);
  const primaryTokens = primary
    ? walkTokens(primary.tokens, [], undefined, [])
    : [];

  for (const set of sets) {
    const setTokens = walkTokens(
      outputReferences
        ? aliasDuplicateColors(
            set.tokens,
            set === dark
              ? undefined
              : (from, to) => darkPaths.has(from) === darkPaths.has(to)
          )
        : set.tokens,
      [],
      undefined,
      []
    );

    // References resolve within the set, then against the primary theme.
    const lookup = new Map(
      [...primaryTokens, ...setTokens].map(token => [token.path, token])
    );
    const reference = (path: string, seen: string[]): string => {
      const target = outputReferences ? undefined : lookup.get(path);

      return target && !seen.includes(path)
        ? formatTokenValue(
            mapReferences(target.value, ref => reference(ref, [...seen, path])),
            target.type
          )
        : `{${toTailwindThemePath(path)}}`;
    };
    const format = (value: unknown, type?: string) =>
      formatTokenValue(
        mapReferences(value, path => reference(path, [])),
        type
      );

    const rows = setTokens.flatMap(token =>
      token.type === "typography" && isObject(token.value)
        ? expandTypography(token, format)
        : [
            {
              ...token,
              cssValue: format(token.value, token.type),
              cssVar: toThemeCssVar(toTailwindThemePath(token.path))
            }
          ]
    );

    // Tailwind sizes `text-<name>` with `--text-<name>--line-height`, so a
    // line-height token named like a font size becomes its leading.
    const scale = (namespace: string) =>
      new Map(
        setTokens.flatMap(token => {
          const [group, ...name] = toTailwindThemePath(token.path).split(".");

          return group === namespace &&
            token.type !== "color" &&
            token.type !== "typography"
            ? [[name.join("."), token] as const]
            : [];
        })
      );
    const defined = new Set(rows.map(row => row.cssVar));
    const leading = scale("leading");
    for (const name of scale("text").keys()) {
      const lineHeight = leading.get(name);
      const cssVar = `${toThemeCssVar(`text.${name}`)}--line-height`;
      if (lineHeight && !defined.has(cssVar)) {
        rows.push({
          ...lineHeight,
          cssVar,
          cssValue: outputReferences
            ? `var(${toThemeCssVar(`leading.${name}`)})`
            : format(lineHeight.value, lineHeight.type)
        });
      }
    }

    for (const row of rows) {
      flat.push({
        ...row,
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
  options: Pick<
    TailwindGeneratePluginOptions,
    "fontAssetsUrl" | "includeImport" | "prefix"
  > & {
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
    parts.push(
      `@import "tailwindcss"${options.prefix ? ` prefix(${options.prefix})` : ""};\n`
    );
  }
  const faces = fonts
    ? renderLocalFontFaces(fonts, {
        fontAssetsUrl: options.fontAssetsUrl
      })
    : "";
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

  const flat = flattenThemeTokens(spec.tokens, options);
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
    renderInstallMd({
      cssPath: outputPath,
      includeImport,
      prefix: options.prefix
    });
  const installPath = join(dirname(outputPath), "INSTALL.md");

  return {
    [outputPath]: createDocument<Schema, TailwindGeneratePluginOptions>(
      outputPath,
      content,
      { name: "razorwind-tailwindcss" },
      undefined,
      "css"
    ),
    [installPath]: createDocument<Schema, TailwindGeneratePluginOptions>(
      installPath,
      installBody,
      { name: "razorwind-tailwindcss" },
      undefined,
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
  generate: async (spec, config) =>
    generateTailwindCss(spec, {
      fontAssetsUrl: config.fontAssetsUrl,
      ...options
    })
}));
