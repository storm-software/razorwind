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
  generateThunderbirdTheme,
  normalizeThemes,
  renderInstallMd,
  renderManifestJson,
  toThunderbirdRgb,
  toThunderbirdRgbString
} from "./generate";
import { themeDisplayName } from "./install";
import type {
  FlatToken,
  GenerateThunderbirdTheme,
  ThunderbirdColorInput,
  ThunderbirdGeckoApplication,
  ThunderbirdPluginOptions,
  ThunderbirdRgb,
  ThunderbirdTheme,
  ThunderbirdThemeColorKey
} from "./types";

export {
  flattenTokens,
  formatTokenValue,
  generateThunderbirdTheme,
  normalizeThemes,
  renderInstallMd,
  renderManifestJson,
  resolveTokenSets,
  themeDisplayName,
  toCssVar,
  toThunderbirdRgb,
  toThunderbirdRgbString
};
export type {
  FlatToken,
  GenerateThunderbirdTheme,
  ThunderbirdColorInput,
  ThunderbirdGeckoApplication,
  ThunderbirdPluginOptions,
  ThunderbirdRgb,
  ThunderbirdTheme,
  ThunderbirdThemeColorKey
};

/**
 * Razorwind plugin that turns design tokens into Mozilla Thunderbird extension
 * theme manifests.
 *
 * Provide {@link ThunderbirdPluginOptions.mapTheme} to map extracted tokens to one
 * or more `manifest.json` documents. Install generated folders via Thunderbird's
 * Add-ons manager.
 *
 * @see https://draculatheme.com/thunderbird
 * @see https://github.com/dracula/thunderbird
 *
 * @example
 * ```ts
 * import { defineConfig } from "@razorwind/core";
 * import thunderbird, {
 *   flattenTokens,
 *   toThunderbirdRgbString
 * } from "@razorwind/thunderbird";
 *
 * export default defineConfig({
 *   plugins: [
 *     thunderbird({
 *       mapTheme: tokens => {
 *         const flat = flattenTokens(tokens);
 *         const color = (path: string) =>
 *           toThunderbirdRgbString(
 *             flat.find(t => t.path === path)?.cssValue ?? "#282a36"
 *           );
 *
 *         return {
 *           name: "My Thunderbird Theme",
 *           gecko: { id: "my-theme@example.com" },
 *           colors: {
 *             frame: color("color.bg"),
 *             toolbar: color("color.accent"),
 *             tab_text: color("color.fg"),
 *             sidebar: color("color.bg"),
 *             toolbar_field: color("color.bg")
 *           }
 *         };
 *       }
 *     })
 *   ]
 * });
 * ```
 */
export default definePlugin((options?: ThunderbirdPluginOptions) => ({
  name: "thunderbird",
  generate: async spec => {
    if (!options) {
      throw new Error("@razorwind/thunderbird requires options: { mapTheme }");
    }
    return generateThunderbirdTheme(spec, options);
  }
}));
