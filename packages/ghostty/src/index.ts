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

import { definePlugin } from "@razorwind/core/plugin";
import { flattenTokens, resolveTokenSets } from "./flatten";
import { formatTokenValue, toCssVar } from "./format";
import {
  generateGhosttyTheme,
  normalizeThemes,
  renderGhosttyTheme,
  renderInstallMd,
  toGhosttyColor
} from "./generate";
import type {
  FlatToken,
  GenerateGhosttyTheme,
  GhosttyPalette,
  GhosttyPaletteIndex,
  GhosttyPluginOptions,
  GhosttyTheme
} from "./types";

export {
  flattenTokens,
  formatTokenValue,
  generateGhosttyTheme,
  normalizeThemes,
  renderGhosttyTheme,
  renderInstallMd,
  resolveTokenSets,
  toCssVar,
  toGhosttyColor
};
export type {
  FlatToken,
  GenerateGhosttyTheme,
  GhosttyPalette,
  GhosttyPaletteIndex,
  GhosttyPluginOptions,
  GhosttyTheme
};

/**
 * Razorwind plugin that turns design tokens into Ghostty terminal theme files.
 *
 * Provide {@link GhosttyPluginOptions.mapTheme} to map extracted tokens to one
 * or more theme documents. Generated output includes `INSTALL.md` with Ghostty
 * activation steps.
 *
 * @see https://draculatheme.com/ghostty
 * @see https://ghostty.org/docs/features/theme
 *
 * @example
 * ```ts
 * import { defineConfig } from "@razorwind/core";
 * import ghostty, { flattenTokens } from "@razorwind/ghostty";
 *
 * export default defineConfig({
 *   plugins: [
 *     ghostty({
 *       mapTheme: tokens => {
 *         const flat = flattenTokens(tokens);
 *         const color = (path: string) =>
 *           flat.find(t => t.path === path)?.cssValue ?? "#282a36";
 *
 *         return {
 *           name: "my-theme",
 *           background: color("color.bg"),
 *           foreground: color("color.fg"),
 *           cursorColor: color("color.fg"),
 *           cursorText: color("color.bg"),
 *           selectionBackground: color("color.selection"),
 *           selectionForeground: color("color.fg"),
 *           palette: {
 *             0: color("color.ansi.black"),
 *             1: color("color.ansi.red"),
 *             2: color("color.ansi.green")
 *           }
 *         };
 *       }
 *     })
 *   ]
 * });
 * ```
 */
export default definePlugin((options?: GhosttyPluginOptions) => ({
  name: "ghostty",
  generate: async spec => {
    if (!options) {
      throw new Error("@razorwind/ghostty requires options: { mapTheme }");
    }
    return generateGhosttyTheme(spec, options);
  }
}));
