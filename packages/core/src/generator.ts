/* -------------------------------------------------------------------

                       🗲 Storm Software - Windie

 This code was released as part of the Windie project. Windie
 is maintained by Storm Software under the Apache-2.0 license, and is
 free for commercial and private use. For more information, please visit
 our licensing page at https://stormsoftware.com/licenses/projects/windie.

 Website:                  https://stormsoftware.com
 Repository:               https://github.com/storm-software/windie
 Documentation:            https://docs.stormsoftware.com/projects/windie
 Contact:                  https://stormsoftware.com/contact

 SPDX-License-Identifier:  Apache-2.0

 ------------------------------------------------------------------- */

import type { GeneratorFunctionResult } from "@power-plant/core";
import { defineGenerator } from "@power-plant/core";
import type { SchemaSourceConfig } from "@power-plant/schema";
import type { Schema } from "./schema";
import { schema } from "./schema";
import type { Config, InputOptions } from "./types/config";

/**
 * A Power Plant generator for Windie.
 *
 * @param spec - The Windie schema to generate from.
 * @param options - Windie config (plugins, outDir, lint, …).
 * @returns Generated documents keyed by output filename.
 */
export default defineGenerator<Schema, Config, void>({
  meta: {
    name: "windie",
    title: "Windie",
    description:
      "A generator that uses Windie to generate design system code from design tokens and components.",
    version: "1.0",
    tags: ["windie", "dtcg"]
  },
  schema: schema as unknown as SchemaSourceConfig<Schema>,
  input: async (_options: InputOptions): Promise<Schema> => {
    throw new Error(
      "Windie spec loading is not implemented yet. Provide a spec via Power Plant input config."
    );
  },
  generator: async (
    _spec,
    _options
  ): Promise<GeneratorFunctionResult<Schema, Config>> => {
    return {};
  }
});
