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

import { nestFlatTokens } from "./infer";

const CUSTOM_PROPERTY_RE =
  // eslint-disable-next-line regexp/no-super-linear-backtracking
  /(--[A-Z_][\w-]*)\s*:\s*([^;}{]+?)(?=\s*(?:;|\}|$))/gi;

/**
 * Extract CSS custom properties from stylesheet text into a nested token tree.
 * Handles `:root`, `[data-theme]`, and Tailwind v4 `@theme` blocks alike.
 */
export function parseCssCustomProperties(
  contents: string
): Record<string, unknown> {
  const flat: Record<string, unknown> = {};

  // Strip comments so property regex does not match inside them.
  const withoutComments = contents
    .split("\t")
    .join("    ")
    .replace(/\s*\{\s*/g, " {\n    ")
    .replace(/;\s*/g, ";\n    ")
    .replace(/,\s*/g, ", ")
    .replace(/ *\}\s*/g, "}\n")
    .replace(/\}\s*(.+)/g, "}\n$1")
    .replace(/\n {4}([^:]+):\s*/g, "\n    $1: ")
    .replace(/([a-z0-9-)])\}/gi, "$1;\n}")
    .replace(/\/\*[\s\S]*?\*\//g, "");

  for (const match of withoutComments.matchAll(CUSTOM_PROPERTY_RE)) {
    const name = match[1];
    const value = match[2]?.trim();
    if (!name || !value) {
      continue;
    }
    flat[name] = value;
  }

  return nestFlatTokens(flat);
}
