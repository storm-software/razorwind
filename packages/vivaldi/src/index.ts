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
  generateVivaldiTheme,
  normalizeThemes,
  renderInstallMd,
  renderSettingsJson,
  toVivaldiColor
} from "./generate";
import { themeDisplayName } from "./install";
import type {
  FlatToken,
  GenerateVivaldiTheme,
  VivaldiBackgroundPosition,
  VivaldiPluginOptions,
  VivaldiTheme
} from "./types";

export {
  flattenTokens,
  formatTokenValue,
  generateVivaldiTheme,
  normalizeThemes,
  renderInstallMd,
  renderSettingsJson,
  resolveTokenSets,
  themeDisplayName,
  toCssVar,
  toVivaldiColor
};
export type {
  FlatToken,
  GenerateVivaldiTheme,
  VivaldiBackgroundPosition,
  VivaldiPluginOptions,
  VivaldiTheme
};

/**
 * Razorwind plugin that turns design tokens into Vivaldi browser theme folders.
 *
 * Provide {@link VivaldiPluginOptions.mapTheme} to map extracted tokens to one
 * or more `settings.json` documents. Zip each generated folder and import via
 * **Settings → Themes → Open Theme…**.
 *
 * @see https://draculatheme.com/vivaldi
 * @see https://help.vivaldi.com/desktop/appearance-customization/shareable-vivaldi-themes/
 *
 * @example
 * ```ts
 * import { defineConfig } from "@razorwind/core";
 * import vivaldi, { flattenTokens } from "@razorwind/vivaldi";
 *
 * export default defineConfig({
 *   plugins: [
 *     vivaldi({
 *       mapTheme: tokens => {
 *         const flat = flattenTokens(tokens);
 *         const color = (path: string) =>
 *           flat.find(t => t.path === path)?.cssValue ?? "#000000";
 *
 *         return {
 *           name: "My Theme",
 *           colorBg: color("color.bg"),
 *           colorFg: color("color.fg"),
 *           colorAccentBg: color("color.accent"),
 *           colorHighlightBg: color("color.highlight"),
 *           colorWindowBg: color("color.window"),
 *           backgroundImage: "background.png"
 *         };
 *       }
 *     })
 *   ]
 * });
 * ```
 */
export default definePlugin((options?: VivaldiPluginOptions) => ({
  name: "vivaldi",
  generate: async spec => {
    if (!options) {
      throw new Error("@razorwind/vivaldi requires options: { mapTheme }");
    }
    return generateVivaldiTheme(spec, options);
  }
}));
