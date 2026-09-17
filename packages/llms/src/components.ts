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
  Schema
} from "@razorwind/core/schema";
import { resolveSchemaIdentity } from "@razorwind/core/utils";
import { codeFence, escapeTableCell } from "./format";

function renderDependencies(
  heading: string,
  dependencies: Record<string, string> | undefined
): string | undefined {
  const entries = Object.entries(dependencies ?? {}).toSorted(([a], [b]) =>
    a.localeCompare(b)
  );

  if (entries.length === 0) {
    return undefined;
  }

  return [
    `### ${heading}`,
    entries.map(([name, version]) => `- \`${name}\`: \`${version}\``).join("\n")
  ].join("\n\n");
}

function renderFiles(files: Component["files"]): string | undefined {
  if (!files || files.length === 0) {
    return undefined;
  }

  const rows = files.toSorted((a, b) => a.path.localeCompare(b.path)).map(
    file =>
      `| \`${escapeTableCell(file.path)}\` | ${
        file.type ? `\`${escapeTableCell(file.type)}\`` : ""
      } | ${file.target ? `\`${escapeTableCell(file.target)}\`` : ""} |`
  );

  return [
    "### Files",
    "| Path | Type | Target |",
    "| --- | --- | --- |",
    ...rows
  ].join("\n");
}

function renderUsage(usage: ComponentUsage): string {
  const title = usage.title ?? usage.name ?? usage.path;
  const metadata = [
    `- **Path:** \`${usage.path}\``,
    ...(usage.language ? [`- **Language:** \`${usage.language}\``] : [])
  ];
  const sections = [
    `#### ${title}`,
    ...(usage.description ? [usage.description] : []),
    metadata.join("\n"),
    ...(usage.content
      ? [codeFence(usage.content, usage.language ?? "")]
      : [])
  ];

  return sections.join("\n\n");
}

function inlineValues(values: string[] | undefined): string | undefined {
  return values?.length
    ? values.map(value => `\`${value}\``).join(", ")
    : undefined;
}

function renderComponent(component: Component): string {
  const tags = inlineValues(component.tags);
  const related = inlineValues(component.related);
  const metadata = [
    `- **Name:** \`${component.name}\``,
    `- **Type:** \`${component.type}\``,
    ...(component.category
      ? [`- **Category:** \`${component.category}\``]
      : []),
    ...(tags ? [`- **Tags:** ${tags}`] : []),
    ...(related ? [`- **Related:** ${related}`] : []),
    ...(component.since ? [`- **Since:** \`${component.since}\``] : []),
    ...(component.version ? [`- **Version:** \`${component.version}\``] : [])
  ];
  const dependencies = [
    renderDependencies("Dependencies", component.dependencies),
    renderDependencies("Development Dependencies", component.devDependencies),
    renderDependencies("Registry Dependencies", component.registryDependencies)
  ].filter((value): value is string => value !== undefined);
  const files = renderFiles(component.files);
  const usage = component.usage
    ?.toSorted((a, b) =>
      (a.name ?? a.path).localeCompare(b.name ?? b.path)
    )
    .map(renderUsage);
  const sections = [
    `## ${component.title}`,
    ...(component.description ? [component.description] : []),
    metadata.join("\n"),
    ...dependencies,
    ...(files ? [files] : []),
    ...(usage?.length ? ["### Usage", ...usage] : [])
  ];

  return sections.join("\n\n");
}

/** Render the llms.txt component companion document. */
export function renderComponentsDocument(spec: Schema): string {
  const title = resolveSchemaIdentity(spec).title ?? "Design System";
  const components = Object.values(spec.components).toSorted((a, b) =>
    a.name.localeCompare(b.name)
  );
  const sections = [
    `# ${title} Components`,
    "Use documented components and examples instead of creating one-off replacements."
  ];

  if (components.length === 0) {
    sections.push("No documented components were found.");
  } else {
    sections.push(...components.map(renderComponent));
  }

  return `${sections.join("\n\n")}\n`;
}
