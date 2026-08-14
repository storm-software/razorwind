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
import {
  cssFontFamily,
  MONO_ROLES,
  pickFontByRole,
  SANS_ROLES
} from "@razorwind/core/lib/fonts";
import type { Fonts, Schema } from "@razorwind/core/schema";
import type { TokenSet } from "@razorwind/core/utils";
import {
  createDocument,
  isSharedThemeId,
  mergeTokenTrees,
  resolveSchemaIdentity,
  SHARED_THEME_ID
} from "@razorwind/core/utils";
import { joinPaths } from "@stryke/path/join";
import type { PartialKeys } from "@stryke/types/base";
import { flattenTokens, resolveTokenSets } from "./flatten";
import { escapeString, toLiteral } from "./format";
import { renderInstallMd } from "./install";
import type {
  FlatToken,
  StorybookPluginOptions,
  StorybookTheme,
  StorybookThemePartial
} from "./types";

const DEFAULT_SAMPLE_TEXT = "The quick brown fox jumps over the lazy dog";

function groupByPath(
  tokens: FlatToken[],
  depth: number
): Map<string, FlatToken[]> {
  const groups = new Map<string, FlatToken[]>();

  for (const token of tokens) {
    const segments = token.path.split(".");
    const key = segments.slice(0, Math.max(depth, 1)).join(".") || token.path;
    const list = groups.get(key) ?? [];
    list.push(token);
    groups.set(key, list);
  }

  return groups;
}

function leafLabel(path: string, group: string): string {
  if (path === group) {
    return path.split(".").at(-1) ?? path;
  }

  if (path.startsWith(`${group}.`)) {
    return path.slice(group.length + 1);
  }

  return path.split(".").at(-1) ?? path;
}

/**
 * Build a React ColorPalette doc block from flattened color tokens.
 *
 * @see https://storybook.js.org/docs/api/doc-blocks/doc-block-colorpalette
 */
export function renderColorPaletteBlock(
  tokens: FlatToken[],
  options: Pick<StorybookPluginOptions, "colorGroupBy"> = {}
): string {
  const colors = tokens.filter(token => token.type === "color");
  const groupBy = options.colorGroupBy ?? 2;
  const groups = groupByPath(colors, groupBy);

  const items = [...groups.entries()]
    .toSorted(([a], [b]) => a.localeCompare(b))
    .map(([group, groupTokens]) => {
      const colorsObject = groupTokens
        .map(token => {
          const label = leafLabel(token.path, group);

          return `      ${toLiteral(label)}: ${toLiteral(token.cssValue)}`;
        })
        .join(",\n");

      const subtitle =
        groupTokens.find(token => token.description)?.description ??
        `${groupTokens.length} token${groupTokens.length === 1 ? "" : "s"}`;

      return `    <ColorItem
      title={${toLiteral(group)}}
      subtitle={${toLiteral(subtitle)}}
      colors={{
${colorsObject}
      }}
    />`;
    })
    .join("\n");

  return `import { ColorPalette, ColorItem } from "@storybook/addon-docs/blocks";

/**
 * Color tokens rendered with Storybook's ColorPalette doc block.
 *
 * @see https://storybook.js.org/docs/api/doc-blocks/doc-block-colorpalette
 */
export function ColorPaletteBlock() {
  return (
    <ColorPalette>
${items || "      {/* No color tokens */}"}
    </ColorPalette>
  );
}
`;
}

/**
 * Build a React Typeset doc block from typography-related tokens.
 *
 * @see https://storybook.js.org/docs/api/doc-blocks/doc-block-typeset
 */
export function renderTypesetBlock(
  tokens: FlatToken[],
  options: Pick<StorybookPluginOptions, "sampleText"> & { fonts?: Fonts } = {}
): string {
  const sampleText = options.sampleText ?? DEFAULT_SAMPLE_TEXT;
  const fontSizes = tokens
    .filter(
      token =>
        token.type === "dimension" &&
        /(?:font|type|text).*size|size.*(?:font|type|text)/i.test(token.path)
    )
    .map(token => {
      const match = /^(\d+(?:\.\d+)?)/.exec(token.cssValue);

      return match ? Number(match[1]) : token.cssValue;
    });

  const uniqueSizes = [...new Set(fontSizes)];
  const fromFonts = pickFontByRole(options.fonts, SANS_ROLES);
  const fontFamily =
    (fromFonts ? cssFontFamily(fromFonts) : undefined) ??
    tokens.find(token => token.type === "fontFamily")?.cssValue ??
    "system-ui, sans-serif";
  const fontWeightToken = tokens.find(token => token.type === "fontWeight");
  const fontWeight = fontWeightToken
    ? Number.parseFloat(fontWeightToken.cssValue) || 400
    : 400;

  const sizesLiteral =
    uniqueSizes.length > 0
      ? `[${uniqueSizes.map(size => toLiteral(size)).join(", ")}]`
      : `[12, 14, 16, 20, 24, 32]`;

  return `import { Typeset } from "@storybook/addon-docs/blocks";

/**
 * Typography tokens rendered with Storybook's Typeset doc block.
 *
 * @see https://storybook.js.org/docs/api/doc-blocks/doc-block-typeset
 */
export function TypesetBlock() {
  return (
    <Typeset
      fontFamily={${toLiteral(fontFamily)}}
      fontSizes={${sizesLiteral}}
      fontWeight={${toLiteral(fontWeight)}}
      sampleText={${toLiteral(sampleText)}}
    />
  );
}
`;
}

/**
 * Build a TokenTable React doc block listing flattened tokens.
 *
 * Mirrors the swatchbook TokenTable idea for MDX docs, using a static table
 * baked from the generator input.
 */
export function renderTokenTableBlock(tokens: FlatToken[]): string {
  const rows = tokens
    .map(token => {
      const theme = token.theme ? toLiteral(token.theme) : "undefined";

      return `    {
      path: ${toLiteral(token.path)},
      type: ${token.type ? toLiteral(token.type) : "undefined"},
      value: ${toLiteral(token.cssValue)},
      cssVar: ${toLiteral(token.cssVar)},
      description: ${token.description ? toLiteral(token.description) : "undefined"},
      theme: ${theme}
    }`;
    })
    .join(",\n");

  return `import type { CSSProperties, ReactElement } from "react";

export interface TokenTableRow {
  path: string;
  type?: string;
  value: string;
  cssVar: string;
  description?: string;
  theme?: string;
}

const TOKENS: TokenTableRow[] = [
${rows || ""}
];

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "13px"
};

const cellStyle: CSSProperties = {
  borderBottom: "1px solid rgba(0,0,0,0.1)",
  padding: "8px 10px",
  textAlign: "left",
  verticalAlign: "top"
};

const swatchStyle = (value: string): CSSProperties => ({
  display: "inline-block",
  width: "14px",
  height: "14px",
  borderRadius: "3px",
  marginRight: "8px",
  verticalAlign: "middle",
  border: "1px solid rgba(0,0,0,0.15)",
  background: value
});

export interface TokenTableBlockProps {
  /** Optional path prefix filter (e.g. \`color\`). */
  filter?: string;
  /** Optional DTCG \`$type\` filter. */
  type?: string;
}

/**
 * Token reference table for Storybook MDX docs.
 */
export function TokenTableBlock({
  filter,
  type
}: TokenTableBlockProps = {}): ReactElement {
  const rows = TOKENS.filter(token => {
    if (filter && !token.path.startsWith(filter)) {
      return false;
    }
    if (type && token.type !== type) {
      return false;
    }
    return true;
  });

  return (
    <table style={tableStyle}>
      <thead>
        <tr>
          <th style={cellStyle}>Path</th>
          <th style={cellStyle}>Type</th>
          <th style={cellStyle}>Value</th>
          <th style={cellStyle}>CSS variable</th>
          <th style={cellStyle}>Description</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(token => (
          <tr key={token.theme ? \`\${token.theme}:\${token.path}\` : token.path}>
            <td style={cellStyle}>
              <code>{token.path}</code>
              {token.theme ? \` (\${token.theme})\` : null}
            </td>
            <td style={cellStyle}>{token.type ?? "—"}</td>
            <td style={cellStyle}>
              {token.type === "color" ? <span style={swatchStyle(token.value)} /> : null}
              <code>{token.value}</code>
            </td>
            <td style={cellStyle}>
              <code>{token.cssVar}</code>
            </td>
            <td style={cellStyle}>{token.description ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
`;
}

/**
 * Build MDX documentation pages that compose the generated doc blocks.
 */
export function renderTokensMdx(
  options: Pick<StorybookPluginOptions, "titlePrefix"> & {
    hasColors: boolean;
    hasTypography: boolean;
  }
): string {
  const titlePrefix = options.titlePrefix ?? "Design Tokens";
  const colorSection = options.hasColors
    ? `
## Colors

<ColorPaletteBlock />
`
    : "";
  const typographySection = options.hasTypography
    ? `
## Typography

<TypesetBlock />
`
    : "";

  return `import { Meta } from "@storybook/addon-docs/blocks";
import { ColorPaletteBlock } from "./blocks/ColorPalette";
import { TokenTableBlock } from "./blocks/TokenTable";
import { TypesetBlock } from "./blocks/Typeset";

<Meta title="${escapeString(titlePrefix)}/Overview" />

# ${titlePrefix}

Design tokens generated by \`@razorwind/storybook\` for Storybook MDX docs.
${colorSection}${typographySection}
## All tokens

<TokenTableBlock />
`;
}

export function renderColorsMdx(
  options: Pick<StorybookPluginOptions, "titlePrefix"> = {}
): string {
  const titlePrefix = options.titlePrefix ?? "Design Tokens";

  return `import { Meta } from "@storybook/addon-docs/blocks";
import { ColorPaletteBlock } from "./blocks/ColorPalette";

<Meta title="${escapeString(titlePrefix)}/Colors" />

# Colors

<ColorPaletteBlock />
`;
}

export function renderTypographyMdx(
  options: Pick<StorybookPluginOptions, "titlePrefix"> = {}
): string {
  const titlePrefix = options.titlePrefix ?? "Design Tokens";

  return `import { Meta } from "@storybook/addon-docs/blocks";
import { TypesetBlock } from "./blocks/Typeset";

<Meta title="${escapeString(titlePrefix)}/Typography" />

# Typography

<TypesetBlock />
`;
}

function readString(
  item: Record<string, unknown>,
  key: string
): string | undefined {
  const value = item[key];

  return typeof value === "string" ? value : undefined;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Build a React IconGallery doc block from schema icons.
 *
 * @see https://storybook.js.org/docs/api/doc-blocks/doc-block-icongallery
 */
export function renderIconGalleryBlock(icons: unknown): string {
  const items = isObject(icons)
    ? Object.values(icons)
        .filter(isObject)
        .toSorted((a, b) =>
          (readString(a, "name") ?? "").localeCompare(
            readString(b, "name") ?? ""
          )
        )
    : [];

  const entries = items
    .map(icon => {
      const name = readString(icon, "name") ?? "unknown";
      const files = Array.isArray(icon.files) ? icon.files : [];
      const svg = files.find(
        file =>
          isObject(file) &&
          readString(file, "type") === "svg" &&
          typeof file.content === "string"
      );

      const preview =
        isObject(svg) && typeof svg.content === "string"
          ? `<span
          style={{ display: "inline-flex", width: 24, height: 24 }}
          dangerouslySetInnerHTML={{ __html: ${toLiteral(svg.content)} }}
        />`
          : `<code>${escapeString(name)}</code>`;

      return `    <IconItem name={${toLiteral(name)}}>
      ${preview}
    </IconItem>`;
    })
    .join("\n");

  return `import { IconGallery, IconItem } from "@storybook/addon-docs/blocks";

/**
 * Icons rendered with Storybook's IconGallery doc block.
 *
 * @see https://storybook.js.org/docs/api/doc-blocks/doc-block-icongallery
 */
export function IconGalleryBlock() {
  return (
    <IconGallery>
${entries || "      {/* No icons */}"}
    </IconGallery>
  );
}
`;
}

export function renderIconsMdx(
  options: Pick<StorybookPluginOptions, "titlePrefix"> = {}
): string {
  const titlePrefix = options.titlePrefix ?? "Design Tokens";

  return `import { Meta } from "@storybook/addon-docs/blocks";
import { IconGalleryBlock } from "./blocks/IconGallery";

<Meta title="${escapeString(titlePrefix)}/Icons" />

# Icons

<IconGalleryBlock />
`;
}

export function renderBlocksIndex(): string {
  return `export { ColorPaletteBlock } from "./ColorPalette";
export { IconGalleryBlock } from "./IconGallery";
export { TokenTableBlock } from "./TokenTable";
export type { TokenTableBlockProps, TokenTableRow } from "./TokenTable";
export { TypesetBlock } from "./Typeset";
`;
}

const STORYBOOK_THEME_KEYS = new Set<string>([
  "base",
  "colorPrimary",
  "colorSecondary",
  "appBg",
  "appContentBg",
  "appHoverBg",
  "appPreviewBg",
  "appBorderColor",
  "appBorderRadius",
  "fontBase",
  "fontCode",
  "textColor",
  "textInverseColor",
  "textMutedColor",
  "barTextColor",
  "barHoverColor",
  "barSelectedColor",
  "barBg",
  "buttonBg",
  "buttonBorder",
  "booleanBg",
  "booleanSelectedBg",
  "inputBg",
  "inputBorder",
  "inputTextColor",
  "inputBorderRadius",
  "brandTitle",
  "brandUrl",
  "brandImage",
  "brandTarget",
  "gridCellSize"
]);

function isStorybookTheme(value: unknown): value is StorybookTheme {
  if (!isObject(value)) {
    return false;
  }

  return value.base === "light" || value.base === "dark";
}

function isThemePartial(value: unknown): value is StorybookThemePartial {
  if (!isObject(value)) {
    return false;
  }

  if (isStorybookTheme(value)) {
    return true;
  }

  return Object.keys(value).some(key => STORYBOOK_THEME_KEYS.has(key));
}

function isThemeRecord(
  value: unknown
): value is Record<string, StorybookThemePartial> {
  if (!isObject(value) || isThemePartial(value)) {
    return false;
  }

  const values = Object.values(value);

  return values.length > 0 && values.every(isThemePartial);
}

function inferThemeBase(
  name: string,
  theme: StorybookThemePartial,
  specTheme?: string
): "light" | "dark" {
  if (theme.base === "light" || theme.base === "dark") {
    return theme.base;
  }

  const haystack = `${name} ${specTheme ?? ""}`.toLowerCase();

  return haystack.includes("light") ? "light" : "dark";
}

function toPropertyKey(name: string): string {
  return /^[a-z_$][\w$]*$/i.test(name) ? name : toLiteral(name);
}

function tokensForThemeSet(sets: TokenSet[], theme: TokenSet) {
  const base = sets.find(set => set.id === SHARED_THEME_ID);
  if (!base || isSharedThemeId(theme.id)) {
    return theme.tokens;
  }

  return mergeTokenTrees(theme.tokens, base.tokens);
}

function applyMappedTheme(
  name: string,
  theme: StorybookThemePartial,
  identity: { title?: string; homepage?: string; logo?: string },
  fonts: Fonts | undefined,
  specTheme?: string
): StorybookTheme {
  return applyBrandDefaults(
    inferThemeBase(name, theme, specTheme),
    theme,
    identity,
    fonts
  );
}

/**
 * Fill Storybook brand fields from Schema identity when the mapped theme omits them.
 */
export function applyBrandDefaults(
  base: "light" | "dark",
  theme: PartialKeys<StorybookTheme, "base">,
  identity: { title?: string; homepage?: string; logo?: string },
  fonts?: Fonts
): StorybookTheme {
  const sans = pickFontByRole(fonts, SANS_ROLES);
  const mono = pickFontByRole(fonts, MONO_ROLES);

  return {
    brandTarget: "_blank",
    base: base || "light",
    ...theme,
    brandTitle: theme.brandTitle ?? identity.title,
    brandUrl: theme.brandUrl ?? identity.homepage,
    brandImage: theme.brandImage ?? identity.logo,
    fontBase: theme.fontBase ?? (sans ? cssFontFamily(sans) : undefined),
    fontCode: theme.fontCode ?? (mono ? cssFontFamily(mono) : undefined)
  };
}

function renderCreateCall(theme: StorybookTheme, indent = ""): string {
  const entries = Object.entries(theme)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${indent}  ${key}: ${toLiteral(value)}`)
    .join(",\n");

  return `create({\n${entries}\n${indent}})`;
}

function renderSingleThemeFile(theme: StorybookTheme): string {
  return `import { create } from "storybook/theming";

/**
 * Storybook UI theme generated by \`@razorwind/storybook\`.
 *
 * @see https://storybook.js.org/docs/configure/user-interface/theming
 */
export default ${renderCreateCall(theme)};
`;
}

function renderThemeRecordFile(themes: Record<string, StorybookTheme>): string {
  const entries = Object.entries(themes)
    .map(
      ([name, theme]) =>
        `  ${toPropertyKey(name)}: ${renderCreateCall(theme, "  ")}`
    )
    .join(",\n");

  return `import { create } from "storybook/theming";

/**
 * Storybook UI themes generated by \`@razorwind/storybook\`.
 *
 * @see https://storybook.js.org/docs/configure/user-interface/theming
 */
export default {
${entries}
};
`;
}

/**
 * Serialize Storybook theme(s) as a `storybook/theming` `create()` module.
 *
 * A single theme becomes `export default create({…})`. Multiple named themes
 * become a record: `{ light: create({…}), dark: create({…}) }`.
 *
 * @see https://storybook.js.org/docs/configure/user-interface/theming
 */
export function renderThemeFile(
  theme: StorybookTheme | Record<string, StorybookTheme>
): string {
  if (isStorybookTheme(theme)) {
    return renderSingleThemeFile(theme);
  }

  const entries = Object.entries(theme);
  if (entries.length !== 1) {
    return renderThemeRecordFile(theme);
  }

  const [, single] = entries[0] ?? [];
  if (!single) {
    return renderThemeRecordFile(theme);
  }

  return renderSingleThemeFile(single);
}

/**
 * Normalize {@link StorybookPluginOptions.mapTheme} results into a named
 * theme record. Multi-theme token sets are mapped per theme when `mapTheme`
 * returns a single theme object.
 */
export function normalizeThemes(
  mapped: unknown,
  spec: Pick<Schema, "tokens" | "theme" | "fonts">,
  identity: { title?: string; homepage?: string; logo?: string },
  mapTheme: NonNullable<StorybookPluginOptions["mapTheme"]>
): Record<string, StorybookTheme> {
  const apply = (name: string, theme: StorybookThemePartial): StorybookTheme =>
    applyMappedTheme(name, theme, identity, spec.fonts, spec.theme);

  if (isThemeRecord(mapped)) {
    return Object.fromEntries(
      Object.entries(mapped).map(([name, theme]) => [name, apply(name, theme)])
    );
  }

  const sets = resolveTokenSets(spec.tokens);
  const themes = sets.filter(set => !isSharedThemeId(set.id));

  if (themes.length > 1) {
    const result: Record<string, StorybookTheme> = {};

    for (const set of themes) {
      const perTheme = mapTheme(tokensForThemeSet(sets, set));
      if (isThemeRecord(perTheme)) {
        const match = perTheme[set.id];
        if (match) {
          result[set.id] = apply(set.id, match);
          continue;
        }

        for (const [name, theme] of Object.entries(perTheme)) {
          result[name] = apply(name, theme);
        }
        continue;
      }

      if (isThemePartial(perTheme)) {
        result[set.id] = apply(set.id, perTheme);
      }
    }

    return result;
  }

  if (isThemePartial(mapped)) {
    const name =
      themes[0] && themes[0].id !== "default"
        ? themes[0].id
        : (spec.theme ?? "default");

    return { [name]: apply(name, mapped) };
  }

  return {};
}

const getCreateDocument =
  (outputPath: string) =>
  (
    file: string,
    content: string,
    language?: string
  ): GeneratorFunctionResult<Schema, StorybookPluginOptions>[string] => {
    return createDocument<Schema, StorybookPluginOptions>(
      joinPaths(outputPath, file),
      content,
      { name: "razorwind-storybook" },
      false,
      language
    );
  };

export { renderInstallMd };

/**
 * Generate Storybook MDX / React token doc blocks from a Razorwind schema.
 */
export function generateTokenDocs(
  spec: Schema,
  options: StorybookPluginOptions = {}
): GeneratorFunctionResult<Schema, StorybookPluginOptions> {
  const outputPath = options.outputPath ?? "storybook/tokens";
  const identity = resolveSchemaIdentity(spec);
  const titlePrefix = options.titlePrefix ?? identity.title ?? "Design Tokens";
  const docsOptions = { ...options, titlePrefix };
  const flat = flattenTokens(spec.tokens, options);
  const hasColors = flat.some(token => token.type === "color");
  const hasTypography =
    (spec.fonts && Object.keys(spec.fonts).length > 0) ||
    flat.some(
      token =>
        token.type === "fontFamily" ||
        token.type === "fontWeight" ||
        token.type === "typography" ||
        (token.type === "dimension" &&
          /(?:font|type|text).*size|size.*(?:font|type|text)/i.test(token.path))
    );
  const hasIcons =
    !options.skipIcons &&
    isObject(spec.icons) &&
    Object.keys(spec.icons).length > 0;

  const createDoc = getCreateDocument(outputPath);

  const documents: GeneratorFunctionResult<Schema, StorybookPluginOptions> = {
    [joinPaths(outputPath, "blocks/ColorPalette.tsx")]: createDoc(
      "blocks/ColorPalette.tsx",
      renderColorPaletteBlock(flat, docsOptions),
      "tsx"
    ),
    [joinPaths(outputPath, "blocks/Typeset.tsx")]: createDoc(
      "blocks/Typeset.tsx",
      renderTypesetBlock(flat, { ...docsOptions, fonts: spec.fonts }),
      "tsx"
    ),
    [joinPaths(outputPath, "blocks/TokenTable.tsx")]: createDoc(
      "blocks/TokenTable.tsx",
      renderTokenTableBlock(flat),
      "tsx"
    ),
    [joinPaths(outputPath, "blocks/IconGallery.tsx")]: createDoc(
      "blocks/IconGallery.tsx",
      renderIconGalleryBlock(options.skipIcons ? {} : spec.icons),
      "tsx"
    ),
    [joinPaths(outputPath, "blocks/index.ts")]: createDoc(
      "blocks/index.ts",
      renderBlocksIndex(),
      "typescript"
    ),
    [joinPaths(outputPath, "Tokens.mdx")]: createDoc(
      "Tokens.mdx",
      renderTokensMdx({
        titlePrefix,
        hasColors,
        hasTypography
      }),
      "mdx"
    )
  };

  if (hasColors) {
    documents[joinPaths(outputPath, "Colors.mdx")] = createDoc(
      "Colors.mdx",
      renderColorsMdx(docsOptions),
      "mdx"
    );
  }

  if (hasTypography) {
    documents[joinPaths(outputPath, "Typography.mdx")] = createDoc(
      "Typography.mdx",
      renderTypographyMdx(docsOptions),
      "mdx"
    );
  }

  if (hasIcons) {
    documents[joinPaths(outputPath, "Icons.mdx")] = createDoc(
      "Icons.mdx",
      renderIconsMdx(docsOptions),
      "mdx"
    );
  }

  documents[joinPaths(outputPath, "tokens.json")] = createDoc(
    "tokens.json",
    `${JSON.stringify(flat, null, 2)}\n`,
    "json"
  );

  let themeNames: string[] | undefined;

  if (options.mapTheme) {
    const themes = normalizeThemes(
      options.mapTheme(spec.tokens),
      spec,
      identity,
      options.mapTheme
    );

    if (Object.keys(themes).length > 0) {
      themeNames = Object.keys(themes);
      documents[joinPaths(outputPath, "theme.ts")] = createDoc(
        "theme.ts",
        renderThemeFile(themes),
        "typescript"
      );
    }
  }

  const installPath = "INSTALL.md";
  documents[joinPaths(outputPath, installPath)] = createDoc(
    installPath,
    options.installGuide ??
      renderInstallMd({
        outputPath,
        titlePrefix,
        themeFiles: themeNames ? ["theme.ts"] : undefined,
        themeNames
      }),
    "markdown"
  );

  return documents;
}
