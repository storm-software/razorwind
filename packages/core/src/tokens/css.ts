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

import { nestFlatTokens } from "./infer";

const CUSTOM_PROPERTY_RE =
  /(--[A-Za-z_][\w-]*)\s*:\s*([^;}{]+?)(?=\s*(?:;|}|$))/g;

/**
 * Extract CSS custom properties from stylesheet text into a nested token tree.
 * Handles `:root`, `[data-theme]`, and Tailwind v4 `@theme` blocks alike.
 */
export function parseCssCustomProperties(contents: string): Record<string, unknown> {
  const flat: Record<string, unknown> = {};

  // Strip comments so property regex does not match inside them.
  const withoutComments = contents.replace(/\/\*[\s\S]*?\*\//g, "");

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
