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

export interface TokensParser {
  name?: string;
  pattern: RegExp;
  parser: (contents: string) => DesignTokens;
}

export type TokensPreprocessor =
  | {
      name?: string;
      preprocessor: (dictionary: PreprocessedTokens) => PreprocessedTokens;
    }
  | ((dictionary: PreprocessedTokens) => PreprocessedTokens);

export interface Plugin {
  name: string;
  parsers?: TokensParser[];
  preprocessors?: TokensPreprocessor[];
  extract?: (spec: Schema, config: Config) => MaybePromise<Schema>;
  generate?: (
    spec: Schema,
    config: Config
  ) => MaybePromise<Record<string, GeneratedDocument>>;
  validate?: (spec: Schema, config: Config) => MaybePromise<void>;
}
