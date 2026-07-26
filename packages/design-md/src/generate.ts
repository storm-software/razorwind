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
import { extractDesignMd } from "./extract";
import { toTitleCase, toYamlScalar } from "./format";
import type { DesignMdDocument, Options } from "./types";

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
export function renderFrontMatter(document: DesignMdDocument): string {
  const lines: string[] = ["---"];

  if (document.version) {
    lines.push(`version: ${toYamlScalar(document.version)}`);
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
export function renderBody(
  document: DesignMdDocument,
  options: Options = {}
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
  options: Options = {}
): string {
  return `${renderFrontMatter(document)}\n${renderBody(document, options)}`;
}

/**
 * Generate a DESIGN.md design-system specification file from a Razorwind
 * schema.
 *
 * @see https://github.com/google-labs-code/design.md
 */
export function generateDesignMd(
  spec: Schema,
  options: Options = {}
): GeneratorFunctionResult<Schema, Options> {
  const outFile = options.outFile ?? "DESIGN.md";
  const document = extractDesignMd(spec, options);

  return {
    [outFile]: {
      path: outFile,
      language: "markdown",
      chunks: [
        {
          content: renderDesignMd(document, options),
          meta: {
            name: "razorwind-design-md"
          }
        }
      ]
    }
  };
}
