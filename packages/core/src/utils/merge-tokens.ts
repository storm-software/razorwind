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

import { isObject as isObjectFn } from "@stryke/type-checks/is-object";
import type { Tokens } from "../schema";
import { isTokenLeaf } from "./flatten-tokens";

function isObject(value: unknown): value is Record<string, unknown> {
  return isObjectFn(value);
}

/**
 * Deep-merge token **groups**, replacing token leaves atomically.
 *
 * Unlike `defu`, this does not concatenate arrays inside `$value` (color
 * `components`, cubicBezier lists, shadow layers). Theme `override` wins
 * for leaves and `$`-prefixed group metadata.
 */
export function mergeTokenTrees(override: Tokens, base: Tokens): Tokens {
  return mergeNode(override, base) as Tokens;
}

function mergeNode(override: unknown, base: unknown): unknown {
  if (!isObject(base)) {
    return override;
  }
  if (!isObject(override)) {
    return override ?? base;
  }
  if (isTokenLeaf(base) || isTokenLeaf(override)) {
    return override;
  }

  const result: Record<string, unknown> = { ...base };

  for (const [key, value] of Object.entries(override)) {
    if (key.startsWith("$")) {
      result[key] = value;
      continue;
    }

    result[key] = key in result ? mergeNode(value, result[key]) : value;
  }

  return result;
}
