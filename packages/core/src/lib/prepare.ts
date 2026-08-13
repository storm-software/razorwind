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

import type { ExecutionContext } from "@power-plant/core";
import { defu } from "defu";
import type { Schema, Tokens } from "../schema";
import type { Config, Options } from "../types/config";
import { loadComponents } from "./components";
import { loadFonts } from "./fonts";
import type { GenerationRun } from "./generate";
import { loadIcons } from "./icons";
import { resolveSchemaMeta } from "./meta";
import { resolveConfigs } from "./resolve-config";
import { isEmptyTokens, loadTokens } from "./tokens";

const NO_PLUGINS_ERROR =
  "Razorwind will not generate any code - no plugins configured. Please add at least one plugin to the configuration.";

const NO_TOKENS_ERROR =
  "Unable to load design tokens for the current workspace. Please ensure that Razorwind is configured correctly and that the tokens are available.";

/**
 * Load tokens, extract, and validate for the current {@link Config} on
 * `context.options`.
 */
export async function prepareSpec(
  context: ExecutionContext<Schema, Config, void>
): Promise<Schema> {
  if (context.options.plugins.length === 0) {
    throw new Error(NO_PLUGINS_ERROR);
  }

  let tokens: Tokens | Record<string, Tokens> | undefined =
    context.options.tokens;
  if (!tokens || isEmptyTokens(tokens)) {
    tokens = await loadTokens(context);
  }

  const meta = await resolveSchemaMeta(context.cwd, context.options);

  let spec: Schema = {
    ...meta,
    tokens: tokens ?? {},
    components: defu(
      context.options.components ?? {},
      (await loadComponents(context)) ?? {}
    ),
    icons: defu(context.options.icons ?? {}, (await loadIcons(context)) ?? {}),
    fonts: defu(context.options.fonts ?? {}, (await loadFonts(context)) ?? {})
  };

  for (const plugin of context.options.plugins.filter(
    plugin => plugin.extract
  )) {
    spec = await plugin.extract!(spec, context.options);
  }

  if (!spec.tokens || isEmptyTokens(spec.tokens)) {
    throw new Error(NO_TOKENS_ERROR);
  }

  for (const plugin of context.options.plugins.filter(
    plugin => plugin.validate
  )) {
    await plugin.validate!(spec, context.options);
  }

  return spec;
}

/**
 * Resolve config (including array exports) and prepare a {@link GenerationRun}
 * per item. Each run loads tokens and runs extract/validate independently.
 */
export async function prepareGenerationRuns(
  context: ExecutionContext<Schema, Config, void>,
  options: Options
): Promise<GenerationRun[]> {
  const configs = await resolveConfigs(context.cwd, options);
  const runs: GenerationRun[] = [];

  for (const config of configs) {
    context.options = config;
    runs.push({
      spec: await prepareSpec(context),
      config
    });
  }

  return runs;
}
