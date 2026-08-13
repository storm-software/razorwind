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

import type { GeneratedDocument } from "@power-plant/core";
import { defu } from "defu";
import type { Schema, Tokens } from "../schema";
import type { Config } from "../types/config";
import type { TokenSet } from "../utils/flatten-tokens";
import {
  isSharedThemeId,
  resolveTokenSets,
  SHARED_THEME_ID
} from "../utils/flatten-tokens";
import { mergeTokenTrees } from "../utils/merge-tokens";
import {
  applyThemeToDocuments,
  applyThemeToTitle
} from "../utils/theme-output";

/**
 * One generation pass: a resolved {@link Schema} plus the {@link Config}
 * that produced it.
 *
 * Array `defineConfig([...])` exports become one {@link GenerationRun} each.
 */
export interface GenerationRun {
  spec: Schema;
  config: Config;
}

/**
 * Theme sets that should each receive a dedicated generator pass.
 *
 * Skips the shared `base` primitive set and color-variant expansions of it
 * (`baseDimmed`, `base-high-contrast`, …). Those tokens are already merged
 * into each real theme.
 *
 * Returns an empty array when tokens are a single tree (or only one named
 * theme with nothing stripped), so callers run plugins once against the
 * original spec.
 */
export function themesForGeneration(tokens: Schema["tokens"]): TokenSet[] {
  const all = resolveTokenSets(tokens);
  const themes = all.filter(set => !isSharedThemeId(set.id));

  if (themes.length === 0) {
    return [];
  }

  if (themes.length === 1 && all.length === 1) {
    return [];
  }

  return themes;
}

function tokensForTheme(sets: TokenSet[], theme: TokenSet): Tokens {
  const base = sets.find(set => set.id === SHARED_THEME_ID);
  if (!base || isSharedThemeId(theme.id)) {
    return theme.tokens;
  }

  return mergeTokenTrees(theme.tokens, base.tokens);
}

function specForTheme(spec: Schema, theme: TokenSet, sets: TokenSet[]): Schema {
  return {
    ...spec,
    theme: theme.id,
    title: applyThemeToTitle(spec.title, theme.id) ?? spec.title,
    tokens: tokensForTheme(sets, theme)
  };
}

function configForTheme(config: Config, theme: TokenSet): Config {
  const title = applyThemeToTitle(config.title, theme.id);

  return title ? { ...config, title } : config;
}

async function runPluginGenerators(
  spec: Schema,
  config: Config
): Promise<Record<string, GeneratedDocument>> {
  let documents: Record<string, GeneratedDocument> = {};

  for (const plugin of config.plugins.filter(plugin => plugin.generate)) {
    const generated = await plugin.generate!(spec, config);
    documents = defu(generated, documents);
  }

  return documents;
}

/**
 * Run configured plugin `generate` hooks.
 *
 * When {@link Schema.tokens} is a multi-theme record, each theme is generated
 * separately: titles gain ` (<Theme>)`, and output file paths gain
 * `-<theme>` before the extension (`tokens.css` → `tokens-dark.css`).
 * Shared `base` files (and `base*` color-variant expansions) are omitted.
 */
export async function generatePluginDocuments(
  spec: Schema,
  config: Config
): Promise<Record<string, GeneratedDocument>> {
  const sets = resolveTokenSets(spec.tokens);
  const themes = themesForGeneration(spec.tokens);

  if (themes.length === 0) {
    return runPluginGenerators(spec, config);
  }

  let documents: Record<string, GeneratedDocument> = {};

  for (const theme of themes) {
    const generated = await runPluginGenerators(
      specForTheme(spec, theme, sets),
      configForTheme(config, theme)
    );
    documents = defu(applyThemeToDocuments(generated, theme.id), documents);
  }

  return documents;
}

/**
 * Run plugin generators for each {@link GenerationRun} as a separate pass.
 *
 * Document records are shallow-merged in array order. Later runs replace
 * earlier ones when output paths collide. Plugin `outputPath` values on each
 * config should already be distinct (for example `generated/dark` vs
 * `generated/light`).
 */
export async function generateAllPluginDocuments(
  runs: GenerationRun[]
): Promise<Record<string, GeneratedDocument>> {
  const documents: Record<string, GeneratedDocument> = {};

  for (const run of runs) {
    Object.assign(
      documents,
      await generatePluginDocuments(run.spec, run.config)
    );
  }

  return documents;
}
