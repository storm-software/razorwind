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

export {
  DEFAULT_TOKEN_PATH_CANDIDATES,
  THEME_BASENAME_PATTERN,
  TOKEN_DIRECTORY_GLOB,
  TOKEN_FILE_EXTENSIONS,
  TYPE_PATH_HINTS,
  WINDIE_PARSERS,
  type WindieParserName
} from "./constants";
export { parseCssCustomProperties } from "./css";
export {
  inferTypeFromPath,
  inferValue,
  nestFlatTokens,
  normalizeTokenTree,
  type InferredTokenType
} from "./infer";
export {
  loadTokens,
  loadTokensOrThrow,
  type LoadedTokens,
  type LoadTokensOptions
} from "./load";
export {
  getWindieParserHooks,
  getWindiePreprocessorHooks,
  registerWindieParsers,
  WINDIE_INFER_PREPROCESSOR,
  windieInferPreprocessor,
  windieParsers
} from "./parsers";
export {
  resolveTokensSource,
  themeKeyFromPath,
  type ResolvedTokensSource,
  type ResolveTokensPathOptions
} from "./resolve-path";
