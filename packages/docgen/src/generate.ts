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
import { definePlugin } from "@razorwind/core/plugin";
import type { Schema } from "@razorwind/core/schema";
import {
  createDocument,
  isObject,
  resolveSchemaIdentity,
  slugifyThemeName,
  titleCase
} from "@razorwind/core/utils";
import { joinPaths } from "@stryke/path";
import { join } from "node:path";
import { renderInstallMd } from "./install";
import { flattenTokens } from "./lib/flatten";
import { escapeTableCell, toSlug } from "./lib/format";
import type { DocgenGeneratePluginOptions, FlatToken } from "./types";

function frontmatter(fields: Record<string, string>): string {
  const lines = Object.entries(fields).map(
    ([key, value]) => `${key}: ${JSON.stringify(value)}`
  );

  return `---\n${lines.join("\n")}\n---`;
}

/** Top-level path segment used to group tokens into pages. */
export function tokenGroup(token: FlatToken): string {
  return token.path.split(".")[0] || "tokens";
}

/**
 * Group flattened tokens by their top-level path segment.
 */
export function groupTokens(tokens: FlatToken[]): Map<string, FlatToken[]> {
  const groups = new Map<string, FlatToken[]>();

  for (const token of tokens) {
    const key = tokenGroup(token);
    const list = groups.get(key) ?? [];
    list.push(token);
    groups.set(key, list);
  }

  return groups;
}

function swatch(cssValue: string): string {
  return `<span style={{ display: "inline-block", width: "1.25em", height: "1.25em", borderRadius: "4px", verticalAlign: "middle", border: "1px solid rgba(128, 128, 128, 0.35)", background: ${JSON.stringify(cssValue)} }} />`;
}

/**
 * Render a markdown token table for a set of flattened tokens.
 */
export function renderTokenTable(tokens: FlatToken[]): string {
  const hasTheme = tokens.some(token => token.theme);
  const hasDescription = tokens.some(token => token.description);
  const hasColor = tokens.some(token => token.type === "color");

  const headers = [
    ...(hasColor ? ["Preview"] : []),
    "Token",
    "Type",
    "Value",
    "CSS Variable",
    ...(hasTheme ? ["Theme"] : []),
    ...(hasDescription ? ["Description"] : [])
  ];

  const rows = tokens
    .toSorted(
      (a, b) =>
        (a.theme ?? "").localeCompare(b.theme ?? "") ||
        a.path.localeCompare(b.path)
    )
    .map(token => {
      const cells = [
        ...(hasColor
          ? [token.type === "color" ? swatch(token.cssValue) : ""]
          : []),
        `\`${escapeTableCell(token.path)}\``,
        token.type ? `\`${escapeTableCell(String(token.type))}\`` : "—",
        `\`${escapeTableCell(token.cssValue)}\``,
        `\`${escapeTableCell(token.cssVar)}\``,
        ...(hasTheme ? [token.theme ? escapeTableCell(token.theme) : "—"] : []),
        ...(hasDescription
          ? [token.description ? escapeTableCell(token.description) : "—"]
          : [])
      ];

      return `| ${cells.join(" | ")} |`;
    });

  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows
  ].join("\n");
}

/**
 * Render an MDX documentation page for a single token group.
 */
export function renderGroupMdx(
  group: string,
  tokens: FlatToken[],
  systemTitle = "design system"
): string {
  const title = titleCase(group);
  const themes = [
    ...new Set(tokens.map(token => token.theme).filter(Boolean))
  ] as string[];

  const sections: string[] = [
    frontmatter({
      title,
      description: `${title} design tokens for the ${systemTitle}.`
    }),
    `# ${title}`,
    `${tokens.length} token${tokens.length === 1 ? "" : "s"} in the \`${group}\` group.`
  ];

  if (themes.length > 1) {
    for (const theme of themes.toSorted((a, b) => a.localeCompare(b))) {
      const themed = tokens.filter(token => token.theme === theme);
      sections.push(`## ${titleCase(theme)}`, renderTokenTable(themed));
    }
  } else {
    sections.push(renderTokenTable(tokens));
  }

  return `${sections.join("\n\n")}\n`;
}

/**
 * Render the documentation index page linking to every generated page.
 */
export function renderIndexMdx(input: {
  title: string;
  groups: Map<string, FlatToken[]>;
  hasComponents: boolean;
  componentPages?: { slug: string; title: string; count: number }[];
  iconCount?: number;
  fontCount?: number;
}): string {
  const {
    title,
    groups,
    hasComponents,
    componentPages = [],
    iconCount = 0,
    fontCount = 0
  } = input;

  const totalTokens = [...groups.values()].reduce(
    (sum, tokens) => sum + tokens.length,
    0
  );

  const links = [...groups.keys()]
    .toSorted((a, b) => a.localeCompare(b))
    .map(group => {
      const count = groups.get(group)?.length ?? 0;

      return `- [${titleCase(group)}](./tokens/${toSlug(group)}.mdx) — ${count} token${count === 1 ? "" : "s"}`;
    });

  const sections: string[] = [
    frontmatter({
      title,
      description: `Generated reference documentation for the ${title} design tokens, components, icons, and fonts.`
    }),
    `# ${title}`,
    `This documentation is generated from the design system specification. It covers ${totalTokens} design token${totalTokens === 1 ? "" : "s"} across ${groups.size} group${groups.size === 1 ? "" : "s"}.`,
    "## Design Tokens",
    links.length > 0 ? links.join("\n") : "_No design tokens found._"
  ];

  if (hasComponents || componentPages.length > 0) {
    const componentLinks = componentPages.map(
      page =>
        `- [${page.title}](./registry/${page.slug}.mdx) — ${page.count} item${page.count === 1 ? "" : "s"}`
    );

    sections.push(
      "## Components",
      componentLinks.length > 0
        ? componentLinks.join("\n")
        : "_No components found._"
    );
  }

  if (iconCount > 0) {
    sections.push(
      "## Icons",
      `- [Icons](./icons.mdx) — ${iconCount} icon${iconCount === 1 ? "" : "s"}`
    );
  }

  if (fontCount > 0) {
    sections.push(
      "## Fonts",
      `- [Fonts](./fonts.mdx) — ${fontCount} font${fontCount === 1 ? "" : "s"}`
    );
  }

  return `${sections.join("\n\n")}\n`;
}

/** Component types that receive a dedicated documentation page. */
export const COMPONENT_TYPES = {
  ui: { slug: "ui", title: "UI Primitives" },
  component: { slug: "components", title: "Components" },
  page: { slug: "pages", title: "Pages" },
  block: { slug: "blocks", title: "Blocks" }
} as const;

/** @deprecated Use {@link COMPONENT_TYPES}. */
export const REGISTRY_ITEM_TYPES = {
  "registry:ui": COMPONENT_TYPES.ui,
  "registry:component": COMPONENT_TYPES.component,
  "registry:page": COMPONENT_TYPES.page,
  "registry:block": COMPONENT_TYPES.block
} as const;

export type ComponentDocType = keyof typeof COMPONENT_TYPES;
export type RegistryItemType = keyof typeof REGISTRY_ITEM_TYPES;

/** A documented component type together with its matching items. */
export interface RegistryItemPage {
  type: ComponentDocType;
  slug: string;
  title: string;
  items: Record<string, unknown>[];
}

function readString(
  item: Record<string, unknown>,
  key: string
): string | undefined {
  const value = item[key];

  return typeof value === "string" ? value : undefined;
}

function readStringArray(item: Record<string, unknown>, key: string): string[] {
  const value = item[key];

  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function readDependencyEntries(
  item: Record<string, unknown>,
  key: string
): string[] {
  const value = item[key];

  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }

  if (!isObject(value)) {
    return [];
  }

  return Object.entries(value).map(([name, version]) =>
    typeof version === "string" && version !== "*" ? `${name}@${version}` : name
  );
}

function readCategories(item: Record<string, unknown>): string[] {
  const categories = readStringArray(item, "categories");
  if (categories.length > 0) {
    return categories;
  }

  const tags = readStringArray(item, "tags");
  const category = readString(item, "category");

  return [
    ...(category ? [category] : []),
    ...tags.filter(tag => tag !== category)
  ];
}

/**
 * Extract documented components from `schema.components`, grouped by type.
 *
 * Only `ui`, `component`, `page` and `block` items are documented — one page
 * per type.
 */
export function extractRegistryItems(components: unknown): RegistryItemPage[] {
  if (!isObject(components)) {
    return [];
  }

  const items = Object.values(components).filter(isObject);
  const pages: RegistryItemPage[] = [];

  for (const [type, meta] of Object.entries(COMPONENT_TYPES)) {
    const matching = items.filter(
      (item): item is Record<string, unknown> => item.type === type
    );

    if (matching.length > 0) {
      pages.push({
        type: type as ComponentDocType,
        slug: meta.slug,
        title: meta.title,
        items: matching
      });
    }
  }

  return pages;
}

function renderRegistryItemFiles(item: Record<string, unknown>): string {
  const files = Array.isArray(item.files) ? item.files : [];

  const rows = files
    .map(file => {
      if (typeof file === "string") {
        return `| \`${escapeTableCell(file)}\` | — | — |`;
      }

      if (!isObject(file)) {
        return undefined;
      }

      const path = readString(file, "path");
      if (!path) {
        return undefined;
      }

      const type = readString(file, "type");
      const target = readString(file, "target");

      return `| \`${escapeTableCell(path)}\` | ${type ? `\`${escapeTableCell(type)}\`` : "—"} | ${target ? `\`${escapeTableCell(target)}\`` : "—"} |`;
    })
    .filter((row): row is string => row !== undefined);

  if (rows.length === 0) {
    return "";
  }

  return ["| Path | Type | Target |", "| --- | --- | --- |", ...rows].join(
    "\n"
  );
}

function languageFromPath(path: string): string {
  const extension = path.split(".").pop()?.toLowerCase();
  if (!extension) {
    return "tsx";
  }

  if (extension === "md") {
    return "markdown";
  }

  return extension;
}

function renderRegistryItemUsage(item: Record<string, unknown>): string {
  const usage = Array.isArray(item.usage) ? item.usage : [];

  const blocks = usage
    .map(entry => {
      if (!isObject(entry)) {
        return undefined;
      }

      const path = readString(entry, "path");
      const content = readString(entry, "content");
      if (!content) {
        return undefined;
      }

      const name =
        readString(entry, "name") ??
        (path
          ? (path
              .split("/")
              .pop()
              ?.replace(/\.[^.]+$/, "") ?? "example")
          : "example");
      const title = readString(entry, "title") ?? titleCase(name);
      const description = readString(entry, "description");
      const language =
        readString(entry, "language") ??
        (path ? languageFromPath(path) : "tsx");

      const sections = [`#### ${title}`];
      if (description) {
        sections.push(description);
      }
      sections.push(`\`\`\`${language}\n${content.trimEnd()}\n\`\`\``);

      return sections.join("\n\n");
    })
    .filter((block): block is string => block !== undefined);

  return blocks.join("\n\n");
}

function renderRegistryItem(item: Record<string, unknown>): string {
  const name = readString(item, "name") ?? "unknown";
  const title = readString(item, "title") ?? titleCase(name);
  const description = readString(item, "description");
  const author = readString(item, "author");
  const categories = readCategories(item);
  const dependencies = readDependencyEntries(item, "dependencies");
  const registryDependencies = readDependencyEntries(
    item,
    "registryDependencies"
  );

  const sections: string[] = [`## ${title}`];

  if (description) {
    sections.push(description);
  }

  const meta = [
    `- **Name:** \`${name}\``,
    `- **Type:** \`${String(item.type)}\``,
    ...(author ? [`- **Author:** ${escapeTableCell(author)}`] : []),
    ...(categories.length > 0
      ? [
          `- **Categories:** ${categories.map(entry => `\`${entry}\``).join(", ")}`
        ]
      : [])
  ];
  sections.push(meta.join("\n"));

  if (dependencies.length > 0) {
    sections.push(
      "### Dependencies",
      dependencies.map(dep => `- \`${dep}\``).join("\n")
    );
  }

  if (registryDependencies.length > 0) {
    sections.push(
      "### Registry Dependencies",
      registryDependencies.map(dep => `- \`${dep}\``).join("\n")
    );
  }

  const files = renderRegistryItemFiles(item);
  if (files) {
    sections.push("### Files", files);
  }

  const usage = renderRegistryItemUsage(item);
  if (usage) {
    sections.push("### Usage", usage);
  }

  return sections.join("\n\n");
}

/**
 * Extract documented icons from `schema.icons`.
 */
export function extractIcons(icons: unknown): Record<string, unknown>[] {
  if (!isObject(icons)) {
    return [];
  }

  return Object.values(icons)
    .filter(isObject)
    .toSorted((a, b) =>
      (readString(a, "name") ?? "").localeCompare(readString(b, "name") ?? "")
    );
}

function renderIconFiles(item: Record<string, unknown>): string {
  const files = Array.isArray(item.files) ? item.files : [];

  const rows = files
    .map(file => {
      if (typeof file === "string") {
        return `| \`${escapeTableCell(file)}\` | — | — | — |`;
      }

      if (!isObject(file)) {
        return undefined;
      }

      const path = readString(file, "path");
      if (!path) {
        return undefined;
      }

      const type = readString(file, "type");
      const theme = readString(file, "theme");
      const target = readString(file, "target");

      return `| \`${escapeTableCell(path)}\` | ${type ? `\`${escapeTableCell(type)}\`` : "—"} | ${theme ? `\`${escapeTableCell(theme)}\`` : "—"} | ${target ? `\`${escapeTableCell(target)}\`` : "—"} |`;
    })
    .filter((row): row is string => row !== undefined);

  if (rows.length === 0) {
    return "";
  }

  return [
    "| Path | Type | Theme | Target |",
    "| --- | --- | --- | --- |",
    ...rows
  ].join("\n");
}

function renderIconPreview(item: Record<string, unknown>): string {
  const files = Array.isArray(item.files) ? item.files : [];
  const svg = files.find(
    file =>
      isObject(file) &&
      readString(file, "type") === "svg" &&
      typeof file.content === "string"
  );

  if (!isObject(svg) || typeof svg.content !== "string") {
    return "";
  }

  return [
    "### Preview",
    `<div style={{ display: "inline-flex", width: "2rem", height: "2rem" }} dangerouslySetInnerHTML={{ __html: ${JSON.stringify(svg.content)} }} />`
  ].join("\n\n");
}

function renderIcon(item: Record<string, unknown>): string {
  const name = readString(item, "name") ?? "unknown";
  const title = readString(item, "title") ?? titleCase(name);
  const description = readString(item, "description");
  const category = readString(item, "category");
  const tags = readStringArray(item, "tags");
  const aliases = readStringArray(item, "aliases");

  const sections: string[] = [`## ${title}`];

  if (description) {
    sections.push(description);
  }

  const meta = [
    `- **Name:** \`${name}\``,
    ...(category ? [`- **Category:** \`${category}\``] : []),
    ...(tags.length > 0
      ? [`- **Tags:** ${tags.map(entry => `\`${entry}\``).join(", ")}`]
      : []),
    ...(aliases.length > 0
      ? [`- **Aliases:** ${aliases.map(entry => `\`${entry}\``).join(", ")}`]
      : [])
  ];
  sections.push(meta.join("\n"));

  const preview = renderIconPreview(item);
  if (preview) {
    sections.push(preview);
  }

  const files = renderIconFiles(item);
  if (files) {
    sections.push("### Files", files);
  }

  return sections.join("\n\n");
}

/**
 * Render an MDX documentation page for all icons.
 */
export function renderIconsMdx(
  icons: Record<string, unknown>[],
  systemTitle = "design system"
): string {
  const sections: string[] = [
    frontmatter({
      title: "Icons",
      description: `Icons available in the ${systemTitle}.`
    }),
    `# Icons`,
    `${icons.length} icon${icons.length === 1 ? "" : "s"} in the design system.`
  ];

  for (const icon of icons) {
    sections.push(renderIcon(icon));
  }

  return `${sections.join("\n\n")}\n`;
}

/**
 * Extract documented fonts from `schema.fonts`.
 */
export function extractFonts(fonts: unknown): Record<string, unknown>[] {
  if (!isObject(fonts)) {
    return [];
  }

  return Object.values(fonts)
    .filter(isObject)
    .toSorted((a, b) =>
      (readString(a, "name") ?? "").localeCompare(readString(b, "name") ?? "")
    );
}

function renderFontFiles(item: Record<string, unknown>): string {
  const files = Array.isArray(item.files) ? item.files : [];

  const rows = files
    .map(file => {
      if (!isObject(file)) {
        return undefined;
      }

      const path = readString(file, "path");
      if (!path) {
        return undefined;
      }

      const format = readString(file, "format");
      const weight =
        typeof file.weight === "number" || typeof file.weight === "string"
          ? String(file.weight)
          : undefined;
      const style = readString(file, "style");

      return `| \`${escapeTableCell(path)}\` | ${format ? `\`${escapeTableCell(format)}\`` : "—"} | ${weight ? `\`${escapeTableCell(weight)}\`` : "—"} | ${style ? `\`${escapeTableCell(style)}\`` : "—"} |`;
    })
    .filter((row): row is string => row !== undefined);

  if (rows.length === 0) {
    return "";
  }

  return [
    "| Path | Format | Weight | Style |",
    "| --- | --- | --- | --- |",
    ...rows
  ].join("\n");
}

function renderFont(item: Record<string, unknown>): string {
  const name = readString(item, "name") ?? "unknown";
  const title = readString(item, "title") ?? titleCase(name);
  const description = readString(item, "description");
  const source = readString(item, "source") ?? "local";
  const family = readString(item, "family");
  const role = readString(item, "role");
  const tags = readStringArray(item, "tags");

  const sections: string[] = [`## ${title}`];

  if (description) {
    sections.push(description);
  }

  const meta = [
    `- **Name:** \`${name}\``,
    `- **Source:** \`${source}\``,
    ...(family ? [`- **Family:** \`${family}\``] : []),
    ...(role ? [`- **Role:** \`${role}\``] : []),
    ...(tags.length > 0
      ? [`- **Tags:** ${tags.map(entry => `\`${entry}\``).join(", ")}`]
      : [])
  ];
  sections.push(meta.join("\n"));

  if (source === "local") {
    const files = renderFontFiles(item);
    if (files) {
      sections.push("### Files", files);
    }
  }

  return sections.join("\n\n");
}

/**
 * Render an MDX documentation page for all fonts.
 */
export function renderFontsMdx(
  fonts: Record<string, unknown>[],
  systemTitle = "design system"
): string {
  const sections: string[] = [
    frontmatter({
      title: "Fonts",
      description: `Fonts available in the ${systemTitle}.`
    }),
    `# Fonts`,
    `${fonts.length} font${fonts.length === 1 ? "" : "s"} in the design system.`
  ];

  for (const font of fonts) {
    sections.push(renderFont(font));
  }

  return `${sections.join("\n\n")}\n`;
}

/**
 * Render an MDX documentation page for all components of a single type.
 */
export function renderRegistryItemsMdx(
  page: RegistryItemPage,
  systemTitle = "component registry"
): string {
  const sections: string[] = [
    frontmatter({
      title: page.title,
      description: `${page.title} available in the ${systemTitle}.`
    }),
    `# ${page.title}`,
    `${page.items.length} \`${page.type}\` item${page.items.length === 1 ? "" : "s"} in the component registry.`
  ];

  const items = page.items.toSorted((a, b) =>
    (readString(a, "name") ?? "").localeCompare(readString(b, "name") ?? "")
  );

  for (const item of items) {
    sections.push(renderRegistryItem(item));
  }

  return `${sections.join("\n\n")}\n`;
}

export { renderInstallMd };

const getCreateDocument =
  (outputPath: string) =>
  (
    file: string,
    content: string,
    language?: string
  ): GeneratorFunctionResult<Schema, DocgenGeneratePluginOptions>[string] => {
    return createDocument<Schema, DocgenGeneratePluginOptions>(
      joinPaths(outputPath, file),
      content,
      { name: "docgen" },
      (_: string, theme: string) => {
        return joinPaths(outputPath, slugifyThemeName(theme), file);
      },
      language
    );
  };

/**
 * Generate MDX documentation pages from a Razorwind schema.
 *
 * Produces an index page, one page per top-level token group, component
 * pages grouped by type, icon documentation, and a flattened `tokens.json`
 * manifest.
 */
export function generateDocs(
  spec: Schema,
  options: DocgenGeneratePluginOptions = {}
): GeneratorFunctionResult<Schema, DocgenGeneratePluginOptions> {
  const outputPath = options.outputPath ?? "docs/design-system";
  const identity = resolveSchemaIdentity(spec, { title: options.title });
  const title = identity.title ?? "Design System";
  const systemTitle = identity.title ?? "design system";

  const flat = flattenTokens(spec.tokens, options);
  const groups = groupTokens(flat);
  const itemPages = options.skipRegistry
    ? []
    : extractRegistryItems(spec.components);
  const hasComponents = itemPages.length > 0;
  const icons = options.skipIcons ? [] : extractIcons(spec.icons);
  const fonts = options.skipFonts ? [] : extractFonts(spec.fonts);

  const createDoc = getCreateDocument(outputPath);

  const documents: GeneratorFunctionResult<
    Schema,
    DocgenGeneratePluginOptions
  > = {
    [join(outputPath, "index.mdx")]: createDoc(
      "index.mdx",
      renderIndexMdx({
        title,
        groups,
        hasComponents,
        componentPages: itemPages.map(page => ({
          slug: page.slug,
          title: page.title,
          count: page.items.length
        })),
        iconCount: icons.length,
        fontCount: fonts.length
      }),
      "mdx"
    )
  };

  for (const [group, tokens] of groups) {
    const path = joinPaths("tokens", `${toSlug(group)}.mdx`);
    documents[joinPaths(outputPath, path)] = createDoc(
      path,
      renderGroupMdx(group, tokens, systemTitle),
      "mdx"
    );
  }

  for (const page of itemPages) {
    const path = joinPaths("registry", `${page.slug}.mdx`);
    documents[joinPaths(outputPath, path)] = createDoc(
      path,
      renderRegistryItemsMdx(page, systemTitle),
      "mdx"
    );
  }

  if (icons.length > 0) {
    const path = "icons.mdx";
    documents[joinPaths(outputPath, path)] = createDoc(
      path,
      renderIconsMdx(icons, systemTitle),
      "mdx"
    );
  }

  if (fonts.length > 0) {
    const path = "fonts.mdx";
    documents[joinPaths(outputPath, path)] = createDoc(
      path,
      renderFontsMdx(fonts, systemTitle),
      "mdx"
    );
  }

  documents[joinPaths(outputPath, "tokens.json")] = createDoc(
    "tokens.json",
    `${JSON.stringify(flat, null, 2)}\n`,
    "json"
  );

  const installBody =
    options.installGuide ??
    renderInstallMd({
      outputPath,
      title
    });
  const installPath = "INSTALL.md";
  documents[joinPaths(outputPath, installPath)] = createDoc(
    installPath,
    installBody,
    "markdown"
  );

  return documents;
}

/**
 * Generate MDX documentation pages from a Razorwind schema.
 *
 * @example
 * ```ts
 * import { defineConfig } from "@razorwind/core";
 * import docgen from "@razorwind/docgen/generate";
 *
 * export default defineConfig({
 *   plugins: [docgen()]
 * });
 * ```
 */
export default definePlugin((options?: DocgenGeneratePluginOptions) => ({
  name: "docgen:generate",
  generate: async spec => {
    return generateDocs(spec, options ?? {});
  }
}));
