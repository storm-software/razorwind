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
import type { BaseFlatToken } from "@razorwind/core/utils";
import {
  flattenTokens,
  resolveSchemaIdentity,
  titleCase
} from "@razorwind/core/utils";
import { escapeTableCell } from "./format";

function tokenGroup(token: BaseFlatToken): string {
  return token.path.split(".")[0] || "tokens";
}

function renderTokenTable(tokens: BaseFlatToken[]): string {
  const rows = tokens
    .toSorted((a, b) => a.path.localeCompare(b.path))
    .map(
      token =>
        `| \`${escapeTableCell(token.path)}\` | ${
          token.type ? `\`${escapeTableCell(token.type)}\`` : ""
        } | \`${escapeTableCell(token.cssValue)}\` | ${escapeTableCell(
          token.description
        )} |`
    );

  return [
    "| Token | Type | Value | Description |",
    "| --- | --- | --- | --- |",
    ...rows
  ].join("\n");
}

/** Render the llms.txt design-token companion document. */
export function renderTokensDocument(spec: Schema): string {
  const title = resolveSchemaIdentity(spec).title ?? "Design System";
  const tokens = flattenTokens(spec.tokens, {
    shouldIncludeToken: token => token.skipDocs !== true
  });
  const sections = [
    `# ${title} Tokens`,
    "Use these documented design-token names and values as the source of truth; do not invent replacement values."
  ];

  if (tokens.length === 0) {
    sections.push("No documented tokens were found.");
    return `${sections.join("\n\n")}\n`;
  }

  const themes = [...new Set(tokens.map(token => token.theme ?? ""))].toSorted(
    (a, b) => a.localeCompare(b)
  );
  const showThemes = themes.length > 1 || themes[0] !== "";

  for (const theme of themes) {
    if (showThemes) {
      sections.push(`## ${theme ? titleCase(theme) : "Default"}`);
    }

    const themed = tokens.filter(token => (token.theme ?? "") === theme);
    const groups = [...new Set(themed.map(tokenGroup))].toSorted((a, b) =>
      a.localeCompare(b)
    );

    for (const group of groups) {
      sections.push(
        `${showThemes ? "###" : "##"} ${titleCase(group)}`,
        renderTokenTable(themed.filter(token => tokenGroup(token) === group))
      );
    }
  }

  return `${sections.join("\n\n")}\n`;
}
