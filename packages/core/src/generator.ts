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
import { defineGenerator, useExecution } from "@power-plant/core";
import { findFilePath } from "@stryke/path/find";
import { isSetString } from "@stryke/type-checks/is-set-string";
import StyleDictionary from "style-dictionary";
import { createConfig, getConfig } from "./registry/config";
import type { Schema } from "./schema";
import { schema } from "./schema";
import {
  detectTailwindWorkspace,
  extractTailwindTokens,
  loadTokens,
  registerRazorwindParsers
} from "./tokens";
import type { Config, InputOptions } from "./types/config";

function isEmptyTokens(tokens: unknown): boolean {
  if (!tokens || typeof tokens !== "object") {
    return true;
  }
  return Object.keys(tokens).length === 0;
}

/**
 * A Power Plant generator for Razorwind.
 *
 * @param spec - The Razorwind schema to generate from.
 * @param options - Razorwind config (plugins, outDir, lint, …).
 * @returns Generated documents keyed by output filename.
 */
export default defineGenerator<Schema, Config, void>({
  meta: {
    name: "razorwind",
    title: "Razorwind",
    description:
      "A generator that uses Razorwind to generate design system code from design tokens and components.",
    version: "1.0",
    tags: ["razorwind", "dtcg"]
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

    registerRazorwindParsers(StyleDictionary);

    const tailwindCssCandidates = [
      registry.resolvedPaths?.tailwindCss,
      registry.tailwind?.css
    ];

    let tokens;

    if (isSetString(tokensPath)) {
      tokens = await loadTokens({ cwd, tokensPath });
    } else {
      const workspace = await detectTailwindWorkspace(
        cwd,
        registry.tailwind?.css
      );

      // Tailwind v4: resolve `@theme` / `@import` via `@tailwindcss/node`.
      if (workspace.configured && workspace.version === "v4") {
        tokens = await extractTailwindTokens({
          cwd,
          cssPath:
            registry.resolvedPaths?.tailwindCss ??
            registry.tailwind?.css ??
            workspace.cssFile
        });
      }

      if (isEmptyTokens(tokens)) {
        tokens = await loadTokens({
          cwd,
          fallbackPaths: tailwindCssCandidates
        });
      }
    }

    return { registry, tokens: tokens ?? {} };
  },
  generator: async (
    _spec,
    _options
  ): Promise<GeneratorFunctionResult<Schema, Config>> => {
    return {};
  }
});
