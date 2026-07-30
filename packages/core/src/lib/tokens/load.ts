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
import type { Tokens } from "@power-plant/dtcg-schema";
import { existsSync } from "@stryke/fs/exists";
import { importModule } from "@stryke/fs/resolve";
import { isSetString } from "@stryke/type-checks/is-set-string";
import fg from "fast-glob";
import { basename } from "node:path";
import StyleDictionary from "style-dictionary";
import type { Config as StyleDictionaryConfig } from "style-dictionary/types";
import type { Schema } from "../../schema";
import type { Config } from "../../types/config";
import { TOKEN_PARSER_NAMES } from "./constants";
import {
  getRazorwindParserHooks,
  getRazorwindPreprocessorHooks,
  RAZORWIND_INFER_PREPROCESSOR,
  registerRazorwindHooks
} from "./parsers";
import type { ResolveTokensPathOptions } from "./resolve-path";
import { resolveTokensSource, themeKeyFromPath } from "./resolve-path";

export interface LoadTokensOptions extends ResolveTokensPathOptions {
  /**
   * When true, split theme-named files into a record keyed by theme.
   *
   * @defaultValue true
   */
  splitThemes?: boolean;
}

export type LoadedTokens = Tokens | Record<string, Tokens>;

function ensureHooksRegistered(config: Config): void {
  registerRazorwindHooks(config.plugins, StyleDictionary);
}

function isEmptyTokens(tokens: unknown): boolean {
  if (!tokens || typeof tokens !== "object") {
    return true;
  }
  return Object.keys(tokens).length === 0;
}

async function loadStyleDictionaryConfig(
  configPath: string
): Promise<StyleDictionaryConfig> {
  const loaded = await importModule<
    StyleDictionaryConfig | { default: StyleDictionaryConfig }
  >(configPath);

  if (
    loaded &&
    typeof loaded === "object" &&
    "default" in loaded &&
    loaded.default
  ) {
    return loaded.default;
  }

  return loaded as StyleDictionaryConfig;
}

async function createDictionary(
  config: Config,
  styleDictionaryConfig: StyleDictionaryConfig
): Promise<StyleDictionary> {
  ensureHooksRegistered(config);

  const sd = new StyleDictionary({
    ...styleDictionaryConfig,
    parsers: [...TOKEN_PARSER_NAMES, ...(styleDictionaryConfig.parsers ?? [])],
    preprocessors: [
      RAZORWIND_INFER_PREPROCESSOR,
      ...(styleDictionaryConfig.preprocessors ?? [])
    ],
    hooks: {
      ...styleDictionaryConfig.hooks,
      parsers: {
        ...getRazorwindParserHooks(),
        ...styleDictionaryConfig.hooks?.parsers
      },
      preprocessors: {
        ...getRazorwindPreprocessorHooks(),
        ...styleDictionaryConfig.hooks?.preprocessors
      }
    },
    usesDtcg: styleDictionaryConfig.usesDtcg ?? true,
    platforms: styleDictionaryConfig.platforms ?? {}
  });

  await sd.hasInitialized;
  return sd;
}

async function loadFromSources(
  config: Config,
  source: string[]
): Promise<Tokens> {
  if (source.length === 0) {
    return {};
  }

  const sd = await createDictionary(config, { source });

  return sd.tokens;
}

async function listSourceFiles(sourceGlobs: string[]): Promise<string[]> {
  const files = await fg(sourceGlobs, {
    absolute: true,
    onlyFiles: true,
    unique: true
  });

  return files.sort();
}

async function loadSplitByTheme(
  config: Config,
  sourceGlobs: string[]
): Promise<Record<string, Tokens> | Tokens> {
  const files = await listSourceFiles(sourceGlobs);
  if (files.length === 0) {
    return {};
  }

  const themed = new Map<string, string[]>();
  const unThemed: string[] = [];

  for (const file of files) {
    const theme = themeKeyFromPath(file);
    if (theme) {
      const list = themed.get(theme) ?? [];
      list.push(file);
      themed.set(theme, list);
    } else {
      unThemed.push(file);
    }
  }

  // Need at least two distinct themes to return a record.
  if (themed.size < 2) {
    return loadFromSources(config, sourceGlobs);
  }

  const result: Record<string, Tokens> = {};

  if (unThemed.length > 0) {
    const base = await loadFromSources(config, unThemed);
    if (!isEmptyTokens(base)) {
      result.base = base;
    }
  }

  for (const [theme, themeFiles] of themed) {
    result[theme] = await loadFromSources(config, themeFiles);
  }

  return result;
}

/**
 * Load design tokens via Style Dictionary parser hooks.
 *
 * Resolution order:
 * 1. Explicit `tokensPath` (file, directory, array of those, or SD config)
 * 2. Common default paths (`tokens.json`, `tokens/`, …)
 * 3. Fallback paths (e.g. registry Tailwind CSS)
 */
export async function loadTokens(
  context: ExecutionContext<Schema, Config, void>
): Promise<LoadedTokens> {
  const resolved = resolveTokensSource(context.options);

  if (
    resolved.resolvedPath &&
    existsSync(resolved.resolvedPath) &&
    /(?:^|[/\\])(?:style-dictionary|sd)\.config\./i.test(
      basename(resolved.resolvedPath)
    )
  ) {
    context.sd = await createDictionary(
      context.options,
      await loadStyleDictionaryConfig(resolved.resolvedPath)
    );

    return context.sd.tokens;
  }

  if (resolved.source.length === 0) {
    return {};
  }

  if (context.options.splitThemes) {
    return loadSplitByTheme(context.options, resolved.source);
  }

  return loadFromSources(context.options, resolved.source);
}

/**
 * Convenience: load tokens or throw when nothing usable is found.
 *
 * @param config - The configuration object.
 * @param options - The options for loading the tokens.
 * @returns The loaded tokens.
 * @throws An error if no design tokens are found.
 * @throws An error if the tokens are not valid.
 */
export async function loadTokensOrThrow(
  context: ExecutionContext<Schema, Config, void>
): Promise<LoadedTokens> {
  const tokens = await loadTokens(context);

  if (isEmptyTokens(tokens)) {
    const { tokensPath } = context.options;
    const hint = Array.isArray(tokensPath)
      ? tokensPath.length > 0
        ? `tokensPath=[${tokensPath.map(path => `"${path}"`).join(", ")}]`
        : "default token paths / CSS fallbacks"
      : isSetString(tokensPath)
        ? `tokensPath="${tokensPath}"`
        : "default token paths / CSS fallbacks";
    throw new Error(
      `No design tokens found via ${hint}. Provide tokensPath or add a tokens file.`
    );
  }

  return tokens;
}
