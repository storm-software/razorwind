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
import type { LlmsDocumentSet, LlmsPluginOptions } from "./types";

const FILES = [
  ["index", "llms.txt"],
  ["tokens", "llms-tokens.txt"],
  ["components", "llms-components.txt"],
  ["icons", "llms-icons.txt"],
  ["fonts", "llms-fonts.txt"]
] as const;

/** Render the complete llms.txt document set from a Razorwind schema. */
export function renderLlmsDocuments(
  spec: Schema,
  options: LlmsPluginOptions = {}
): LlmsDocumentSet {
  const title =
    options.title ?? resolveSchemaIdentity(spec).title ?? "Design System";

  return {
    index: `# ${title}\n`,
    tokens: `# ${title} Tokens\n`,
    components: `# ${title} Components\n`,
    icons: `# ${title} Icons\n`,
    fonts: `# ${title} Fonts\n`
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
