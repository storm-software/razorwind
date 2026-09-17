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

import type { Icon, Schema } from "@razorwind/core/schema";
import { resolveSchemaIdentity } from "@razorwind/core/utils";
import { escapeTableCell } from "./format";

function inlineValues(values: string[] | undefined): string | undefined {
  return values?.length
    ? values.map(value => `\`${value}\``).join(", ")
    : undefined;
}

function renderFiles(files: Icon["files"]): string | undefined {
  if (!files || files.length === 0) {
    return undefined;
  }

  const rows = files
    .toSorted(
      (a, b) =>
        (a.theme ?? "").localeCompare(b.theme ?? "") ||
        a.path.localeCompare(b.path)
    )
    .map(
      file =>
        `| \`${escapeTableCell(file.path)}\` | ${
          file.type ? `\`${escapeTableCell(file.type)}\`` : ""
        } | ${file.theme ? `\`${escapeTableCell(file.theme)}\`` : ""} | ${
          file.target ? `\`${escapeTableCell(file.target)}\`` : ""
        } |`
    );

  return [
    "### Files",
    "| Path | Type | Theme | Target |",
    "| --- | --- | --- | --- |",
    ...rows
  ].join("\n");
}

function renderIcon(icon: Icon): string {
  const tags = inlineValues(icon.tags);
  const aliases = inlineValues(icon.aliases);
  const related = inlineValues(icon.related);
  const metadata = [
    `- **Name:** \`${icon.name}\``,
    ...(icon.category ? [`- **Category:** \`${icon.category}\``] : []),
    ...(tags ? [`- **Tags:** ${tags}`] : []),
    ...(aliases ? [`- **Aliases:** ${aliases}`] : []),
    ...(related ? [`- **Related:** ${related}`] : []),
    ...(icon.since ? [`- **Since:** \`${icon.since}\``] : []),
    ...(icon.version ? [`- **Version:** \`${icon.version}\``] : [])
  ];
  const files = renderFiles(icon.files);

  return [
    `## ${icon.title}`,
    ...(icon.description ? [icon.description] : []),
    metadata.join("\n"),
    ...(files ? [files] : [])
  ].join("\n\n");
}

/** Render the llms.txt icon companion document. */
export function renderIconsDocument(spec: Schema): string {
  const title = resolveSchemaIdentity(spec).title ?? "Design System";
  const icons = Object.values(spec.icons).toSorted((a, b) =>
    a.name.localeCompare(b.name)
  );
  const sections = [
    `# ${title} Icons`,
    "Use documented icon names and aliases; do not invent unavailable assets."
  ];

  if (icons.length === 0) {
    sections.push("No documented icons were found.");
  } else {
    sections.push(...icons.map(renderIcon));
  }

  return `${sections.join("\n\n")}\n`;
}
