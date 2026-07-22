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

import type { Tokens } from "@power-plant/dtcg-schema";
import { existsSync } from "@stryke/fs/exists";
import { importModule } from "@stryke/fs/resolve";
import { isSetString } from "@stryke/type-checks/is-set-string";
import fg from "fast-glob";
import { basename } from "node:path";
import StyleDictionary from "style-dictionary";
import type { Config as StyleDictionaryConfig } from "style-dictionary/types";
import { WINDIE_PARSERS } from "./constants";
import {
  getRazorwindParserHooks,
  getRazorwindPreprocessorHooks,
  registerRazorwindParsers,
  WINDIE_INFER_PREPROCESSOR
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

let parsersRegistered = false;

function ensureParsersRegistered(): void {
  if (parsersRegistered) {
    return;
  }
  registerRazorwindParsers(StyleDictionary);
  parsersRegistered = true;
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
  config: StyleDictionaryConfig
): Promise<StyleDictionary> {
  ensureParsersRegistered();

  const sd = new StyleDictionary({
    ...config,
    parsers: [...WINDIE_PARSERS, ...(config.parsers ?? [])],
    preprocessors: [WINDIE_INFER_PREPROCESSOR, ...(config.preprocessors ?? [])],
    hooks: {
      ...config.hooks,
      parsers: {
        ...getRazorwindParserHooks(),
        ...config.hooks?.parsers
      },
      preprocessors: {
        ...getRazorwindPreprocessorHooks(),
        ...config.hooks?.preprocessors
      }
    },
    usesDtcg: config.usesDtcg ?? true,
    platforms: config.platforms ?? {}
  });

  await sd.hasInitialized;
  return sd;
}

async function loadFromSources(source: string[]): Promise<Tokens> {
  if (source.length === 0) {
    return {};
  }

  const sd = await createDictionary({ source });

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
  sourceGlobs: string[]
): Promise<Record<string, Tokens> | Tokens> {
  const files = await listSourceFiles(sourceGlobs);
  if (files.length === 0) {
    return {};
  }

  const themed = new Map<string, string[]>();
  const unthemed: string[] = [];

  for (const file of files) {
    const theme = themeKeyFromPath(file);
    if (theme) {
      const list = themed.get(theme) ?? [];
      list.push(file);
      themed.set(theme, list);
    } else {
      unthemed.push(file);
    }
  }

  // Need at least two distinct themes to return a record.
  if (themed.size < 2) {
    return loadFromSources(sourceGlobs);
  }

  const result: Record<string, Tokens> = {};

  if (unthemed.length > 0) {
    const base = await loadFromSources(unthemed);
    if (!isEmptyTokens(base)) {
      result.base = base;
    }
  }

  for (const [theme, themeFiles] of themed) {
    result[theme] = await loadFromSources(themeFiles);
  }

  return result;
}

/**
 * Load design tokens via Style Dictionary parser hooks.
 *
 * Resolution order:
 * 1. Explicit `tokensPath` (file, directory, or SD config)
 * 2. Common default paths (`tokens.json`, `tokens/`, …)
 * 3. Fallback paths (e.g. registry Tailwind CSS)
 */
export async function loadTokens(
  options: LoadTokensOptions
): Promise<LoadedTokens> {
  const { splitThemes = true, ...resolveOptions } = options;
  const resolved = resolveTokensSource(resolveOptions);

  if (
    resolved.resolvedPath &&
    existsSync(resolved.resolvedPath) &&
    /(?:^|[/\\])(?:style-dictionary|sd)\.config\./i.test(
      basename(resolved.resolvedPath)
    )
  ) {
    const config = await loadStyleDictionaryConfig(resolved.resolvedPath);
    const sd = await createDictionary(config);

    return sd.tokens;
  }

  if (resolved.source.length === 0) {
    return {};
  }

  if (splitThemes) {
    return loadSplitByTheme(resolved.source);
  }

  return loadFromSources(resolved.source);
}

/**
 * Convenience: load tokens or throw when nothing usable is found.
 */
export async function loadTokensOrThrow(
  options: LoadTokensOptions
): Promise<LoadedTokens> {
  const tokens = await loadTokens(options);

  if (isEmptyTokens(tokens)) {
    const hint = isSetString(options.tokensPath)
      ? `tokensPath="${options.tokensPath}"`
      : "default token paths / CSS fallbacks";
    throw new Error(
      `No design tokens found via ${hint}. Provide tokensPath or add a tokens file.`
    );
  }

  return tokens;
}
