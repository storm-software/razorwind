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
import { createDocument, resolveSchemaIdentity } from "@razorwind/core/utils";
import { join } from "node:path";
import { renderComponentsDocument } from "./components";
import { renderFontsDocument } from "./fonts";
import { resolveResourceUrl, validHttpUrl } from "./format";
import { renderIconsDocument } from "./icons";
import { renderTokensDocument } from "./tokens";
import type { LlmsDocumentSet, LlmsPluginOptions } from "./types";

export { renderComponentsDocument } from "./components";
export { renderFontsDocument } from "./fonts";
export { renderIconsDocument } from "./icons";
export { renderTokensDocument } from "./tokens";

const FILES = [
  ["index", "llms.txt"],
  ["tokens", "llms-tokens.txt"],
  ["components", "llms-components.txt"],
  ["icons", "llms-icons.txt"],
  ["fonts", "llms-fonts.txt"]
] as const;

const COMPANION_LINKS = [
  [
    "Design Tokens",
    "llms-tokens.txt",
    "Approved design tokens, values, themes, and usage descriptions."
  ],
  [
    "Components",
    "llms-components.txt",
    "Available components, dependencies, files, and usage examples."
  ],
  [
    "Icons",
    "llms-icons.txt",
    "Available icon names, aliases, metadata, and asset variants."
  ],
  [
    "Fonts",
    "llms-fonts.txt",
    "Approved font families, roles, sources, weights, and files."
  ]
] as const;

function resolveTitle(spec: Schema, options: LlmsPluginOptions): string {
  if (options.title !== undefined && options.title.trim().length === 0) {
    throw new Error("title cannot be empty.");
  }

  return (
    options.title?.trim() ??
    resolveSchemaIdentity(spec).title ??
    "Design System"
  );
}

/** Render the standards-compatible llms.txt index. */
export function renderLlmsIndex(
  spec: Schema,
  options: LlmsPluginOptions = {}
): string {
  const title = resolveTitle(spec, options);
  const summary = (options.summary ?? spec.description)?.trim();
  const details = options.details?.trim();

  if (details && /^ {0,3}#{1,2}\s+/m.test(details)) {
    throw new Error("details cannot contain H1 or H2 headings.");
  }

  const referenceLinks = COMPANION_LINKS.map(
    ([label, file, description]) =>
      `- [${label}](${resolveResourceUrl(options.baseUrl, file)}): ${description}`
  );
  const homepage = validHttpUrl(spec.homepage);
  const repository = validHttpUrl(spec.repository);
  const resources = [
    ...(homepage ? [`- [Homepage](${homepage}): Design system website.`] : []),
    ...(repository ? [`- [Repository](${repository}): Source repository.`] : [])
  ];
  const sections = [
    `# ${title}`,
    ...(summary ? [`> ${summary}`] : []),
    ...(details ? [details] : []),
    "## Design System Reference",
    referenceLinks.join("\n"),
    ...(resources.length > 0
      ? ["## Project Resources", resources.join("\n")]
      : [])
  ];

  return `${sections.join("\n\n")}\n`;
}

/** Render the complete llms.txt document set from a Razorwind schema. */
export function renderLlmsDocuments(
  spec: Schema,
  options: LlmsPluginOptions = {}
): LlmsDocumentSet {
  return {
    index: renderLlmsIndex(spec, options),
    tokens: renderTokensDocument(spec),
    components: renderComponentsDocument(spec),
    icons: renderIconsDocument(spec),
    fonts: renderFontsDocument(spec)
  };
}

/** Generate the five llms.txt files as Power Plant documents. */
export function generateLlms(
  spec: Schema,
  options: LlmsPluginOptions = {}
): GeneratorFunctionResult<Schema, LlmsPluginOptions> {
  const rendered = renderLlmsDocuments(spec, options);
  const outputPath = options.outputPath?.trim();
  const documents: GeneratorFunctionResult<Schema, LlmsPluginOptions> = {};

  for (const [key, file] of FILES) {
    const path = outputPath ? join(outputPath, file) : file;
    documents[path] = createDocument<Schema, LlmsPluginOptions>(
      path,
      rendered[key],
      { name: "llms" },
      false,
      "markdown"
    );
  }

  return documents;
}

export default generateLlms;
