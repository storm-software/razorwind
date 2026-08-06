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
  generateCursorExtension,
  normalizeThemes,
  renderInstallMd,
  renderPackageJson,
  renderThemeJson
} from "./generate";
import type {
  CursorPluginOptions,
  CursorTheme,
  CursorTokenColor,
  FlatToken,
  GenerateCursorTheme
} from "./types";

export {
  flattenTokens,
  formatTokenValue,
  generateCursorExtension,
  normalizeThemes,
  renderInstallMd,
  renderPackageJson,
  renderThemeJson,
  resolveTokenSets,
  toCssVar
};
export type {
  CursorPluginOptions,
  CursorTheme,
  CursorTokenColor,
  FlatToken,
  GenerateCursorTheme
};

/**
 * Razorwind plugin that turns design tokens into a Cursor-installable theme
 * extension (theme JSON, package.json, VSIX packaging scripts, INSTALL.md).
 *
 * Provide {@link CursorPluginOptions.mapTheme} to map extracted tokens to one
 * or more VS Code–compatible theme documents. Install in Cursor via
 * **Extensions: Install from VSIX...** (same flow as Dracula Cursor).
 *
 * @see https://code.visualstudio.com/api/extension-guides/color-theme
 * @see https://draculatheme.com/cursor
 *
 * @example
 * ```ts
 * import { defineConfig } from "@razorwind/core";
 * import cursor, { flattenTokens } from "@razorwind/cursor";
 *
 * export default defineConfig({
 *   plugins: [
 *     cursor({
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
export default definePlugin((options?: CursorPluginOptions) => ({
  name: "cursor",
  generate: async spec => {
    if (!options) {
      throw new Error(
        "@razorwind/cursor requires options: { name, publisher, mapTheme }"
      );
    }
    return generateCursorExtension(spec, options);
  }
}));
