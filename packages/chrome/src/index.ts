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
  generateChromeTheme,
  normalizeThemes,
  renderInstallMd,
  renderManifestJson,
  toChromeRgb
} from "./generate";
import { themeDisplayName } from "./install";
import type {
  ChromeColorInput,
  ChromePluginOptions,
  ChromeRgb,
  ChromeTheme,
  ChromeThemeColorKey,
  ChromeThemeImageKey,
  ChromeTint,
  FlatToken,
  GenerateChromeTheme
} from "./types";

export {
  flattenTokens,
  formatTokenValue,
  generateChromeTheme,
  normalizeThemes,
  renderInstallMd,
  renderManifestJson,
  resolveTokenSets,
  themeDisplayName,
  toChromeRgb,
  toCssVar
};
export type {
  ChromeColorInput,
  ChromePluginOptions,
  ChromeRgb,
  ChromeTheme,
  ChromeThemeColorKey,
  ChromeThemeImageKey,
  ChromeTint,
  FlatToken,
  GenerateChromeTheme
};

/**
 * Razorwind plugin that turns design tokens into Google Chrome extension
 * theme manifests.
 *
 * Provide {@link ChromePluginOptions.mapTheme} to map extracted tokens to one
 * or more `manifest.json` documents. Load generated folders as unpacked
 * extensions at `chrome://extensions`.
 *
 * @see https://developer.chrome.com/docs/extensions/develop/ui/themes
 * @see https://github.com/dracula/google-chrome
 *
 * @example
 * ```ts
 * import { defineConfig } from "@razorwind/core";
 * import chrome, { flattenTokens, toChromeRgb } from "@razorwind/chrome";
 *
 * export default defineConfig({
 *   plugins: [
 *     chrome({
 *       mapTheme: tokens => {
 *         const flat = flattenTokens(tokens);
 *         const rgb = (path: string) =>
 *           toChromeRgb(
 *             flat.find(t => t.path === path)?.cssValue ?? "#000000"
 *           );
 *
 *         return {
 *           name: "My Chrome Theme",
 *           colors: {
 *             frame: rgb("color.bg"),
 *             toolbar: rgb("color.accent"),
 *             tab_text: rgb("color.fg"),
 *             ntp_background: rgb("color.bg")
 *           }
 *         };
 *       }
 *     })
 *   ]
 * });
 * ```
 */
export default definePlugin((options?: ChromePluginOptions) => ({
  name: "chrome",
  generate: async spec => {
    if (!options) {
      throw new Error("@razorwind/chrome requires options: { mapTheme }");
    }
    return generateChromeTheme(spec, options);
  }
}));
