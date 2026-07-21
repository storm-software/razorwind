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

import JSON5 from "json5";
import { parse as parseToml } from "smol-toml";
import StyleDictionary from "style-dictionary";
import type {
  DesignTokens,
  Hooks,
  Parser,
  PreprocessedTokens
} from "style-dictionary/types";
import { parse as parseYaml } from "yaml";
import { WINDIE_PARSERS } from "./constants";
import { parseCssCustomProperties } from "./css";
import { normalizeTokenTree } from "./infer";

/** Preprocessor name applied after all sources merge. */
export const WINDIE_INFER_PREPROCESSOR = "windie-infer";

function asDesignTokens(data: unknown): DesignTokens {
  if (data === null || data === undefined) {
    return {};
  }

  if (typeof data !== "object" || Array.isArray(data)) {
    throw new TypeError("Token file must parse to a plain object.");
  }

  return normalizeTokenTree(data) as DesignTokens;
}

function parseJsonContents(contents: string): DesignTokens {
  try {
    return asDesignTokens(JSON5.parse(contents));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse JSON token file: ${message}`);
  }
}

function parseYamlContents(contents: string): DesignTokens {
  try {
    return asDesignTokens(parseYaml(contents));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse YAML token file: ${message}`);
  }
}

function parseTomlContents(contents: string): DesignTokens {
  try {
    return asDesignTokens(parseToml(contents));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse TOML token file: ${message}`);
  }
}

/**
 * Windie Style Dictionary parsers — JSON/JSON5/JSONC, YAML, TOML, CSS.
 *
 * @see https://styledictionary.com/reference/hooks/parsers/
 */
export const windieParsers: Parser[] = [
  {
    name: "windie-json",
    pattern: /\.json[c5]?$/i,
    parser: ({ contents }) => parseJsonContents(contents)
  },
  {
    name: "windie-yaml",
    pattern: /\.ya?ml$/i,
    parser: ({ contents }) => parseYamlContents(contents)
  },
  {
    name: "windie-toml",
    pattern: /\.toml$/i,
    parser: ({ contents }) => parseTomlContents(contents)
  },
  {
    name: "windie-css",
    pattern: /\.css$/i,
    parser: ({ contents }) =>
      normalizeTokenTree(parseCssCustomProperties(contents)) as DesignTokens
  }
];

/** Inline `hooks.parsers` map for Style Dictionary config. */
export function getWindieParserHooks(): NonNullable<Hooks["parsers"]> {
  return Object.fromEntries(
    windieParsers.map(({ name, pattern, parser }) => [
      name,
      { pattern, parser }
    ])
  );
}

/**
 * Infer DTCG `$type` / normalize legacy keys after sources merge.
 * Covers JS/TS modules that bypass custom file parsers.
 */
export function windieInferPreprocessor(
  dictionary: PreprocessedTokens
): PreprocessedTokens {
  return normalizeTokenTree(dictionary) as PreprocessedTokens;
}

/** Inline `hooks.preprocessors` map for Style Dictionary config. */
export function getWindiePreprocessorHooks(): NonNullable<
  Hooks["preprocessors"]
> {
  return {
    [WINDIE_INFER_PREPROCESSOR]: windieInferPreprocessor
  };
}

/**
 * Register Windie parsers + infer preprocessor on Style Dictionary.
 *
 * @see https://styledictionary.com/reference/hooks/parsers/
 */
export function registerWindieParsers(
  target: {
    registerParser: (parser: Parser) => unknown;
    registerPreprocessor: (preprocessor: {
      name: string;
      preprocessor: typeof windieInferPreprocessor;
    }) => unknown;
  } = StyleDictionary
): void {
  for (const parser of windieParsers) {
    target.registerParser(parser);
  }
  target.registerPreprocessor({
    name: WINDIE_INFER_PREPROCESSOR,
    preprocessor: windieInferPreprocessor
  });
}

export { WINDIE_PARSERS };
