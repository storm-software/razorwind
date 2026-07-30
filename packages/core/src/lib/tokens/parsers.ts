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

import { isFunction } from "@stryke/type-checks/is-function";
import JSON5 from "json5";
import { parse as parseToml } from "smol-toml";
import StyleDictionary from "style-dictionary";
import type {
  Action,
  DesignTokens,
  FileHeader,
  Filter,
  Format,
  Hooks,
  Parser,
  PreprocessedTokens,
  Transform
} from "style-dictionary/types";
import { parse as parseYaml } from "yaml";
import type { Plugin } from "../../types/plugin";
import { TOKEN_PARSER_NAMES } from "./constants";
import { parseCssCustomProperties } from "./css";
import { normalizeTokenTree } from "./infer";

/** Preprocessor name applied after all sources merge. */
export const RAZORWIND_INFER_PREPROCESSOR = "razorwind-infer";

/** Target capable of registering Style Dictionary hooks (class or instance). */
export interface StyleDictionaryRegisterTarget {
  registerParser: (parser: Parser) => unknown;
  registerPreprocessor: (preprocessor: {
    name: string;
    preprocessor: typeof razorwindInferPreprocessor;
  }) => unknown;
  registerTransform: (transform: Transform) => unknown;
  registerTransformGroup: (transformGroup: {
    name: string;
    transforms: string[];
  }) => unknown;
  registerFormat: (format: Format) => unknown;
  registerFilter: (filter: Filter) => unknown;
  registerFileHeader: (fileHeader: {
    name: string;
    fileHeader: FileHeader;
  }) => unknown;
  registerAction: (action: Action) => unknown;
}

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
 * Razorwind Style Dictionary parsers — JSON/JSON5/JSONC, YAML, TOML, CSS.
 *
 * @see https://styledictionary.com/reference/hooks/parsers/
 */
export const TOKEN_PARSERS: Parser[] = [
  {
    name: "razorwind-json",
    pattern: /\.json[c5]?$/i,
    parser: ({ contents }) => parseJsonContents(contents)
  },
  {
    name: "razorwind-yaml",
    pattern: /\.ya?ml$/i,
    parser: ({ contents }) => parseYamlContents(contents)
  },
  {
    name: "razorwind-toml",
    pattern: /\.toml$/i,
    parser: ({ contents }) => parseTomlContents(contents)
  },
  {
    name: "razorwind-css",
    pattern: /\.css$/i,
    parser: ({ contents }) =>
      normalizeTokenTree(parseCssCustomProperties(contents)) as DesignTokens
  }
];

/** Inline `hooks.parsers` map for Style Dictionary config. */
export function getRazorwindParserHooks(): NonNullable<Hooks["parsers"]> {
  return Object.fromEntries(
    TOKEN_PARSERS.map(({ name, pattern, parser }) => [
      name,
      { pattern, parser }
    ])
  );
}

/**
 * Infer DTCG `$type` / normalize legacy keys after sources merge.
 * Covers JS/TS modules that bypass custom file parsers.
 */
export function razorwindInferPreprocessor(
  dictionary: PreprocessedTokens
): PreprocessedTokens {
  return normalizeTokenTree(dictionary) as PreprocessedTokens;
}

/** Inline `hooks.preprocessors` map for Style Dictionary config. */
export function getRazorwindPreprocessorHooks(): NonNullable<
  Hooks["preprocessors"]
> {
  return {
    [RAZORWIND_INFER_PREPROCESSOR]: razorwindInferPreprocessor
  };
}

/**
 * Register Razorwind parsers + infer preprocessor on Style Dictionary,
 * then register any Style Dictionary hooks contributed by plugins.
 *
 * @see https://styledictionary.com/reference/api/
 */
export function registerRazorwindHooks(
  plugins: Plugin[] = [],
  target: StyleDictionaryRegisterTarget = StyleDictionary
) {
  for (const parser of TOKEN_PARSERS) {
    target.registerParser(parser);
  }
  target.registerPreprocessor({
    name: RAZORWIND_INFER_PREPROCESSOR,
    preprocessor: razorwindInferPreprocessor
  });

  let parserIndex = 0;
  let preprocessorIndex = 0;
  let transformIndex = 0;
  let transformGroupIndex = 0;
  let formatIndex = 0;
  let filterIndex = 0;
  let fileHeaderIndex = 0;
  let actionIndex = 0;

  for (const plugin of plugins) {
    for (const parser of plugin.parsers ?? []) {
      target.registerParser({
        name: parser.name ?? `${plugin.name}-parser-${parserIndex}`,
        pattern: parser.pattern,
        parser: ({ contents }) => parser.parser(contents)
      });
      parserIndex++;
    }

    for (const preprocessor of plugin.preprocessors ?? []) {
      target.registerPreprocessor(
        isFunction(preprocessor)
          ? {
              name: `${plugin.name}-preprocessor-${preprocessorIndex}`,
              preprocessor
            }
          : {
              name:
                preprocessor.name ??
                `${plugin.name}-preprocessor-${preprocessorIndex}`,
              preprocessor: preprocessor.preprocessor
            }
      );
      preprocessorIndex++;
    }

    for (const transform of plugin.transforms ?? []) {
      target.registerTransform({
        ...transform,
        name: transform.name ?? `${plugin.name}-transform-${transformIndex}`
      } as Transform);
      transformIndex++;
    }

    for (const transformGroup of plugin.transformGroups ?? []) {
      target.registerTransformGroup({
        name:
          transformGroup.name ??
          `${plugin.name}-transform-group-${transformGroupIndex}`,
        transforms: transformGroup.transforms
      });
      transformGroupIndex++;
    }

    for (const format of plugin.formats ?? []) {
      target.registerFormat({
        ...format,
        name: format.name ?? `${plugin.name}-format-${formatIndex}`
      });
      formatIndex++;
    }

    for (const filter of plugin.filters ?? []) {
      target.registerFilter(
        isFunction(filter)
          ? {
              name: `${plugin.name}-filter-${filterIndex}`,
              filter
            }
          : {
              name: filter.name ?? `${plugin.name}-filter-${filterIndex}`,
              filter: filter.filter
            }
      );
      filterIndex++;
    }

    for (const fileHeader of plugin.fileHeaders ?? []) {
      target.registerFileHeader(
        isFunction(fileHeader)
          ? {
              name: `${plugin.name}-file-header-${fileHeaderIndex}`,
              fileHeader
            }
          : {
              name:
                fileHeader.name ??
                `${plugin.name}-file-header-${fileHeaderIndex}`,
              fileHeader: fileHeader.fileHeader
            }
      );
      fileHeaderIndex++;
    }

    for (const action of plugin.actions ?? []) {
      target.registerAction({
        ...action,
        name: action.name ?? `${plugin.name}-action-${actionIndex}`
      });
      actionIndex++;
    }
  }
}

/**
 * @deprecated Use {@link registerRazorwindHooks} instead.
 */
export const registerRazorwindParsers = registerRazorwindHooks;

export { TOKEN_PARSER_NAMES };
