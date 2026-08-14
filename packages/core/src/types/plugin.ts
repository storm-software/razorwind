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
import type { DesignTokens } from "style-dictionary/types";
import type { Schema } from "../schema/schema";
import type { Config } from "./config";

/**
 * Style Dictionary parser hook contributed by a plugin.
 *
 * Used during token extraction to load token sources.
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
 * Used during token extraction to normalize the merged token dictionary.
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
 * Razorwind plugin: extraction hooks plus extract / generate / validate.
 *
 * Platform generation hooks (`transforms`, `formats`, `platforms`, …) live on
 * `@razorwind/style-dictionary` — not on the core plugin interface.
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
   * Extract the design tokens from the source files.
   *
   * @param spec - The schema of the design tokens.
   * @param config - The configuration of the project.
   * @returns The schema of the design tokens.
   */
  extract?: (spec: Schema, config: Config) => MaybePromise<Schema>;

  /**
   * How this plugin's {@link generate} hook is invoked for multi-theme token
   * records.
   *
   * - `"split"` (default) — once per theme, with output paths suffixed
   *   (`tamagui.config.ts` → `tamagui-light.config.ts`).
   * - `"combined"` — once against the full token record. Use for targets that
   *   encode light and dark in a single artifact (Tamagui `createV5Theme`).
   *
   * @defaultValue `"split"`
   */
  themeGeneration?: "split" | "combined";

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
