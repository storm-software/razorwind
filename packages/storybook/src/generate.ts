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
import type {
  GuidelineEntry,
  GuidelineGroup,
  TokenSet
} from "@razorwind/core/utils";
import {
  createDocument,
  cssVarPrefixFromName,
  escapeMdx,
  groupGuidelines,
  isSharedThemeId,
  mergeTokenTrees,
  renderGuidelineBody,
  resolveSchemaIdentity,
  SHARED_THEME_ID,
  toThemeCssVar
} from "@razorwind/core/utils";
import {
  extractFonts,
  FONT_CHARACTER_SET,
  FONT_SPECIMEN_SIZES,
  FONT_SPECIMEN_TEXT,
  FONT_WEIGHT_NAMES,
  FONT_WEIGHT_SPECIMEN_SIZE,
  fontSlug,
  fontSlugs,
  guidelinePath,
  renderFontBody,
  resolveFontStack,
  resolveFontWeights
} from "@razorwind/docgen/generate";
import { joinPaths } from "@stryke/path/join";
import type { PartialKeys } from "@stryke/types/base";
import { flattenTokens, resolveTokenSets } from "./flatten";
import { escapeString, formatTokenValue, toLiteral } from "./format";
import { renderInstallMd } from "./install";
import type {
  FlatToken,
  StorybookPluginOptions,
  StorybookTheme,
  StorybookThemePartial
} from "./types";

export {
  extractFonts,
  fontSlug,
  fontSlugs,
  resolveFontStack,
  resolveFontWeights
} from "@razorwind/docgen/generate";

const DEFAULT_SAMPLE_TEXT = FONT_SPECIMEN_TEXT;
const TYPOGRAPHY_TOKEN_TYPES = new Set([
  "fontFamily",
  "fontWeight",
  "typography"
]);
const TYPOGRAPHY_DIMENSION_PATTERN =
  /font|typography|type|text|line[-_.]?height|letter[-_.]?spacing/i;

type TokenVariants = Record<string, FlatToken[]>;

function isTypographyToken(token: FlatToken): boolean {
  if (TYPOGRAPHY_TOKEN_TYPES.has(token.type ?? "")) {
    return true;
  }

  return (
    (token.type === "dimension" || token.type === "number") &&
    TYPOGRAPHY_DIMENSION_PATTERN.test(token.path)
  );
}

function hasTokenPathPrefix(tokens: FlatToken[], prefixes: string[]): boolean {
  return tokens.some(token =>
    prefixes.some(
      prefix => token.path === prefix || token.path.startsWith(`${prefix}.`)
    )
  );
}

const DTCG_ALIAS_PATTERN = /^\{([^{}]+)\}$/;
const CSS_VAR_PATTERN = /^var\((--[^),\s]+)(?:\s*,[^)]*)?\)$/;

function readAliasPath(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  return DTCG_ALIAS_PATTERN.exec(value.trim())?.[1]?.trim();
}

function readCssVarName(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  return CSS_VAR_PATTERN.exec(value.trim())?.[1];
}

/**
 * Replace color aliases with their terminal literal for docs. The emitted CSS
 * variable remains in the separate CSS-variable column, but Storybook's
 * palette and swatch preview receive a concrete color they can display.
 */
function resolveColorValues(tokens: FlatToken[]): FlatToken[] {
  const byPath = new Map(tokens.map(token => [token.path, token]));
  const byCssVar = new Map(
    tokens.map(token => [toThemeCssVar(token.path), token])
  );

  const resolve = (token: FlatToken): string => {
    let current = token;
    const seen = new Set<string>();

    for (let depth = 0; depth < 8; depth++) {
      if (seen.has(current.path)) {
        return token.cssValue;
      }
      seen.add(current.path);

      const next =
        byPath.get(readAliasPath(current.value) ?? "") ??
        byCssVar.get(
          readCssVarName(current.value) ??
            readCssVarName(current.cssValue) ??
            ""
        );

      if (!next || next.path === current.path) {
        return current.cssValue;
      }

      current = next;
    }

    return token.cssValue;
  };

  return tokens.map(token =>
    token.type === "color" ? { ...token, cssValue: resolve(token) } : token
  );
}

function hasThemeVariants(variants: TokenVariants): boolean {
  return Object.keys(variants).length > 1;
}

function renderVariantResolver(): string {
  return `/**
 * Select a generated token variant. Callers may pass \`theme\` to override
 * the generated fallback without requiring Storybook preview-hook context.
 */
export function resolveThemeVariant<T extends Record<string, unknown>>(
  variants: T,
  fallback: keyof T & string,
  theme?: string
): keyof T & string {
  return typeof theme === "string" && theme in variants
    ? (theme as keyof T & string)
    : fallback;
}
`;
}

function resolveTokenVariants(
  tokens: Schema["tokens"],
  options: Pick<StorybookPluginOptions, "cssVarPrefix" | "includeTypes">
): TokenVariants {
  const sets = resolveTokenSets(tokens);
  const themes = sets.filter(set => !isSharedThemeId(set.id));

  if (themes.length <= 1) {
    return { default: resolveColorValues(flattenTokens(tokens, options)) };
  }

  return Object.fromEntries(
    themes.map(theme => [
      theme.id,
      resolveColorValues(flattenTokens(tokensForThemeSet(sets, theme), options))
    ])
  );
}

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
  variants: TokenVariants,
  options: Pick<StorybookPluginOptions, "colorGroupBy"> = {}
): string {
  const groupBy = options.colorGroupBy ?? 2;
  const variantEntries = Object.entries(variants);
  const defaultTheme = variantEntries[0]?.[0] ?? "default";
  const themed = hasThemeVariants(variants);
  const renderItems = (sectionTokens: FlatToken[], indent = "    ") =>
    [...groupByPath(sectionTokens, groupBy).entries()]
      .toSorted(([a], [b]) => a.localeCompare(b))
      .map(([group, groupTokens]) => {
        const colorsObject = groupTokens
          .map(token => {
            const label = leafLabel(token.path, group);

            return `${indent}  ${toLiteral(label)}: ${toLiteral(token.cssValue)}`;
          })
          .join(",\n");

        const subtitle =
          groupTokens.find(token => token.description)?.description ??
          `${groupTokens.length} token${groupTokens.length === 1 ? "" : "s"}`;

        return `${indent}<ColorItem
      title={${toLiteral(group)}}
      subtitle={${toLiteral(subtitle)}}
      colors={{
${colorsObject}
      }}
    />`;
      })
      .join("\n");

  const renderPalette = (tokens: FlatToken[]) => {
    const colors = tokens.filter(token => token.type === "color");
    const paletteColors = colors.filter(token => token.palette);
    const semanticColors = colors.filter(
      token => !token.palette || token.childTheme
    );
    const otherColors = colors.filter(
      token => !token.palette && !token.childTheme
    );
    const hasCategorizedColors =
      paletteColors.length > 0 || semanticColors.length > 0;
    const items = renderItems(colors);
    const sections = [
      ["Color palettes", paletteColors],
      ["Semantic colors", semanticColors],
      ["Colors", otherColors]
    ]
      .filter(
        (section): section is [string, FlatToken[]] => !!section[1]?.length
      )
      .map(
        ([title, sectionTokens]) => `      <section>
        <h2>${title}</h2>
        <ColorPalette>
${renderItems(sectionTokens, "          ")}
        </ColorPalette>
      </section>`
      )
      .join("\n");

    return hasCategorizedColors
      ? `<>\n${sections}\n    </>`
      : `<ColorPalette>\n${items || "      {/* No color tokens */}"}\n    </ColorPalette>`;
  };

  const paletteVariants = variantEntries
    .map(
      ([theme, tokens]) =>
        `  ${toLiteral(theme)}: (\n    ${renderPalette(tokens)}\n  )`
    )
    .join(",\n");

  return `import { ColorPalette, ColorItem } from "@storybook/addon-docs/blocks";
${themed ? 'import { resolveThemeVariant } from "./ThemeVariant";\n' : ""}

/**
 * Color tokens rendered with Storybook's ColorPalette doc block.
 *
 * @see https://storybook.js.org/docs/api/doc-blocks/doc-block-colorpalette
 */
const COLOR_VARIANTS = {
${paletteVariants}
};

export interface ColorPaletteBlockProps {
  /** Generated token-set name. Defaults to the first generated variant. */
  theme?: string;
}

export function ColorPaletteBlock({ theme }: ColorPaletteBlockProps = {}) {
  const activeTheme = ${themed ? `resolveThemeVariant(COLOR_VARIANTS, ${toLiteral(defaultTheme)}, theme)` : toLiteral(defaultTheme)};

  return COLOR_VARIANTS[activeTheme];
}
`;
}

/**
 * Build a React Typeset doc block from typography-related tokens.
 *
 * @see https://storybook.js.org/docs/api/doc-blocks/doc-block-typeset
 */
export function renderTypesetBlock(
  variants: TokenVariants,
  options: Pick<StorybookPluginOptions, "sampleText"> & { fonts?: Fonts } = {}
): string {
  const sampleText = options.sampleText ?? DEFAULT_SAMPLE_TEXT;
  const themed = hasThemeVariants(variants);
  const variantEntries = Object.entries(variants);
  const defaultTheme = variantEntries[0]?.[0] ?? "default";
  const renderTypeset = (tokens: FlatToken[]) => {
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

    return `<Typeset
      fontFamily={${toLiteral(fontFamily)}}
      fontSizes={${sizesLiteral}}
      fontWeight={${toLiteral(fontWeight)}}
      sampleText={${toLiteral(sampleText)}}
    />`;
  };
  const typesetVariants = variantEntries
    .map(
      ([theme, tokens]) => `  ${toLiteral(theme)}: (${renderTypeset(tokens)})`
    )
    .join(",\n");

  return `import { Typeset } from "@storybook/addon-docs/blocks";
${themed ? 'import { resolveThemeVariant } from "./ThemeVariant";\n' : ""}

/**
 * Typography tokens rendered with Storybook's Typeset doc block.
 *
 * @see https://storybook.js.org/docs/api/doc-blocks/doc-block-typeset
 */
const TYPESET_VARIANTS = {
${typesetVariants}
};

export interface TypesetBlockProps {
  /** Generated token-set name. Defaults to the first generated variant. */
  theme?: string;
}

export function TypesetBlock({ theme }: TypesetBlockProps = {}) {
  const activeTheme = ${themed ? `resolveThemeVariant(TYPESET_VARIANTS, ${toLiteral(defaultTheme)}, theme)` : toLiteral(defaultTheme)};

  return TYPESET_VARIANTS[activeTheme];
}
`;
}

/**
 * Build a TokenTable React doc block listing flattened tokens.
 *
 * Mirrors the swatchbook TokenTable idea for MDX docs, using a static table
 * baked from the generator input.
 */
export function renderTokenTableBlock(variants: TokenVariants): string {
  const themed = hasThemeVariants(variants);
  const variantEntries = Object.entries(variants);
  const defaultTheme = variantEntries[0]?.[0] ?? "default";
  const renderRows = (tokens: FlatToken[]) =>
    tokens
      .map(token => {
        const theme = token.theme ? toLiteral(token.theme) : "undefined";

        return `    {
      path: ${toLiteral(token.path)},
      type: ${token.type ? toLiteral(token.type) : "undefined"},
      value: ${toLiteral(token.cssValue)},
      cssVar: ${toLiteral(token.cssVar)},
      description: ${token.description ? toLiteral(token.description) : "undefined"},
      theme: ${theme},
      typography: ${isTypographyToken(token)}
    }`;
      })
      .join(",\n");
  const rowsByTheme = variantEntries
    .map(
      ([theme, tokens]) => `  ${toLiteral(theme)}: [
${renderRows(tokens)}
  ]`
    )
    .join(",\n");

  return `import type { CSSProperties, ReactElement } from "react";
${themed ? 'import { resolveThemeVariant } from "./ThemeVariant";\n' : ""}

export interface TokenTableRow {
  path: string;
  type?: string;
  value: string;
  cssVar: string;
  description?: string;
  theme?: string;
  typography: boolean;
}

const TOKEN_VARIANTS: Record<string, TokenTableRow[]> = {
${rowsByTheme}
};

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
  /** Optional path prefix filter or filters (e.g. \`color\`). */
  filter?: string | string[];
  /** Optional DTCG \`$type\` filter. */
  type?: string;
  /** Restrict rows to tokens used to define typography. */
  typography?: boolean;
  /** Generated token-set name. Defaults to the first generated variant. */
  theme?: string;
}

/**
 * Token reference table for Storybook MDX docs.
 */
export function TokenTableBlock({
  filter,
  type,
  typography,
  theme
}: TokenTableBlockProps = {}): ReactElement {
  const activeTheme = ${themed ? `resolveThemeVariant(TOKEN_VARIANTS, ${toLiteral(defaultTheme)}, theme)` : toLiteral(defaultTheme)};
  const rows = TOKEN_VARIANTS[activeTheme].filter(token => {
    const filters = typeof filter === "string" ? [filter] : filter;
    if (
      filters &&
      !filters.some(prefix =>
        token.path === prefix || token.path.startsWith(\`\${prefix}.\`)
      )
    ) {
      return false;
    }
    if (type && token.type !== type) {
      return false;
    }
    if (typography && !token.typography) {
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
    hasSizes: boolean;
    hasSpaces: boolean;
    hasFonts: boolean;
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
  const sizeSection = options.hasSizes
    ? `
## Size

<TokenTableBlock filter="size" />
`
    : "";
  const spaceSection = options.hasSpaces
    ? `
## Space

<TokenTableBlock filter={[
  "space",
  "spacing"
]} />
`
    : "";
  const fontsSection = options.hasFonts
    ? `
## Fonts

<FontSpecimenBlock />
`
    : "";

  return `import { Meta } from "@storybook/addon-docs/blocks";
import { ColorPaletteBlock } from "./blocks/ColorPalette";
import { TokenTableBlock } from "./blocks/TokenTable";
import { TypesetBlock } from "./blocks/Typeset";
${options.hasFonts ? 'import { FontSpecimenBlock } from "./blocks/FontSpecimen";\n' : ""}
<Meta title="${escapeString(titlePrefix)}/Overview" />

# ${titlePrefix}

Design tokens generated by \`@razorwind/storybook\` for Storybook MDX docs.
${colorSection}${typographySection}${sizeSection}${spaceSection}${fontsSection}
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
import { TokenTableBlock } from "./blocks/TokenTable";

<Meta title="${escapeString(titlePrefix)}/Typography" />

# Typography

<TypesetBlock />

## Typography tokens

<TokenTableBlock typography />
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

/**
 * Build a React FontSpecimen doc block previewing each font at a range of
 * sizes and at each of its font weights.
 */
export function renderFontSpecimenBlock(
  fonts: Record<string, unknown>[],
  options: Pick<StorybookPluginOptions, "sampleText"> = {}
): string {
  const sampleText = options.sampleText ?? DEFAULT_SAMPLE_TEXT;
  const entries = fonts
    .map(font => {
      const name = readString(font, "name") ?? "unknown";
      const family = resolveFontStack(font);

      return `  ${toLiteral(name)}: {
    family: ${toLiteral(family)},
    title: ${toLiteral(readString(font, "title") ?? name)},
    weights: [${resolveFontWeights(font).join(", ")}]
  }`;
    })
    .join(",\n");
  const sizesLiteral = `[${FONT_SPECIMEN_SIZES.join(", ")}]`;
  const weightNames = Object.entries(FONT_WEIGHT_NAMES)
    .map(([weight, weightName]) => `  ${weight}: ${toLiteral(weightName)}`)
    .join(",\n");

  return `import type { CSSProperties, ReactElement } from "react";

export interface FontSpecimenBlockProps {
  /** Font entry name. Defaults to the first font. */
  name?: string;
  /** Override the rendered sample text. */
  sampleText?: string;
  /** Override the previewed sizes. */
  sizes?: number[];
  /** Override the previewed font weights. Defaults to the weights the font provides. */
  weights?: number[];
}

const FONT_FAMILIES: Record<
  string,
  { family: string; title: string; weights: number[] }
> = {
${entries || "  // No fonts"}
};

const WEIGHT_NAMES: Record<number, string> = {
${weightNames}
};

const DEFAULT_FONT = ${toLiteral(fonts[0] ? (readString(fonts[0], "name") ?? "unknown") : "unknown")};
const DEFAULT_SIZES = ${sizesLiteral};
const DEFAULT_SAMPLE_TEXT = ${toLiteral(sampleText)};
const WEIGHT_SAMPLE_SIZE = ${FONT_WEIGHT_SPECIMEN_SIZE};

const labelStyle: CSSProperties = {
  display: "block",
  fontSize: "12px",
  fontWeight: 400,
  lineHeight: 1.4,
  fontFamily: "system-ui, sans-serif",
  color: "rgba(128, 128, 128, 0.9)"
};

function weightLabel(weight: number): string {
  const weightName = WEIGHT_NAMES[weight];

  return weightName ? \`\${weight} · \${weightName}\` : String(weight);
}

/**
 * Font specimen previews for Storybook MDX docs.
 */
export function FontSpecimenBlock({
  name,
  sampleText = DEFAULT_SAMPLE_TEXT,
  sizes = DEFAULT_SIZES,
  weights
}: FontSpecimenBlockProps = {}): ReactElement {
  const entry = (name && FONT_FAMILIES[name]) || FONT_FAMILIES[DEFAULT_FONT];

  if (!entry) {
    return <p>No fonts found.</p>;
  }

  return (
    <div>
      <div
        style={{
          fontFamily: entry.family,
          fontSize: "32px",
          lineHeight: 1.25,
          margin: "0 0 0.5em"
        }}>
        ${FONT_CHARACTER_SET}
      </div>
      {sizes.map(size => (
        <div
          key={size}
          style={{
            fontFamily: entry.family,
            fontSize: \`\${size}px\`,
            lineHeight: 1.45,
            margin: "0 0 0.4em"
          }}>
          <span style={labelStyle}>{size}px</span>
          {sampleText}
        </div>
      ))}
      {(weights ?? entry.weights).map(weight => (
        <div
          key={\`weight-\${weight}\`}
          style={{
            fontFamily: entry.family,
            fontSize: \`\${WEIGHT_SAMPLE_SIZE}px\`,
            fontWeight: weight,
            lineHeight: 1.45,
            margin: "0 0 0.4em"
          }}>
          <span style={labelStyle}>{weightLabel(weight)}</span>
          {sampleText}
        </div>
      ))}
    </div>
  );
}
`;
}

export function renderFontsMdx(
  options: Pick<StorybookPluginOptions, "titlePrefix"> & {
    fonts: Record<string, unknown>[];
    slugs: Map<Record<string, unknown>, string>;
  }
): string {
  const titlePrefix = options.titlePrefix ?? "Design Tokens";
  const links = options.fonts.map(font => {
    const name = readString(font, "name") ?? "unknown";
    const title = readString(font, "title") ?? name;
    const slug = options.slugs.get(font) ?? fontSlug(font);

    return `- [${title}](./Fonts/${slug}.mdx)`;
  });

  return `import { Meta } from "@storybook/addon-docs/blocks";

<Meta title="${escapeString(titlePrefix)}/Fonts" />

# Fonts

${options.fonts.length} font${options.fonts.length === 1 ? "" : "s"} in the design system.

${links.join("\n")}
`;
}

export function renderFontMdx(
  font: Record<string, unknown>,
  _fontName: string,
  options: Pick<
    StorybookPluginOptions,
    "fontAssetBaseUrl" | "sampleText" | "titlePrefix"
  > = {}
): string {
  const titlePrefix = options.titlePrefix ?? "Design Tokens";
  const name = readString(font, "name") ?? "unknown";
  const title = readString(font, "title") ?? name;

  return `import { Meta } from "@storybook/addon-docs/blocks";

<Meta title="${escapeString(titlePrefix)}/Fonts/${escapeString(title)}" />

# ${title}

${renderFontBody(font, options.sampleText, options.fontAssetBaseUrl)}
`;
}

export function renderGuidelineMdx(
  group: GuidelineGroup,
  entry: GuidelineEntry,
  options: Pick<StorybookPluginOptions, "titlePrefix"> = {}
): string {
  const titlePrefix = options.titlePrefix ?? "Design Tokens";
  const { guideline } = entry;
  const title = [
    titlePrefix,
    "Guidelines",
    ...(group.title ? group.title.split(" / ") : []),
    guideline.name
  ]
    .map(escapeString)
    .join("/");

  return `import { Meta } from "@storybook/addon-docs/blocks";

<Meta title="${title}" />

# ${escapeMdx(guideline.name)}
${guideline.version ? `\n_Version ${escapeMdx(guideline.version)}_\n` : ""}
${escapeMdx(renderGuidelineBody(guideline, 1))}
`;
}

export function renderBlocksIndex(hasIcons = true, hasFonts = true): string {
  return `export { ColorPaletteBlock } from "./ColorPalette";
export type { ColorPaletteBlockProps } from "./ColorPalette";
${hasIcons ? 'export { IconGalleryBlock } from "./IconGallery";\n' : ""}${hasFonts ? 'export { FontSpecimenBlock } from "./FontSpecimen";\nexport type { FontSpecimenBlockProps } from "./FontSpecimen";\n' : ""}export { TokenTableBlock } from "./TokenTable";
export type { TokenTableBlockProps, TokenTableRow } from "./TokenTable";
export { TypesetBlock } from "./Typeset";
export type { TypesetBlockProps } from "./Typeset";
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

/**
 * Unwrap a token node (`{ $value, $type, … }`) so mapTheme can pass either
 * the leaf or its `$value`.
 */
function unwrapTokenNode(value: unknown): unknown {
  if (
    isObject(value) &&
    "$value" in value &&
    !("colorSpace" in value) &&
    !("hex" in value)
  ) {
    return value.$value;
  }

  return value;
}

/**
 * Follow DTCG aliases to the terminal `$value` using `byPath`.
 */
function resolveAliasValue(
  value: unknown,
  byPath: Map<string, FlatToken>
): unknown {
  let current = unwrapTokenNode(value);
  const seen = new Set<string>();

  for (let depth = 0; depth < 8; depth++) {
    const aliasPath = readAliasPath(current);
    if (!aliasPath) {
      break;
    }
    if (seen.has(aliasPath)) {
      break;
    }
    seen.add(aliasPath);

    const token = byPath.get(aliasPath);
    if (!token) {
      break;
    }

    current = token.value;
  }

  return current;
}

/**
 * Turn a resolved token `$value` into a Storybook-friendly literal (hex,
 * oklch, `8px`, font stacks) instead of leaving DTCG objects in `theme.ts`.
 */
function formatResolvedThemeValue(value: unknown): unknown {
  if (
    value == null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  return formatTokenValue(value);
}

function tokenLookupForTheme(
  tokens: Schema["tokens"],
  themeName: string
): Map<string, FlatToken> {
  const sets = resolveTokenSets(tokens);
  const match =
    sets.find(set => set.id === themeName) ??
    (sets.length === 1 ? sets[0] : undefined);
  const tree = match ? tokensForThemeSet(sets, match) : tokens;
  const lookup = new Map<string, FlatToken>();

  for (const token of flattenTokens(tree)) {
    const existing = lookup.get(token.path);
    if (!existing || token.theme === themeName) {
      lookup.set(token.path, token);
    }
  }

  return lookup;
}

/**
 * Replace DTCG aliases (`{color.base.1}`) and color objects in mapped theme
 * fields with the terminal CSS color (or other formatted token value).
 */
function resolveThemeFields(
  theme: StorybookThemePartial,
  byPath: Map<string, FlatToken>
): StorybookThemePartial {
  const resolved = { ...theme };

  for (const [key, value] of Object.entries(theme)) {
    if (key === "base" || value === undefined) {
      continue;
    }

    (resolved as Record<string, unknown>)[key] = formatResolvedThemeValue(
      resolveAliasValue(value, byPath)
    );
  }

  return resolved;
}

function applyMappedTheme(
  name: string,
  theme: StorybookThemePartial,
  identity: { title?: string; homepage?: string; logo?: string },
  fonts: Fonts | undefined,
  spec: Pick<Schema, "tokens" | "theme">
): StorybookTheme {
  const resolved = resolveThemeFields(
    theme,
    tokenLookupForTheme(spec.tokens, name)
  );

  return applyBrandDefaults(
    inferThemeBase(name, resolved, spec.theme),
    resolved,
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
    applyMappedTheme(name, theme, identity, spec.fonts, spec);

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
  const docsOptions = {
    ...options,
    titlePrefix,
    cssVarPrefix: options.cssVarPrefix ?? cssVarPrefixFromName(spec.name)
  };
  const flat = flattenTokens(spec.tokens, docsOptions);
  const variants = resolveTokenVariants(spec.tokens, docsOptions);
  const hasColors = flat.some(token => token.type === "color");
  const hasTypography =
    (spec.fonts && Object.keys(spec.fonts).length > 0) ||
    flat.some(isTypographyToken);
  const hasSizes = hasTokenPathPrefix(flat, ["size"]);
  const hasSpaces = hasTokenPathPrefix(flat, ["space", "spacing"]);
  const hasIcons =
    !options.skipIcons &&
    isObject(spec.icons) &&
    Object.keys(spec.icons).length > 0;
  const fonts = options.skipFonts ? [] : extractFonts(spec.fonts);
  const hasFonts = fonts.length > 0;
  const fontPageSlugs = fontSlugs(fonts);

  const createDoc = getCreateDocument(outputPath);

  const documents: GeneratorFunctionResult<Schema, StorybookPluginOptions> = {
    [joinPaths(outputPath, "blocks/ColorPalette.tsx")]: createDoc(
      "blocks/ColorPalette.tsx",
      renderColorPaletteBlock(variants, docsOptions),
      "tsx"
    ),
    [joinPaths(outputPath, "blocks/Typeset.tsx")]: createDoc(
      "blocks/Typeset.tsx",
      renderTypesetBlock(variants, { ...docsOptions, fonts: spec.fonts }),
      "tsx"
    ),
    [joinPaths(outputPath, "blocks/TokenTable.tsx")]: createDoc(
      "blocks/TokenTable.tsx",
      renderTokenTableBlock(variants),
      "tsx"
    ),
    [joinPaths(outputPath, "blocks/index.ts")]: createDoc(
      "blocks/index.ts",
      renderBlocksIndex(hasIcons, hasFonts),
      "typescript"
    ),
    [joinPaths(outputPath, "Tokens.mdx")]: createDoc(
      "Tokens.mdx",
      renderTokensMdx({
        titlePrefix,
        hasColors,
        hasTypography,
        hasSizes,
        hasSpaces,
        hasFonts
      }),
      "mdx"
    )
  };

  if (hasIcons) {
    documents[joinPaths(outputPath, "blocks/IconGallery.tsx")] = createDoc(
      "blocks/IconGallery.tsx",
      renderIconGalleryBlock(spec.icons),
      "tsx"
    );
  }

  if (hasThemeVariants(variants)) {
    documents[joinPaths(outputPath, "blocks/ThemeVariant.ts")] = createDoc(
      "blocks/ThemeVariant.ts",
      renderVariantResolver(),
      "typescript"
    );
  }

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

  if (hasFonts) {
    documents[joinPaths(outputPath, "blocks/FontSpecimen.tsx")] = createDoc(
      "blocks/FontSpecimen.tsx",
      renderFontSpecimenBlock(fonts, docsOptions),
      "tsx"
    );
    documents[joinPaths(outputPath, "Fonts.mdx")] = createDoc(
      "Fonts.mdx",
      renderFontsMdx({ ...docsOptions, fonts, slugs: fontPageSlugs }),
      "mdx"
    );

    for (const font of fonts) {
      const slug = fontPageSlugs.get(font) ?? fontSlug(font);
      const fontName = readString(font, "name") ?? "unknown";
      const path = joinPaths("Fonts", `${slug}.mdx`);
      documents[joinPaths(outputPath, path)] = createDoc(
        path,
        renderFontMdx(font, fontName, docsOptions),
        "mdx"
      );
    }
  }

  if (!options.skipGuidelines) {
    for (const group of groupGuidelines(spec.guidelines)) {
      for (const entry of group.guidelines) {
        const path = guidelinePath(entry);
        documents[joinPaths(outputPath, path)] = createDoc(
          path,
          renderGuidelineMdx(group, entry, docsOptions),
          "mdx"
        );
      }
    }
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
        themeNames,
        tokenThemeNames: Object.keys(variants)
      }),
    "markdown"
  );

  return documents;
}
