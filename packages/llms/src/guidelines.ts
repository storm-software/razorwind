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

import type { Schema } from "@razorwind/core/schema";
import type { GuidelineEntry } from "@razorwind/core/utils";
import {
  groupGuidelines,
  renderGuidelineBody,
  resolveSchemaIdentity
} from "@razorwind/core/utils";

function renderGuideline(entry: GuidelineEntry, level: number): string {
  const { guideline } = entry;

  return [
    `${"#".repeat(level)} ${guideline.name}`,
    [
      `- **Id:** \`${entry.path}\``,
      ...(guideline.version ? [`- **Version:** \`${guideline.version}\``] : [])
    ].join("\n"),
    ...(guideline.content ? [renderGuidelineBody(guideline, level)] : [])
  ].join("\n\n");
}

/** Render the llms.txt style-guide companion document. */
export function renderGuidelinesDocument(spec: Schema): string {
  const title = resolveSchemaIdentity(spec).title ?? "Design System";
  const groups = groupGuidelines(spec.guidelines);
  const sections = [
    `# ${title} Guidelines`,
    "Follow these style guidelines when designing or implementing with this design system."
  ];

  if (groups.length === 0) {
    sections.push("No documented guidelines were found.");
  }

  for (const group of groups) {
    if (group.title) {
      sections.push(`## ${group.title}`);
    }
    sections.push(
      ...group.guidelines.map(entry =>
        renderGuideline(entry, group.title ? 3 : 2)
      )
    );
  }

  return `${sections.join("\n\n")}\n`;
}
