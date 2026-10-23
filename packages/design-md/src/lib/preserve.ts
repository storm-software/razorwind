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

/** Marks the start of markdown written by the DESIGN.md plugin. */
export const RAZORWIND_CONFIGURATION_START =
  "<!-- razorwind configuration start -->";

/** Marks the end of markdown written by the DESIGN.md plugin. */
export const RAZORWIND_CONFIGURATION_END =
  "<!-- razorwind configuration end -->";

const LEADING_FRONT_MATTER = /^\uFEFF?---\r?\n[\s\S]*?\r?\n---(?:\r?\n)?/;

const START_LINE =
  /^[ \t]*<!--\s*razorwind configuration start\s*-->[ \t]*\r?$/m;

const END_LINE = /^[ \t]*<!--\s*razorwind configuration end\s*-->[ \t]*\r?$/m;

/**
 * H2 titles `renderBody` can emit. On the first update of a file that has no
 * comment markers, these sections are replaced by the managed block. Other
 * headings stay in the file.
 */
const MANAGED_SECTIONS = new Set([
  "overview",
  "colors",
  "typography",
  "layout",
  "shapes",
  "components",
  "guidelines"
]);

/**
 * Wrap plugin markdown in the Razorwind configuration comments.
 *
 * @param markdown - Generated DESIGN.md sections, without front matter.
 * @returns The same markdown between the start and end comments.
 */
export function wrapRazorwindConfiguration(markdown: string): string {
  return `${RAZORWIND_CONFIGURATION_START}\n\n${markdown.trim()}\n\n${RAZORWIND_CONFIGURATION_END}\n`;
}

/**
 * Merge a newly rendered DESIGN.md into an existing file.
 *
 * The YAML front matter is replaced. Markdown between the Razorwind
 * configuration comments is replaced. Every other part of the file is kept.
 * A file that does not yet have the comments keeps its title block and any
 * headings the plugin does not generate.
 *
 * @param existing - Current DESIGN.md contents.
 * @param generated - DESIGN.md just rendered by the plugin.
 * @returns The merged file contents.
 */
export function mergeDesignMd(existing: string, generated: string): string {
  if (!existing.trim()) {
    return generated.endsWith("\n") ? generated : `${generated}\n`;
  }

  const { frontMatter, region } = splitGenerated(generated);
  const updated = applyManagedRegion(existing, frontMatter, region);

  return updated ?? composeLegacy(existing, frontMatter, region);
}

function splitGenerated(generated: string): {
  frontMatter: string;
  region: string;
} {
  const span = locateRegion(generated);
  if (!span) {
    throw new Error(
      "Generated DESIGN.md is missing razorwind configuration comments."
    );
  }

  const prefix = generated.slice(0, span.start);
  const frontMatterMatch = LEADING_FRONT_MATTER.exec(prefix);
  const frontMatter = frontMatterMatch
    ? `${prefix.slice(0, frontMatterMatch[0].length).trimEnd()}\n`
    : `${prefix.trim()}\n`;
  let regionEnd = span.end;
  if (generated[regionEnd - 1] === "\n") {
    regionEnd -= 1;
  }
  if (generated[regionEnd - 1] === "\r") {
    regionEnd -= 1;
  }

  return {
    frontMatter,
    region: generated.slice(span.start, regionEnd).trim()
  };
}

function applyManagedRegion(
  existing: string,
  frontMatter: string,
  region: string
): string | undefined {
  const span = locateRegion(existing);
  if (!span) {
    return undefined;
  }

  const prefix = replaceLeadingFrontMatter(
    existing.slice(0, span.start),
    frontMatter
  );
  const suffix = existing.slice(span.end);
  const gap = prefix.endsWith("\n") ? "" : "\n";

  return `${prefix}${gap}${region}\n${suffix}`;
}

function composeLegacy(
  existing: string,
  frontMatter: string,
  region: string
): string {
  const frontMatterMatch = LEADING_FRONT_MATTER.exec(existing);
  const body = frontMatterMatch
    ? existing.slice(frontMatterMatch[0].length)
    : existing;
  const { header, kept } = partitionBody(stripLooseMarkers(body));

  return joinDocument(frontMatter, header, region, kept);
}

function locateRegion(
  content: string
): { start: number; end: number } | undefined {
  const frontMatter = LEADING_FRONT_MATTER.exec(content);
  const offset = frontMatter?.[0].length ?? 0;
  const body = content.slice(offset);
  const startMatch = START_LINE.exec(body);
  if (startMatch?.index === undefined) {
    return undefined;
  }

  const afterStart = body.slice(startMatch.index + startMatch[0].length);
  const endMatch = END_LINE.exec(afterStart);
  if (endMatch?.index === undefined) {
    return undefined;
  }

  const start = offset + startMatch.index;
  let end =
    offset +
    startMatch.index +
    startMatch[0].length +
    endMatch.index +
    endMatch[0].length;
  if (content[end] === "\r") {
    end += 1;
  }
  if (content[end] === "\n") {
    end += 1;
  }

  return { start, end };
}

function replaceLeadingFrontMatter(
  content: string,
  frontMatter: string
): string {
  const normalized = frontMatter.endsWith("\n")
    ? frontMatter
    : `${frontMatter}\n`;
  const match = LEADING_FRONT_MATTER.exec(content);
  if (!match) {
    return `${normalized}${content}`;
  }

  return `${normalized}${content.slice(match[0].length)}`;
}

function stripLooseMarkers(body: string): string {
  let fenced = false;
  const lines: string[] = [];

  for (const line of body.split("\n")) {
    const current = stripCarriageReturn(line);
    if (isFence(current)) {
      fenced = !fenced;
      lines.push(line);
      continue;
    }
    if (!fenced && isMarkerLine(current)) {
      continue;
    }
    lines.push(line);
  }

  return lines.join("\n");
}

function partitionBody(body: string): { header: string; kept: string } {
  const lines = body.split("\n");
  let fenced = false;
  let headerEnd = lines.length;
  const sectionStarts: number[] = [];

  for (let index = 0; index < lines.length; index++) {
    const line = stripCarriageReturn(lines[index] ?? "");
    if (isFence(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced || !line.startsWith("##")) {
      continue;
    }

    const title = headingTitle(line);
    if (!title) {
      continue;
    }
    if (sectionStarts.length === 0) {
      headerEnd = index;
    }
    sectionStarts.push(index);
  }

  const header = lines.slice(0, headerEnd).join("\n");
  if (sectionStarts.length === 0) {
    return { header, kept: "" };
  }

  const kept: string[] = [];
  for (let index = 0; index < sectionStarts.length; index++) {
    const start = sectionStarts[index]!;
    const end = sectionStarts[index + 1] ?? lines.length;
    const title = headingTitle(stripCarriageReturn(lines[start] ?? ""));
    if (title && MANAGED_SECTIONS.has(title.toLowerCase())) {
      continue;
    }
    kept.push(lines.slice(start, end).join("\n"));
  }

  return { header, kept: kept.join("\n") };
}

function joinDocument(...parts: string[]): string {
  const text = parts
    .map(part => part.replace(/^(?:[ \t]*\r?\n)+|(?:\r?\n[ \t]*)+$/g, ""))
    .filter(part => part.trim().length > 0)
    .join("\n\n");

  return `${text}\n`;
}

function headingTitle(line: string): string | undefined {
  return /^##[ \t]+(.+?)\s*#*\s*$/.exec(line)?.[1]?.trim();
}

function isFence(line: string): boolean {
  return /^(?:`{3,}|~{3,})/.test(line.trim());
}

function isMarkerLine(line: string): boolean {
  return (
    /^[ \t]*<!--\s*razorwind configuration start\s*-->[ \t]*$/.test(line) ||
    /^[ \t]*<!--\s*razorwind configuration end\s*-->[ \t]*$/.test(line)
  );
}

function stripCarriageReturn(line: string): string {
  return line.endsWith("\r") ? line.slice(0, -1) : line;
}
