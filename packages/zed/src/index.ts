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
  generateZedExtension,
  normalizeThemes,
  renderExtensionToml,
  renderInstallMd,
  renderThemeJson
} from "./generate";
import type {
  FlatToken,
  GenerateZedTheme,
  ZedPlayerColors,
  ZedPluginOptions,
  ZedSyntaxStyle,
  ZedTheme,
  ZedThemeVariant
} from "./types";

export {
  flattenTokens,
  formatTokenValue,
  generateZedExtension,
  normalizeThemes,
  renderExtensionToml,
  renderInstallMd,
  renderThemeJson,
  resolveTokenSets,
  toCssVar
};
export type {
  FlatToken,
  GenerateZedTheme,
  ZedPlayerColors,
  ZedPluginOptions,
  ZedSyntaxStyle,
  ZedTheme,
  ZedThemeVariant
};

/**
 * Razorwind plugin that turns design tokens into a Zed-installable theme
 * extension (`extension.toml`, theme collection JSON, INSTALL.md).
 *
 * Provide {@link ZedPluginOptions.mapTheme} to map extracted tokens to one or
 * more Zed theme collection documents. Install in Zed via the extensions store
 * or by copying theme JSON to `~/.config/zed/themes` (same flow as
 * [Dracula for Zed](https://draculatheme.com/zed)).
 *
 * @see https://zed.dev/schema/themes/v0.2.0.json
 * @see https://draculatheme.com/zed
 *
 * @example
 * ```ts
 * import { defineConfig } from "@razorwind/core";
 * import zed, { flattenTokens } from "@razorwind/zed";
 *
 * export default defineConfig({
 *   plugins: [
 *     zed({
 *       id: "my-theme",
 *       name: "My Theme",
 *       authors: ["Acme <themes@acme.com>"],
 *       mapTheme: tokens => {
 *         const flat = flattenTokens(tokens);
 *         const color = (path: string) =>
 *           flat.find(t => t.path === path)?.cssValue ?? "#000000";
 *
 *         return {
 *           name: "My Theme",
 *           themes: [
 *             {
 *               name: "My Theme Dark",
 *               appearance: "dark",
 *               style: {
 *                 "editor.background": color("color.bg"),
 *                 "editor.foreground": color("color.fg"),
 *                 syntax: {
 *                   comment: { color: color("color.muted") }
 *                 }
 *               }
 *             }
 *           ]
 *         };
 *       }
 *     })
 *   ]
 * });
 * ```
 */
export default definePlugin((options?: ZedPluginOptions) => ({
  name: "zed",
  generate: async spec => {
    if (!options) {
      throw new Error("@razorwind/zed requires options: { id, mapTheme }");
    }
    return generateZedExtension(spec, options);
  }
}));
