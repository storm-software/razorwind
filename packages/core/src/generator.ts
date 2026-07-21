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
import { defineGenerator, useExecution } from "@power-plant/core";
import { findFilePath } from "@stryke/path/find";
import { isSetString } from "@stryke/type-checks/is-set-string";
import StyleDictionary from "style-dictionary";
import { createConfig, getConfig } from "./registry/config";
import type { Schema } from "./schema";
import { schema } from "./schema";
import { loadTokens, registerWindieParsers } from "./tokens";
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
  schema,
  input: async (options: InputOptions): Promise<Schema> => {
    const { registryPath, tokensPath } = options;
    const { cwd } = useExecution();

    const registryRoot = isSetString(registryPath)
      ? findFilePath(registryPath)
      : cwd;
    const registry =
      (await getConfig(registryRoot)) ??
      createConfig({
        resolvedPaths: { cwd: registryRoot }
      });

    registerWindieParsers(StyleDictionary);

    const tokens = await loadTokens({
      cwd,
      tokensPath,
      fallbackPaths: [
        registry.resolvedPaths?.tailwindCss,
        registry.tailwind?.css
      ]
    });

    return { registry, tokens };
  },
  generator: async (
    _spec,
    _options
  ): Promise<GeneratorFunctionResult<Schema, Config>> => {
    return {};
  }
});
