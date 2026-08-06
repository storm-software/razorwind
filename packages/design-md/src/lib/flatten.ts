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

import type { TokenType } from "@power-plant/dtcg-schema";
import type { Tokens } from "@razorwind/core/schema";
import {
  flattenTokens as flattenTokensBase,
  resolveTokenSets,
  type TokenSet
} from "@razorwind/core/utils";
import type { FlatToken } from "../types";

export type { TokenSet };
export { resolveTokenSets };

/**
 * Flatten DTCG token trees into extraction rows.
 */
export function flattenTokens(
  tokens: Tokens | Record<string, Tokens>,
  includeTypes?: TokenType[]
): FlatToken[] {
  return flattenTokensBase(tokens, { includeTypes });
}
