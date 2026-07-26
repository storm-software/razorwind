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

import type {
  GeneratedDocument,
  GeneratorFunctionResult
} from "@power-plant/core";
import { defineGenerator, defineSchema, useExecution } from "@power-plant/core";
import { isEmptyObject } from "@stryke/type-checks/is-empty-object";
import { isSetString } from "@stryke/type-checks/is-set-string";
import { defu } from "defu";
import StyleDictionary from "style-dictionary";
import packageJson from "../package.json" with { type: "json" };
import { resolveConfig } from "./lib/resolve-config";
import { loadTokens, registerRazorwindParsers } from "./lib/tokens";
import type { Schema, Tokens } from "./schema";
import { schema } from "./schema";
import type { Config, Options } from "./types/config";

/**
 * A Power Plant generator for Razorwind.
 *
 * Orchestrates configured {@link Plugin}s: Style Dictionary parsers / preprocessors, then `extract` → `validate` on input, then `generate`.
 */
export const generator = defineGenerator<Schema, Options, void>({
  meta: {
    name: "razorwind",
    title: "Razorwind",
    description:
      "A generator that uses Razorwind to generate design system code from design tokens and components.",
    version: packageJson.version,
    tags: ["razorwind", "dtcg"]
  },
  schema: defineSchema<Schema>({ schema }),
  input: async (options: Options): Promise<Schema> => {
    // eslint-disable-next-line react-hooks/rules-of-hooks, react/rules-of-hooks
    const context = useExecution<Schema, Config>();
    context.options = await resolveConfig(context.cwd, options);

    if (context.options.plugins.length === 0) {
      throw new Error(
        "Razorwind will not generate any code - no plugins configured. Please add at least one plugin to the configuration."
      );
    }

    registerRazorwindParsers(context.options.plugins, StyleDictionary);

    let tokens: Tokens | Record<string, Tokens> | undefined =
      context.options.tokens;
    if (!tokens || isEmptyObject(tokens)) {
      tokens = await loadTokens(context.options, {
        cwd: context.cwd,
        tokensPath: isSetString(context.options.tokensPath)
          ? context.options.tokensPath
          : undefined
      });
    }

    let spec: Schema = { tokens: tokens ?? {}, components: {} };

    for (const plugin of context.options.plugins.filter(
      plugin => plugin.extract
    )) {
      spec = await plugin.extract!(spec, context.options);
    }

    if (!spec.tokens || isEmptyObject(spec.tokens)) {
      throw new Error(
        "Unable to load design tokens for the current workspace. Please ensure that Razorwind is configured correctly and that the tokens are available."
      );
    }

    for (const plugin of context.options.plugins.filter(
      plugin => plugin.validate
    )) {
      await plugin.validate!(spec, context.options);
    }

    return spec;
  },
  generator: async (
    spec
  ): Promise<GeneratorFunctionResult<Schema, Options>> => {
    // eslint-disable-next-line react-hooks/rules-of-hooks, react/rules-of-hooks
    const context = useExecution<Schema, Config>();

    let documents: Record<string, GeneratedDocument> = {};
    for (const plugin of context.options.plugins.filter(
      plugin => plugin.generate
    )) {
      const generated = await plugin.generate!(spec, context.options);
      documents = defu(generated, documents);
    }

    return documents;
  }
});
