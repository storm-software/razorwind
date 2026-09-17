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

import type { Font, LocalFont, Schema } from "@razorwind/core/schema";
import { resolveSchemaIdentity } from "@razorwind/core/utils";
import { escapeTableCell } from "./format";

function inlineValues(
  values: readonly (string | number)[] | undefined
): string | undefined {
  return values?.length
    ? values
        .map(String)
        .toSorted((a, b) => a.localeCompare(b))
        .map(value => `\`${value}\``)
        .join(", ")
    : undefined;
}

function renderLocalFiles(font: LocalFont): string {
  const rows = font.files.toSorted((a, b) => a.path.localeCompare(b.path)).map(
    file =>
      `| \`${escapeTableCell(file.path)}\` | ${
        file.format ? `\`${escapeTableCell(file.format)}\`` : ""
      } | ${file.weight !== undefined ? `\`${file.weight}\`` : ""} | ${
        file.style ? `\`${escapeTableCell(file.style)}\`` : ""
      } | ${
        file.unicodeRange
          ? `\`${escapeTableCell(file.unicodeRange)}\``
          : ""
      } |`
  );

  return [
    "### Files",
    "| Path | Format | Weight | Style | Unicode Range |",
    "| --- | --- | --- | --- | --- |",
    ...rows
  ].join("\n");
}

function renderFont(font: Font): string {
  const fallbacks = inlineValues(font.fallbacks);
  const tags = inlineValues(font.tags);
  const metadata = [
    `- **Name:** \`${font.name}\``,
    `- **Source:** \`${font.source}\``,
    ...(font.family ? [`- **Family:** \`${font.family}\``] : []),
    ...(font.role ? [`- **Role:** \`${font.role}\``] : []),
    ...(fallbacks ? [`- **Fallbacks:** ${fallbacks}`] : []),
    ...(font.display ? [`- **Display:** \`${font.display}\``] : []),
    ...(font.category ? [`- **Category:** \`${font.category}\``] : []),
    ...(tags ? [`- **Tags:** ${tags}`] : [])
  ];

  if (font.source === "google") {
    const weights = inlineValues(font.weights);
    const styles = inlineValues(font.styles);
    const subsets = inlineValues(font.subsets);
    metadata.push(
      ...(weights ? [`- **Weights:** ${weights}`] : []),
      ...(styles ? [`- **Styles:** ${styles}`] : []),
      ...(subsets ? [`- **Subsets:** ${subsets}`] : []),
      ...(font.variable !== undefined
        ? [`- **Variable:** \`${font.variable}\``]
        : [])
    );
  }

  return [
    `## ${font.title}`,
    ...(font.description ? [font.description] : []),
    metadata.join("\n"),
    ...(font.source === "local" ? [renderLocalFiles(font)] : [])
  ].join("\n\n");
}

/** Render the llms.txt font companion document. */
export function renderFontsDocument(spec: Schema): string {
  const title = resolveSchemaIdentity(spec).title ?? "Design System";
  const fonts = Object.values(spec.fonts).toSorted((a, b) =>
    a.name.localeCompare(b.name)
  );
  const sections = [
    `# ${title} Fonts`,
    "Use only documented font families and roles when selecting typography."
  ];

  if (fonts.length === 0) {
    sections.push("No documented fonts were found.");
  } else {
    sections.push(...fonts.map(renderFont));
  }

  return `${sections.join("\n\n")}\n`;
}
