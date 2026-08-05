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
import { join } from "node:path";
import { flattenTokens } from "./flatten";
import { escapeString, toLiteral } from "./format";
import type {
  FlatToken,
  StorybookPluginOptions,
  StorybookTheme
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
  options: Pick<StorybookPluginOptions, "sampleText"> = {}
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
  const fontFamily =
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

export function renderBlocksIndex(): string {
  return `export { ColorPaletteBlock } from "./ColorPalette";
export { TokenTableBlock } from "./TokenTable";
export type { TokenTableBlockProps, TokenTableRow } from "./TokenTable";
export { TypesetBlock } from "./Typeset";
`;
}

/**
 * Serialize a Storybook theme object as a `storybook/theming` `create()` module.
 *
 * @see https://storybook.js.org/docs/configure/user-interface/theming
 */
export function renderThemeFile(theme: StorybookTheme): string {
  const entries = Object.entries(theme)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `  ${key}: ${toLiteral(value)}`)
    .join(",\n");

  return `import { create } from "storybook/theming";

/**
 * Storybook UI theme generated by \`@razorwind/storybook\`.
 *
 * @see https://storybook.js.org/docs/configure/user-interface/theming
 */
export default create({
${entries}
});
`;
}

function document(
  path: string,
  content: string,
  language?: string
): GeneratorFunctionResult<Schema, StorybookPluginOptions>[string] {
  return createDocument<Schema, StorybookPluginOptions>(
    path,
    content,
    { name: "razorwind-storybook" },
    language
  );
}

/**
 * Generate Storybook MDX / React token doc blocks from a Razorwind schema.
 */
export function generateTokenDocs(
  spec: Schema,
  options: StorybookPluginOptions = {}
): GeneratorFunctionResult<Schema, StorybookPluginOptions> {
  const outputPath = options.outputPath ?? "storybook/tokens";
  const flat = flattenTokens(spec.tokens, options);
  const hasColors = flat.some(token => token.type === "color");
  const hasTypography = flat.some(
    token =>
      token.type === "fontFamily" ||
      token.type === "fontWeight" ||
      token.type === "typography" ||
      (token.type === "dimension" &&
        /(?:font|type|text).*size|size.*(?:font|type|text)/i.test(token.path))
  );

  const documents: GeneratorFunctionResult<Schema, StorybookPluginOptions> = {
    [join(outputPath, "blocks/ColorPalette.tsx")]: document(
      join(outputPath, "blocks/ColorPalette.tsx"),
      renderColorPaletteBlock(flat, options),
      "tsx"
    ),
    [join(outputPath, "blocks/Typeset.tsx")]: document(
      join(outputPath, "blocks/Typeset.tsx"),
      renderTypesetBlock(flat, options),
      "tsx"
    ),
    [join(outputPath, "blocks/TokenTable.tsx")]: document(
      join(outputPath, "blocks/TokenTable.tsx"),
      renderTokenTableBlock(flat),
      "tsx"
    ),
    [join(outputPath, "blocks/index.ts")]: document(
      join(outputPath, "blocks/index.ts"),
      renderBlocksIndex(),
      "typescript"
    ),
    [join(outputPath, "Tokens.mdx")]: document(
      join(outputPath, "Tokens.mdx"),
      renderTokensMdx({
        titlePrefix: options.titlePrefix,
        hasColors,
        hasTypography
      }),
      "mdx"
    )
  };

  if (hasColors) {
    documents[join(outputPath, "Colors.mdx")] = document(
      join(outputPath, "Colors.mdx"),
      renderColorsMdx(options),
      "mdx"
    );
  }

  if (hasTypography) {
    documents[join(outputPath, "Typography.mdx")] = document(
      join(outputPath, "Typography.mdx"),
      renderTypographyMdx(options),
      "mdx"
    );
  }

  documents[join(outputPath, "tokens.json")] = document(
    join(outputPath, "tokens.json"),
    `${JSON.stringify(flat, null, 2)}\n`,
    "json"
  );

  if (options.generateTheme) {
    const theme = options.generateTheme(flat);
    documents[join(outputPath, "theme.ts")] = document(
      join(outputPath, "theme.ts"),
      renderThemeFile(theme),
      "typescript"
    );
  }

  return documents;
}
