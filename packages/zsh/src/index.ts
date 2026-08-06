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
  generateZshTheme,
  normalizeThemes,
  renderInstallMd,
  renderZshTheme,
  toZshFg
} from "./generate";
import type {
  FlatToken,
  GenerateZshTheme,
  ZshPluginOptions,
  ZshTheme,
  ZshThemeColors
} from "./types";

export {
  flattenTokens,
  formatTokenValue,
  generateZshTheme,
  normalizeThemes,
  renderInstallMd,
  renderZshTheme,
  resolveTokenSets,
  toCssVar,
  toZshFg
};
export type {
  FlatToken,
  GenerateZshTheme,
  ZshPluginOptions,
  ZshTheme,
  ZshThemeColors
};

/**
 * Razorwind plugin that turns design tokens into Oh My Zsh `*.zsh-theme`
 * files (Dracula-style prompt segments).
 *
 * Provide {@link ZshPluginOptions.mapTheme} to map extracted tokens to one
 * or more theme documents. Generated output includes `INSTALL.md` with
 * Oh My Zsh activation steps.
 *
 * @see https://draculatheme.com/zsh
 *
 * @example
 * ```ts
 * import { defineConfig } from "@razorwind/core";
 * import zsh, { flattenTokens } from "@razorwind/zsh";
 *
 * export default defineConfig({
 *   plugins: [
 *     zsh({
 *       mapTheme: tokens => {
 *         const flat = flattenTokens(tokens);
 *         const color = (path: string) =>
 *           flat.find(t => t.path === path)?.cssValue ?? "#50fa7b";
 *
 *         return {
 *           name: "my-theme",
 *           colors: {
 *             success: color("color.success"),
 *             error: color("color.error"),
 *             directory: color("color.primary"),
 *             git: color("color.accent"),
 *             context: color("color.secondary")
 *           }
 *         };
 *       }
 *     })
 *   ]
 * });
 * ```
 */
export default definePlugin((options?: ZshPluginOptions) => ({
  name: "zsh",
  generate: async spec => {
    if (!options) {
      throw new Error("@razorwind/zsh requires options: { mapTheme }");
    }
    return generateZshTheme(spec, options);
  }
}));
