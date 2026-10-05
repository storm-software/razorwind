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

import type {
  Component,
  ComponentUsage,
  Font,
  Guideline,
  Icon,
  Schema
} from "@razorwind/core/schema";
import {
  cssVarPrefixFromName,
  flattenTokens,
  groupGuidelines,
  renderGuidelineBody,
  resolveSchemaIdentity,
  titleCase,
  toCssVar
} from "@razorwind/core/utils";
import { toHexColor } from "./color";

/**
 * A guideline document served by the `guidelines` command / tool.
 *
 * Mirrors the ADS MCP foundations records: searchable `keywords` and a
 * Markdown `content` body.
 */
export interface GuidelineDocument {
  /** Short id, used for de-duplication and reporting. */
  id?: string;
  /** Display title; defaults to the first Markdown heading. */
  title?: string;
  /** Search keywords for the document. */
  keywords: string[];
  /** Markdown body. */
  content: string;
}

/**
 * The design-system snapshot baked into a Shell Shock build.
 */
export interface DesignSystemSnapshot {
  /** The extracted Razorwind {@link Schema}. */
  spec: Schema;
  /** Additional guideline documents provided by the plugin consumer. */
  guidelines?: GuidelineDocument[];
}

/**
 * A single flattened design token in tool-response form.
 */
export interface DesignTokenRecord {
  /** Dot-separated token name, for example `color.text.primary`. */
  name: string;
  /** Token path segments. */
  path: string[];
  /** DTCG `$type`, when known. */
  type?: string;
  /** CSS-friendly example value. */
  value: string;
  /** Normalized six-digit hex form for color tokens. */
  hex?: string;
  /** Raw DTCG `$value`. */
  rawValue: unknown;
  description?: string;
  /** Theme / token set id for multi-theme token records. */
  theme?: string;
  /** CSS custom property name for the token. */
  cssVariable: string;
}

export interface ComponentUsageRecord extends ComponentUsage {
  name?: string;
}

/**
 * Component metadata in tool-response form.
 */
export interface DesignComponentRecord {
  name: string;
  title: string;
  type: Component["type"];
  category?: string;
  description?: string;
  tags: string[];
  related: string[];
  since?: string;
  version?: string;
  repository?: string;
  homepage?: string;
  dependencies: Record<string, string>;
  registryDependencies: Record<string, string>;
  /** Source file paths that make up the component. */
  files: string[];
  /** Usage examples (source snippets). */
  examples: ComponentUsageRecord[];
}

/**
 * Icon metadata in tool-response form.
 */
export interface DesignIconRecord {
  name: string;
  title: string;
  category?: string;
  description?: string;
  tags: string[];
  aliases: string[];
  related: string[];
  since?: string;
  version?: string;
  repository?: string;
  homepage?: string;
  /** Asset file paths (with optional theme variant). */
  files: Array<{ path: string; type?: string; theme?: string }>;
}

/**
 * Font metadata in tool-response form.
 */
export interface DesignFontRecord {
  name: string;
  title: string;
  family: string;
  source: Font["source"];
  role?: string;
  fallbacks: string[];
  display?: string;
  category?: string;
  description?: string;
  tags: string[];
  weights: Array<number | string>;
  styles: string[];
  /** Local font file paths. Empty for Google fonts. */
  files: string[];
  /** CSS `font-family` stack. */
  fontFamily: string;
}

function toArray<T>(value: readonly T[] | undefined): T[] {
  return value ? [...value] : [];
}

/**
 * Flatten `spec.tokens` into {@link DesignTokenRecord}s.
 */
export function getTokenRecords(spec: Schema): DesignTokenRecord[] {
  const prefix = cssVarPrefixFromName(resolveSchemaIdentity(spec).name);

  return flattenTokens(spec.tokens, {
    shouldIncludeToken: token => token.skipDocs !== true
  }).map(token => {
    const hex =
      !token.type || token.type === "color"
        ? (toHexColor(token.value) ?? toHexColor(token.cssValue))
        : null;

    const record: DesignTokenRecord = {
      name: token.path,
      path: token.path.split("."),
      type: token.type,
      value: token.cssValue,
      rawValue: token.value,
      description: token.description,
      theme: token.theme,
      cssVariable: toCssVar(token.path, prefix)
    };
    if (hex) {
      record.hex = hex;
    }

    return record;
  });
}

/**
 * Project `spec.components` into {@link DesignComponentRecord}s.
 */
export function getComponentRecords(spec: Schema): DesignComponentRecord[] {
  return Object.entries(spec.components ?? {}).map(([key, component]) => ({
    name: component.name || key,
    title: component.title || titleCase(component.name || key),
    type: component.type ?? "component",
    category: component.category,
    description: component.description,
    tags: toArray(component.tags),
    related: toArray(component.related),
    since: component.since,
    version: component.version,
    repository: component.repository,
    homepage: component.homepage,
    dependencies: { ...component.dependencies },
    registryDependencies: { ...component.registryDependencies },
    files: toArray(component.files).map(file => file.path),
    examples: toArray(component.usage).map(usage => ({
      ...usage,
      name:
        usage.name ??
        usage.path
          .split(/[\\/]/)
          .pop()
          ?.replace(/\.[^.]+$/, "")
    }))
  }));
}

/**
 * Project `spec.icons` into {@link DesignIconRecord}s.
 */
export function getIconRecords(spec: Schema): DesignIconRecord[] {
  return Object.entries(spec.icons ?? {}).map(
    ([key, icon]: [string, Icon]) => ({
      name: icon.name || key,
      title: icon.title || titleCase(icon.name || key),
      category: icon.category,
      description: icon.description,
      tags: toArray(icon.tags),
      aliases: toArray(icon.aliases),
      related: toArray(icon.related),
      since: icon.since,
      version: icon.version,
      repository: icon.repository,
      homepage: icon.homepage,
      files: toArray(icon.files).map(file => ({
        path: file.path,
        type: file.type,
        theme: file.theme
      }))
    })
  );
}

function quoteFamily(family: string): string {
  return /[\s'"]/.test(family) && !/^['"].*['"]$/.test(family)
    ? `"${family}"`
    : family;
}

/**
 * Project `spec.fonts` into {@link DesignFontRecord}s.
 */
export function getFontRecords(spec: Schema): DesignFontRecord[] {
  return Object.entries(spec.fonts ?? {}).map(([key, font]: [string, Font]) => {
    const family = font.family || font.title || font.name || key;
    const fallbacks = toArray(font.fallbacks);
    const files = font.source === "local" ? toArray(font.files) : [];

    return {
      name: font.name || key,
      title: font.title || titleCase(font.name || key),
      family,
      source: font.source,
      role: font.role,
      fallbacks,
      display: font.display,
      category: font.category,
      description: font.description,
      tags: toArray(font.tags),
      weights:
        font.source === "google"
          ? toArray(font.weights)
          : [
              ...new Set(
                files
                  .map(file => file.weight)
                  .filter(
                    (weight): weight is number | string => weight !== undefined
                  )
              )
            ],
      styles:
        font.source === "google"
          ? toArray(font.styles)
          : [
              ...new Set(
                files
                  .map(file => file.style)
                  .filter(
                    (style): style is NonNullable<typeof style> => !!style
                  )
              )
            ],
      files: files.map(file => file.path),
      fontFamily: [family, ...fallbacks].map(quoteFamily).join(", ")
    };
  });
}

function firstHeading(markdown: string): string | undefined {
  return /^#{1,6}[ \t]+(\S.*)$/m.exec(markdown)?.[1]?.trim();
}

function stringList(value: unknown): string[] {
  if (typeof value === "string") {
    return value
      .split(",")
      .map(entry => entry.trim())
      .filter(Boolean);
  }

  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

/**
 * Convert a core {@link Guideline} into a searchable {@link GuidelineDocument}.
 * Keywords come from the slash-joined `id` path (group keys and file name),
 * the name and the frontmatter `keywords` / `tags` attributes.
 */
export function toGuidelineDocument(
  id: string,
  guideline: Guideline
): GuidelineDocument {
  const title =
    typeof guideline.data?.title === "string"
      ? guideline.data.title
      : guideline.name;
  const keywords = new Set(
    [
      ...id.split(/[/\-_\s]+/),
      title,
      ...stringList(guideline.data?.keywords),
      ...stringList(guideline.data?.tags)
    ]
      .filter(Boolean)
      .map(keyword => keyword.toLowerCase())
  );

  return {
    id: `guideline:${id}`,
    title,
    keywords: [...keywords],
    content: [
      `# ${title}`,
      ...(guideline.version ? [`_Version ${guideline.version}_`] : []),
      renderGuidelineBody(guideline, 1)
    ].join("\n\n")
  };
}

/**
 * Build the guideline document set: an overview generated from the spec,
 * one document per component / font, one per `spec.guidelines` entry (loaded
 * from the Razorwind `guidelinesPath`), plus any consumer-provided documents.
 */
export function getGuidelineDocuments(
  snapshot: DesignSystemSnapshot
): GuidelineDocument[] {
  const { spec } = snapshot;
  const identity = resolveSchemaIdentity(spec);
  const title = identity.title ?? "Design System";
  const docs: GuidelineDocument[] = [];

  const overview = [`# ${title}`];
  if (spec.description) {
    overview.push("", spec.description);
  }
  const links = [
    spec.homepage ? `- Homepage: ${spec.homepage}` : undefined,
    spec.repository ? `- Repository: ${spec.repository}` : undefined
  ].filter(Boolean);
  if (links.length > 0) {
    overview.push("", ...(links as string[]));
  }
  const tokenRecords = getTokenRecords(spec);
  const tokenGroups = [
    ...new Set(tokenRecords.map(token => token.path[0] ?? "tokens"))
  ].toSorted((a, b) => a.localeCompare(b));
  overview.push(
    "",
    "## Tokens",
    "",
    "Use the documented design-token names and values as the source of truth; do not invent replacement values.",
    "",
    tokenGroups.length > 0
      ? `Token groups: ${tokenGroups.map(group => `\`${group}\``).join(", ")}.`
      : "No documented tokens were found."
  );
  docs.push({
    id: "overview",
    title,
    keywords: [
      "overview",
      "design system",
      "tokens",
      "getting started",
      ...(identity.name ? [identity.name] : [])
    ],
    content: overview.join("\n")
  });

  for (const component of getComponentRecords(spec)) {
    const lines = [`# ${component.title}`];
    if (component.description) {
      lines.push("", component.description);
    }
    const meta = [
      `- Name: \`${component.name}\``,
      `- Type: ${component.type}`,
      component.category ? `- Category: ${component.category}` : undefined,
      component.tags.length > 0
        ? `- Tags: ${component.tags.join(", ")}`
        : undefined,
      component.related.length > 0
        ? `- Related: ${component.related.join(", ")}`
        : undefined
    ].filter(Boolean) as string[];
    lines.push("", ...meta);
    for (const example of component.examples) {
      if (!example.content) {
        continue;
      }
      lines.push(
        "",
        `## ${example.title ?? example.name ?? "Usage"}`,
        ...(example.description ? ["", example.description] : []),
        "",
        `\`\`\`${example.language ?? ""}`,
        example.content.trimEnd(),
        "```"
      );
    }
    docs.push({
      id: `component:${component.name}`,
      title: component.title,
      keywords: [
        component.name,
        component.title,
        component.type,
        ...(component.category ? [component.category] : []),
        ...component.tags
      ],
      content: lines.join("\n")
    });
  }

  const fonts = getFontRecords(spec);
  if (fonts.length > 0) {
    const lines = ["# Typography", ""];
    for (const font of fonts) {
      lines.push(
        `- **${font.title}**${font.role ? ` (${font.role})` : ""}: \`${font.fontFamily}\`${
          font.description ? ` — ${font.description}` : ""
        }`
      );
    }
    docs.push({
      id: "typography",
      title: "Typography",
      keywords: [
        "typography",
        "fonts",
        "font family",
        ...fonts.map(f => f.name)
      ],
      content: lines.join("\n")
    });
  }

  for (const group of groupGuidelines(spec.guidelines)) {
    for (const entry of group.guidelines) {
      docs.push(toGuidelineDocument(entry.path, entry.guideline));
    }
  }

  for (const [index, doc] of (snapshot.guidelines ?? []).entries()) {
    docs.push({
      ...doc,
      id: doc.id ?? `guideline:${index}`,
      title: doc.title ?? firstHeading(doc.content),
      keywords: toArray(doc.keywords)
    });
  }

  return docs;
}
