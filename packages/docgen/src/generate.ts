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
import { escapeTableCell, toSlug } from "./format";
import type { FlatToken, Options } from "./types";

function frontmatter(fields: Record<string, string>): string {
  const lines = Object.entries(fields).map(
    ([key, value]) => `${key}: ${JSON.stringify(value)}`
  );

  return `---\n${lines.join("\n")}\n---`;
}

function titleCase(value: string): string {
  return value
    .split(/[._-]/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
export function renderGroupMdx(group: string, tokens: FlatToken[]): string {
  const title = titleCase(group);
  const themes = [
    ...new Set(tokens.map(token => token.theme).filter(Boolean))
  ] as string[];

  const sections: string[] = [
    frontmatter({
      title,
      description: `${title} design tokens for the Razorwind design system.`
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
}): string {
  const { title, groups, hasComponents, componentPages = [] } = input;

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
      description: `Generated reference documentation for the ${title} design tokens and components.`
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

  if (!isPlainObject(value)) {
    return [];
  }

  return Object.entries(value).map(([name, version]) =>
    typeof version === "string" && version !== "*"
      ? `${name}@${version}`
      : name
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
  if (!isPlainObject(components)) {
    return [];
  }

  const items = Object.values(components).filter(isPlainObject);
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

      if (!isPlainObject(file)) {
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

  return sections.join("\n\n");
}

/**
 * Render an MDX documentation page for all components of a single type.
 */
export function renderRegistryItemsMdx(page: RegistryItemPage): string {
  const sections: string[] = [
    frontmatter({
      title: page.title,
      description: `${page.title} available in the Razorwind component registry.`
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

function document(
  path: string,
  content: string,
  language?: string
): GeneratorFunctionResult<Schema, Options>[string] {
  return createDocument<Schema, Options>(
    path,
    content,
    { name: "razorwind-docs" },
    language
  );
}

/**
 * Generate MDX documentation pages from a Razorwind schema.
 *
 * Produces an index page, one page per top-level token group, component
 * pages grouped by type, and a flattened `tokens.json` manifest.
 */
export function generateDocs(
  spec: Schema,
  options: Options = {}
): GeneratorFunctionResult<Schema, Options> {
  const outDir = options.outDir ?? "docs/design-system";
  const title = options.title ?? "Design System";

  const flat = flattenTokens(spec.tokens, options);
  const groups = groupTokens(flat);
  const itemPages = options.skipRegistry
    ? []
    : extractRegistryItems(spec.components);
  const hasComponents = itemPages.length > 0;

  const documents: GeneratorFunctionResult<Schema, Options> = {
    [join(outDir, "index.mdx")]: document(
      join(outDir, "index.mdx"),
      renderIndexMdx({
        title,
        groups,
        hasComponents,
        componentPages: itemPages.map(page => ({
          slug: page.slug,
          title: page.title,
          count: page.items.length
        }))
      }),
      "mdx"
    )
  };

  for (const [group, tokens] of groups) {
    const path = join(outDir, "tokens", `${toSlug(group)}.mdx`);
    documents[path] = document(path, renderGroupMdx(group, tokens), "mdx");
  }

  for (const page of itemPages) {
    const path = join(outDir, "registry", `${page.slug}.mdx`);
    documents[path] = document(path, renderRegistryItemsMdx(page), "mdx");
  }

  documents[join(outDir, "tokens.json")] = document(
    join(outDir, "tokens.json"),
    `${JSON.stringify(flat, null, 2)}\n`,
    "json"
  );

  return documents;
}
