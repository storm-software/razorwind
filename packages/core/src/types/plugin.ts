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
import type { MaybePromise } from "@stryke/types/base";
import type { PreprocessedTokens } from "style-dictionary";
import type {
  Action,
  DesignTokens,
  FileHeader,
  Filter,
  Format,
  Transform
} from "style-dictionary/types";
import type { Schema } from "../schema/schema";
import type { Config } from "./config";

/**
 * Style Dictionary parser hook contributed by a plugin.
 *
 * @see https://styledictionary.com/reference/hooks/parsers/
 */
export interface TokensParser {
  name?: string;
  pattern: RegExp;
  parser: (contents: string) => DesignTokens;
}

/**
 * Style Dictionary preprocessor hook contributed by a plugin.
 *
 * @see https://styledictionary.com/reference/hooks/preprocessors/
 */
export type TokensPreprocessor =
  | {
      name?: string;
      preprocessor: (dictionary: PreprocessedTokens) => PreprocessedTokens;
    }
  | ((dictionary: PreprocessedTokens) => PreprocessedTokens);

/**
 * Style Dictionary transform hook contributed by a plugin.
 *
 * @see https://styledictionary.com/reference/hooks/transforms/
 */
export type TokensTransform = Omit<Transform, "name"> & { name?: string };

/**
 * Style Dictionary transform group hook contributed by a plugin.
 *
 * @see https://styledictionary.com/reference/hooks/transform-groups/
 */
export interface TokensTransformGroup {
  name?: string;
  transforms: string[];
}

/**
 * Style Dictionary format hook contributed by a plugin.
 *
 * @see https://styledictionary.com/reference/hooks/formats/
 */
export type TokensFormat = Omit<Format, "name"> & { name?: string };

/**
 * Style Dictionary filter hook contributed by a plugin.
 *
 * @see https://styledictionary.com/reference/hooks/filters/
 */
export type TokensFilter =
  (Omit<Filter, "name"> & { name?: string }) | Filter["filter"];

/**
 * Style Dictionary file header hook contributed by a plugin.
 *
 * @see https://styledictionary.com/reference/hooks/file-headers/
 */
export type TokensFileHeader =
  | {
      name?: string;
      fileHeader: FileHeader;
    }
  | FileHeader;

/**
 * Style Dictionary action hook contributed by a plugin.
 *
 * @see https://styledictionary.com/reference/hooks/actions/
 */
export type TokensAction = Omit<Action, "name"> & { name?: string };

/**
 * Razorwind plugin: Style Dictionary hooks plus extract / generate / validate.
 *
 * @see https://styledictionary.com/reference/api/
 */
export interface Plugin {
  /**
   * The name of the plugin.
   *
   * @remarks
   * The name of the plugin is used to identify the plugin in the configuration and to generate the plugin's documentation.
   */
  name: string;

  /**
   * Custom file parsers registered with Style Dictionary to load token sources.
   *
   * @see https://styledictionary.com/reference/hooks/parsers/
   */
  parsers?: TokensParser[];

  /**
   * Preprocessors that run on the merged token dictionary before transforms.
   *
   * @see https://styledictionary.com/reference/hooks/preprocessors/
   */
  preprocessors?: TokensPreprocessor[];

  /**
   * Transforms that modify token names, attributes, or values per platform.
   *
   * @see https://styledictionary.com/reference/hooks/transforms/
   */
  transforms?: TokensTransform[];

  /**
   * Named groups of transforms applied together in platform configuration.
   *
   * @see https://styledictionary.com/reference/hooks/transform-groups/
   */
  transformGroups?: TokensTransformGroup[];

  /**
   * Output formats that turn the transformed dictionary into file contents.
   *
   * @see https://styledictionary.com/reference/hooks/formats/
   */
  formats?: TokensFormat[];

  /**
   * Filters that decide which tokens are included in a platform or format.
   *
   * @see https://styledictionary.com/reference/hooks/filters/
   */
  filters?: TokensFilter[];

  /**
   * File header generators that add build metadata comments to output files.
   *
   * @see https://styledictionary.com/reference/hooks/file-headers/
   */
  fileHeaders?: TokensFileHeader[];

  /**
   * Post-build actions such as copying assets or running follow-up scripts.
   *
   * @see https://styledictionary.com/reference/hooks/actions/
   */
  actions?: TokensAction[];

  /**
   * Extract the design tokens from the source files.
   *
   * @param spec - The schema of the design tokens.
   * @param config - The configuration of the project.
   * @returns The schema of the design tokens.
   */
  extract?: (spec: Schema, config: Config) => MaybePromise<Schema>;

  /**
   * Generate the design system code from the design tokens.
   *
   * @param spec - The schema of the design tokens.
   * @param config - The configuration of the project.
   * @returns The generated code.
   */
  generate?: (
    spec: Schema,
    config: Config
  ) => MaybePromise<Record<string, GeneratedDocument>>;

  /**
   * Validate the design tokens.
   *
   * @param spec - The schema of the design tokens.
   * @param config - The configuration of the project.
   * @throws An error if the design tokens are invalid.
   */
  validate?: (spec: Schema, config: Config) => MaybePromise<void>;
}
