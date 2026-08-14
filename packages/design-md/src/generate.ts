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
import { resolveSchemaIdentity } from "@razorwind/core/utils";
import { isObject } from "@stryke/type-checks/is-object";
import { dirname, join } from "node:path";
import { renderInstallMd } from "./install";
import { flattenTokens } from "./lib/flatten";
import {
  formatTokenValue,
  toTitleCase,
  toTokenName,
  toYamlScalar
} from "./lib/format";
import type {
  DesignMdDocument,
  DesignMdGeneratePluginOptions,
  FlatToken,
  TypographyToken
} from "./types";

/** DESIGN.md component properties considered valid by the spec linter. */
const VALID_COMPONENT_PROPS = new Set([
  "backgroundColor",
  "textColor",
  "typography",
  "rounded",
  "padding",
  "size",
  "height",
  "width"
]);

/** Common token property names mapped onto valid DESIGN.md component props. */
const COMPONENT_PROP_ALIASES: Record<string, string> = {
  background: "backgroundColor",
  backgroundcolor: "backgroundColor",
  bg: "backgroundColor",
  fill: "backgroundColor",
  color: "textColor",
  foreground: "textColor",
  text: "textColor",
  textcolor: "textColor",
  font: "typography",
  radius: "rounded",
  borderradius: "rounded",
  corner: "rounded"
};

const COLOR_PREFIXES = ["color", "colors", "palette"];
const TYPOGRAPHY_PREFIXES = ["typography", "type", "text", "font", "fonts"];
const ROUNDED_PATTERN = /(?:^|\.)(?:radius|radii|rounded|corner)(?:\.|$)/i;
const SPACING_PATTERN = /(?:^|\.)(?:spacing|space|gap)(?:\.|$)/i;
const COMPONENT_PATTERN = /^components?$/i;
const ALIAS_PATTERN = /^\{([^}]+)\}$/;

const TYPOGRAPHY_SUB_PROPERTIES = [
  "fontFamily",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "letterSpacing"
] as const;

/**
 * Select the token set used for the front matter when tokens are split into
 * multiple themes: the un-themed set first, then `light`, then `default`,
 * then whichever theme appears first.
 */
export function selectPrimaryTheme(flat: FlatToken[]): FlatToken[] {
  const themes = [...new Set(flat.map(token => token.theme))];

  const preferred =
    themes.find(theme => theme === undefined) ??
    themes.find(theme => /^light/i.test(theme ?? "")) ??
    themes.find(theme => /^(?:default|base)/i.test(theme ?? "")) ??
    themes[0];

  return flat.filter(token => token.theme === preferred);
}

function readAliasPath(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const match = ALIAS_PATTERN.exec(value.trim());

  return match?.[1];
}

/**
 * Resolve a chain of DTCG aliases (`{color.primary}`) to the terminal token.
 */
function resolveAlias(
  token: FlatToken,
  byPath: Map<string, FlatToken>
): FlatToken {
  let current = token;

  for (let depth = 0; depth < 8; depth++) {
    const aliasPath = readAliasPath(current.value);
    if (!aliasPath) {
      return current;
    }

    const target = byPath.get(aliasPath);
    if (!target) {
      return current;
    }

    current = target;
  }

  return current;
}

function toCamelCase(value: string): string {
  return value
    .split(/[-_.\s]+/)
    .filter(Boolean)
    .map((part, index) =>
      index === 0
        ? part.toLowerCase()
        : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    )
    .join("");
}

function normalizeComponentProp(name: string): string | undefined {
  const camel = toCamelCase(name);

  if (VALID_COMPONENT_PROPS.has(camel)) {
    return camel;
  }

  return COMPONENT_PROP_ALIASES[camel.toLowerCase()];
}

function extractTypographyValue(
  value: unknown,
  byPath: Map<string, FlatToken>
): TypographyToken {
  const typography: TypographyToken = {};

  if (!isObject(value)) {
    return typography;
  }

  for (const property of TYPOGRAPHY_SUB_PROPERTIES) {
    const raw = value[property as keyof typeof value];
    if (raw === undefined || raw === null) {
      continue;
    }

    const aliasPath = readAliasPath(raw);
    const target = aliasPath ? byPath.get(aliasPath) : undefined;
    const resolved = target ? resolveAlias(target, byPath).cssValue : undefined;

    if (typeof raw === "number") {
      if (property === "fontWeight" || property === "lineHeight") {
        typography[property] = raw;
      } else {
        typography[property] = formatTokenValue(raw);
      }
      continue;
    }

    typography[property] = resolved ?? formatTokenValue(raw);
  }

  return typography;
}

function applyGenerateOptions(
  document: DesignMdDocument,
  options: DesignMdGeneratePluginOptions
): DesignMdDocument {
  return {
    ...document,
    ...(options.name !== undefined && { name: options.name }),
    ...(options.description !== undefined && {
      description: options.description
    }),
    ...(options.version !== undefined && { version: options.version })
  };
}

/**
 * Extract a DESIGN.md document from the Razorwind schema.
 *
 * Colors, typography, rounded / spacing scales, and component tokens are
 * derived from the DTCG token tree. DTCG aliases are re-emitted as DESIGN.md
 * `{section.token}` references when the target token is part of the output,
 * or resolved to their terminal CSS value otherwise.
 */
export function extractDesignMd(spec: Schema): DesignMdDocument {
  const flat = selectPrimaryTheme(flattenTokens(spec.tokens));
  const byPath = new Map(flat.map(token => [token.path, token]));
  const identity = resolveSchemaIdentity(spec);

  const document: DesignMdDocument = {
    ...(identity.title || identity.name
      ? { name: identity.title ?? identity.name }
      : {}),
    ...(identity.description ? { description: identity.description } : {}),
    colors: {},
    colorDescriptions: {},
    typography: {},
    rounded: {},
    spacing: {},
    components: {}
  };

  /** DTCG token path → DESIGN.md `section.token` reference target. */
  const refTargets = new Map<string, string>();
  const componentTokens: FlatToken[] = [];

  for (const token of flat.filter(token => !token.primitive)) {
    const segments = token.path.split(".");
    if (segments[0] && COMPONENT_PATTERN.test(segments[0])) {
      componentTokens.push(token);
      continue;
    }

    if (token.type === "color" && !token.primitive) {
      const name = toTokenName(token.path, COLOR_PREFIXES);
      const resolved = resolveAlias(token, byPath);
      if (!resolved.primitive) {
        document.colors[name] = resolved.cssValue;
        if (token.description) {
          document.colorDescriptions[name] = token.description;
        }

        refTargets.set(token.path, `colors.${name}`);
      }
      continue;
    }

    if (token.type === "typography") {
      const name = toTokenName(token.path, TYPOGRAPHY_PREFIXES);
      document.typography[name] = extractTypographyValue(token.value, byPath);
      refTargets.set(token.path, `typography.${name}`);
      continue;
    }

    if (token.type === "fontFamily") {
      const name = toTokenName(token.path, TYPOGRAPHY_PREFIXES);
      document.typography[name] ??= {};
      document.typography[name].fontFamily = token.cssValue;
      refTargets.set(token.path, `typography.${name}`);
      continue;
    }

    const isScale =
      token.type === "dimension" ||
      token.type === "number" ||
      typeof token.value === "number";

    if (isScale && ROUNDED_PATTERN.test(token.path)) {
      const name = segments.at(-1)!;
      document.rounded[name] = resolveAlias(token, byPath).cssValue;
      refTargets.set(token.path, `rounded.${name}`);
      continue;
    }

    if (isScale && SPACING_PATTERN.test(token.path)) {
      const name = segments.at(-1)!;
      document.spacing[name] = resolveAlias(token, byPath).cssValue;
      refTargets.set(token.path, `spacing.${name}`);
    }
  }

  for (const token of componentTokens) {
    const segments = token.path.split(".").slice(1);
    if (segments.length < 2) {
      continue;
    }

    const property = normalizeComponentProp(segments.at(-1)!);
    if (!property) {
      continue;
    }

    const componentName = segments
      .slice(0, -1)
      .join("-")
      .replaceAll(/[^\w-]+/g, "-")
      .toLowerCase();

    const aliasPath = readAliasPath(token.value);
    const reference = aliasPath ? refTargets.get(aliasPath) : undefined;
    const value = reference
      ? `{${reference}}`
      : resolveAlias(token, byPath).cssValue;

    document.components[componentName] ??= {};
    document.components[componentName][property] = value;
  }

  return document;
}

function renderYamlRecord(
  key: string,
  record: Record<string, unknown>,
  lines: string[]
): void {
  const entries = Object.entries(record);
  if (entries.length === 0) {
    return;
  }

  lines.push(`${key}:`);
  for (const [name, value] of entries) {
    if (value !== null && typeof value === "object") {
      lines.push(`  ${name}:`);
      for (const [subKey, subValue] of Object.entries(
        value as Record<string, unknown>
      )) {
        lines.push(`    ${subKey}: ${toYamlScalar(subValue)}`);
      }
      continue;
    }

    lines.push(`  ${name}: ${toYamlScalar(value)}`);
  }
}

/**
 * Render the machine-readable YAML front matter layer of a DESIGN.md file.
 */
function renderFrontMatter(document: DesignMdDocument): string {
  const lines: string[] = ["---"];

  if (document.version) {
    lines.push(`version: ${toYamlScalar(document.version)}`);
  } else {
    lines.push(`version: alpha`);
  }

  lines.push(`name: ${toYamlScalar(document.name)}`);
  if (document.description) {
    lines.push(`description: ${toYamlScalar(document.description)}`);
  }

  renderYamlRecord("colors", document.colors, lines);
  renderYamlRecord("typography", document.typography, lines);
  renderYamlRecord("rounded", document.rounded, lines);
  renderYamlRecord("spacing", document.spacing, lines);
  renderYamlRecord("components", document.components, lines);

  lines.push("---");

  return `${lines.join("\n")}\n`;
}

function section(title: string, ...content: string[]): string {
  return `## ${title}\n\n${content.filter(Boolean).join("\n")}\n`;
}

function defaultOverview(document: DesignMdDocument): string {
  const counts = [
    [Object.keys(document.colors).length, "color"],
    [Object.keys(document.typography).length, "typography"],
    [Object.keys(document.rounded).length, "shape"],
    [Object.keys(document.spacing).length, "spacing"],
    [Object.keys(document.components).length, "component"]
  ] as const;

  const summary = counts
    .filter(([count]) => count > 0)
    .map(([count, label]) => `${count} ${label} token${count === 1 ? "" : "s"}`)
    .join(", ");

  return `${document.name} design tokens${summary ? ` — ${summary}` : ""}. The YAML front matter above is the normative source; the prose below explains how to apply it.`;
}

/**
 * Render the human-readable markdown body of a DESIGN.md file. Sections
 * follow the canonical order defined by the spec (Overview, Colors,
 * Typography, Layout, Shapes, Components); empty sections are omitted.
 */
function renderBody(
  document: DesignMdDocument,
  options: DesignMdGeneratePluginOptions = {}
): string {
  const sections: string[] = [
    section("Overview", options.overview ?? defaultOverview(document))
  ];

  const colors = Object.entries(document.colors);
  if (colors.length > 0) {
    sections.push(
      section(
        "Colors",
        colors
          .map(([name, value]) => {
            const description = document.colorDescriptions[name];

            return `- **${toTitleCase(name)} (${value}):**${description ? ` ${description}` : ""}`;
          })
          .join("\n")
      )
    );
  }

  const typography = Object.entries(document.typography);
  if (typography.length > 0) {
    sections.push(
      section(
        "Typography",
        typography
          .map(([name, value]) => {
            const details = Object.entries(value)
              .map(
                ([property, propertyValue]) => `${property}: ${propertyValue}`
              )
              .join(", ");

            return `- **${name}:** ${details}`;
          })
          .join("\n")
      )
    );
  }

  const spacing = Object.entries(document.spacing);
  if (spacing.length > 0) {
    sections.push(
      section(
        "Layout",
        "Spacing scale:",
        "",
        spacing.map(([name, value]) => `- **${name}:** ${value}`).join("\n")
      )
    );
  }

  const rounded = Object.entries(document.rounded);
  if (rounded.length > 0) {
    sections.push(
      section(
        "Shapes",
        "Corner radius scale:",
        "",
        rounded.map(([name, value]) => `- **${name}:** ${value}`).join("\n")
      )
    );
  }

  const components = Object.entries(document.components);
  if (components.length > 0) {
    sections.push(
      section(
        "Components",
        components
          .map(([name, props]) => {
            const details = Object.entries(props)
              .map(([property, value]) => `${property}: \`${value}\``)
              .join(", ");

            return `- **${name}:** ${details}`;
          })
          .join("\n")
      )
    );
  }

  return sections.join("\n");
}

/**
 * Render a complete DESIGN.md file — YAML front matter followed by the
 * markdown body.
 *
 * @see https://github.com/google-labs-code/design.md
 */
export function renderDesignMd(
  document: DesignMdDocument,
  options: DesignMdGeneratePluginOptions = {}
): string {
  return `${renderFrontMatter(document)}\n${renderBody(document, options)}`;
}

export { renderInstallMd };

/**
 * Generate a DESIGN.md design-system specification file from a Razorwind
 * schema.
 *
 * @see https://github.com/google-labs-code/design.md
 */
export function generateDesignMd(
  spec: Schema,
  options: DesignMdGeneratePluginOptions = {}
): GeneratorFunctionResult<Schema, DesignMdGeneratePluginOptions> {
  const document = applyGenerateOptions(extractDesignMd(spec), options);
  const outputPath = options.outputPath ?? "DESIGN.md";
  const content = renderDesignMd(document, options);
  const installBody =
    options.installGuide ??
    renderInstallMd({
      outputPath,
      name: options.name ?? document.name
    });
  const installPath = join(dirname(outputPath), "INSTALL.md");

  return {
    [outputPath]: {
      path: outputPath,
      language: "markdown",
      chunks: [
        {
          content,
          meta: {
            name: "razorwind-design-md"
          }
        }
      ]
    },
    [installPath]: {
      path: installPath,
      language: "markdown",
      chunks: [
        {
          content: installBody,
          meta: {
            name: "razorwind-design-md"
          }
        }
      ]
    }
  };
}

/**
 * Generate a DESIGN.md design-system specification file from a Razorwind schema.
 *
 * @see https://github.com/google-labs-code/design.md
 *
 * @example
 * ```ts
 * import { defineConfig } from "@razorwind/core";
 * import designMd from "@razorwind/design-md/generate";
 *
 * export default defineConfig({
 *   plugins: [designMd()]
 * });
 * ```
 */
export default definePlugin((options?: DesignMdGeneratePluginOptions) => ({
  name: "design-md:generate",
  themeGeneration: "combined",
  generate: async spec => {
    return generateDesignMd(spec, options ?? {});
  }
}));
