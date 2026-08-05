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
  generateVsceExtension,
  normalizeThemes,
  renderPackageJson,
  renderThemeJson
} from "./generate";
import type {
  FlatToken,
  GenerateVsCodeTheme,
  VscePluginOptions,
  VsCodeTheme,
  VsCodeTokenColor
} from "./types";

export {
  flattenTokens,
  formatTokenValue,
  generateVsceExtension,
  normalizeThemes,
  renderPackageJson,
  renderThemeJson,
  resolveTokenSets,
  toCssVar
};
export type {
  FlatToken,
  GenerateVsCodeTheme,
  VscePluginOptions,
  VsCodeTheme,
  VsCodeTokenColor
};

/**
 * Razorwind plugin that turns design tokens into a publishable VS Code
 * theme extension package (theme JSON, package.json, scripts, README).
 *
 * Provide {@link VscePluginOptions.mapTheme} to map extracted tokens to one
 * or more VS Code theme documents. Packaging / publish helpers follow the
 * pierre theme script layout.
 *
 * @see https://code.visualstudio.com/api/extension-guides/color-theme
 * @see https://github.com/pierrecomputer/pierre/tree/main/packages/theme/scripts
 *
 * @example
 * ```ts
 * import { defineConfig } from "@razorwind/core";
 * import vsce, { flattenTokens } from "@razorwind/vsce";
 *
 * export default defineConfig({
 *   plugins: [
 *     vsce({
 *       name: "my-theme",
 *       publisher: "acme",
 *       displayName: "My Theme",
 *       mapTheme: tokens => {
 *         const flat = flattenTokens(tokens);
 *         const color = (path: string) =>
 *           flat.find(t => t.path === path)?.cssValue ?? "#000000";
 *
 *         return [
 *           {
 *             name: "my-theme-dark",
 *             displayName: "My Theme Dark",
 *             type: "dark",
 *             colors: {
 *               "editor.background": color("color.bg"),
 *               "editor.foreground": color("color.fg")
 *             }
 *           },
 *           {
 *             name: "my-theme-light",
 *             displayName: "My Theme Light",
 *             type: "light",
 *             colors: {
 *               "editor.background": color("color.bg"),
 *               "editor.foreground": color("color.fg")
 *             }
 *           }
 *         ];
 *       }
 *     })
 *   ]
 * });
 * ```
 */
export default definePlugin((options?: VscePluginOptions) => ({
  name: "vsce",
  generate: async spec => {
    if (!options) {
      throw new Error(
        "@razorwind/vsce requires options: { name, publisher, mapTheme }"
      );
    }
    return generateVsceExtension(spec, options);
  }
}));
