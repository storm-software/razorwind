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

import type { Guideline, Guidelines } from "../schema/guidelines";
import { titleCase } from "./title-case";

export interface GuidelineEntry {
  /** The guideline key (the markdown file name without extension). */
  id: string;
  /** Slash-joined path of group keys and the guideline id. */
  path: string;
  guideline: Guideline;
}

export interface GuidelineGroup {
  /** Slash-joined group keys; empty for top-level guidelines. */
  id: string;
  /** Title-cased group label (`" / "` joined); empty for top-level guidelines. */
  title: string;
  guidelines: GuidelineEntry[];
}

/** Distinguish a {@link Guideline} leaf from a nested {@link Guidelines} group. */
export function isGuideline(value: Guideline | Guidelines): value is Guideline {
  return (
    typeof value.content === "string" && typeof value.name === "string"
  );
}

/**
 * Shift markdown headings down by `levels` (capped at `######`). Fenced code
 * blocks are left untouched.
 */
function demoteHeadings(content: string, levels: number): string {
  let fenced = false;

  return content
    .split("\n")
    .map(line => {
      if (/^\s*(?:```|~~~)/.test(line)) {
        fenced = !fenced;
        return line;
      }

      return fenced
        ? line
        : line.replace(
            /^(#{1,6})(\s)/,
            (_, hashes: string, space: string) =>
              `${"#".repeat(Math.min(6, hashes.length + levels))}${space}`
          );
    })
    .join("\n");
}

/**
 * Prepare guideline content for rendering under a heading the generator
 * emits itself (at `level`): a leading `# <name>` duplicating the guideline
 * name is dropped and remaining headings are nested below `level`.
 */
export function renderGuidelineBody(
  guideline: Guideline,
  level: number
): string {
  const content = guideline.content.replace(
    /^#[ \t]+(.+?)[ \t]*#*[ \t]*(?:\r?\n|$)/,
    (heading, title: string) =>
      title.trim().toLowerCase() === guideline.name.trim().toLowerCase()
        ? ""
        : heading
  );

  return demoteHeadings(content.trim(), level);
}

/**
 * Flatten nested {@link Guidelines} into sorted groups. Top-level guidelines
 * come first (group `id` of `""`), followed by nested groups by path.
 */
export function groupGuidelines(
  guidelines: Guidelines | undefined
): GuidelineGroup[] {
  const groups = new Map<string, GuidelineGroup>();

  const visit = (record: Guidelines, keys: string[]) => {
    for (const [key, value] of Object.entries(record)) {
      if (!isGuideline(value)) {
        visit(value, [...keys, key]);
        continue;
      }

      const id = keys.join("/");
      let group = groups.get(id);
      if (!group) {
        group = { id, title: keys.map(titleCase).join(" / "), guidelines: [] };
        groups.set(id, group);
      }
      group.guidelines.push({
        id: key,
        path: [...keys, key].join("/"),
        guideline: value
      });
    }
  };
  visit(guidelines ?? {}, []);

  return [...groups.values()]
    .toSorted((a, b) => a.id.localeCompare(b.id))
    .map(group => ({
      ...group,
      guidelines: group.guidelines.toSorted((a, b) =>
        a.guideline.name.localeCompare(b.guideline.name)
      )
    }));
}
