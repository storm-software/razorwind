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

export {
  DEFAULT_TOKEN_PATH_CANDIDATES,
  THEME_BASENAME_PATTERN,
  TOKEN_DIRECTORY_GLOB,
  TOKEN_FILE_EXTENSIONS,
  TYPE_PATH_HINTS,
  WINDIE_PARSERS,
  type RazorwindParserName
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
  type LoadTokensOptions,
  type LoadedTokens
} from "./load";
export {
  WINDIE_INFER_PREPROCESSOR,
  getRazorwindParserHooks,
  getRazorwindPreprocessorHooks,
  razorwindInferPreprocessor,
  razorwindParsers,
  registerRazorwindParsers
} from "./parsers";
export {
  resolveTokensSource,
  themeKeyFromPath,
  type ResolveTokensPathOptions,
  type ResolvedTokensSource
} from "./resolve-path";
export {
  detectTailwindWorkspace,
  extractTailwindTokens,
  resolveTailwindCssEntry,
  type ExtractTailwindTokensOptions,
  type TailwindWorkspaceInfo
} from "./tailwind";
