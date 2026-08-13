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
import { defineGenerator, defineSchema, useExecution } from "@power-plant/core";
import type StyleDictionary from "style-dictionary";
import packageJson from "../package.json" with { type: "json" };
import type { GenerationRun } from "./lib/generate";
import { generateAllPluginDocuments } from "./lib/generate";
import { prepareGenerationRuns } from "./lib/prepare";
import { writeGeneratedDocuments } from "./lib/write-documents";
import type { Schema } from "./schema";
import { schema } from "./schema";
import type { Config, Options } from "./types/config";

declare module "@power-plant/core" {
  interface Context {
    sd: StyleDictionary;
    generationRuns?: GenerationRun[];
  }
}

export * from "./config";
export * from "./lib";
export type * from "./types";

/**
 * A Power Plant generator for Razorwind.
 *
 * Orchestrates configured {@link Plugin}s: extraction hooks, then
 * `extract` → `validate` on input, then `generate`.
 *
 * Array `defineConfig([...])` exports run that pipeline once per item.
 */
export const generator = defineGenerator<Schema, Options, any>({
  meta: {
    name: "razorwind",
    title: "Razorwind",
    description:
      "A generator that uses Razorwind to generate design system code from design tokens, components, icons, and fonts.",
    version: packageJson.version,
    tags: ["razorwind", "dtcg"]
  },
  schema: defineSchema<Schema>({ schema }),
  input: async (options: Options): Promise<Schema> => {
    // eslint-disable-next-line react-hooks/rules-of-hooks, react/rules-of-hooks
    const context = useExecution<Schema, Config>();
    const runs = await prepareGenerationRuns(context, options);
    const first = runs[0];
    if (!first) {
      throw new Error("Unable to resolve Razorwind configuration.");
    }

    context.generationRuns = runs;
    context.options = first.config;

    return first.spec;
  },
  output: async (_spec, _options, documents) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks, react/rules-of-hooks
    const context = useExecution<Schema, Config>();
    await writeGeneratedDocuments(documents, context.cwd);
  },
  generator: async (
    spec
  ): Promise<GeneratorFunctionResult<Schema, Options>> => {
    // eslint-disable-next-line react-hooks/rules-of-hooks, react/rules-of-hooks
    const context = useExecution<Schema, Config>();
    const runs =
      context.generationRuns && context.generationRuns.length > 0
        ? context.generationRuns
        : [{ spec, config: context.options }];

    return generateAllPluginDocuments(runs);
  }
});
