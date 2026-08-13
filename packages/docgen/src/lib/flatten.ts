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

import type { Tokens } from "@razorwind/core/schema";
import type { TokenSet } from "@razorwind/core/utils";
import {
  flattenTokens as flattenTokensBase,
  resolveTokenSets,
  toCssVar
} from "@razorwind/core/utils";
import type { DocgenGeneratePluginOptions, FlatToken } from "../types";

export { resolveTokenSets };
export type { TokenSet };

/**
 * Flatten DTCG token trees into documentation rows.
 */
export function flattenTokens(
  tokens: Tokens | Record<string, Tokens>,
  options: Pick<
    DocgenGeneratePluginOptions,
    "cssVarPrefix" | "includeTypes"
  > = {}
): FlatToken[] {
  const cssVarPrefix = options.cssVarPrefix ?? "rw";

  return flattenTokensBase<FlatToken>(tokens, {
    includeTypes: options.includeTypes,
    enrichToken: base => ({
      ...base,
      cssVar: toCssVar(base.path, cssVarPrefix)
    })
  });
}
