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
  generateShikiTheme,
  normalizeThemes,
  renderThemeJson
} from "./generate";
import type {
  FlatToken,
  GenerateShikiTheme,
  ShikiPluginOptions,
  ShikiTheme,
  ShikiThemeSetting
} from "./types";

export {
  flattenTokens,
  formatTokenValue,
  generateShikiTheme,
  normalizeThemes,
  renderThemeJson,
  resolveTokenSets,
  toCssVar
};
export type {
  FlatToken,
  GenerateShikiTheme,
  ShikiPluginOptions,
  ShikiTheme,
  ShikiThemeSetting
};

/**
 * Razorwind plugin that turns design tokens into Shiki / TextMate theme
 * JSON files.
 *
 * Provide {@link ShikiPluginOptions.mapTheme} to map extracted tokens to one
 * or more Shiki theme documents. Generated files load via
 * `createHighlighter({ themes })` or `highlighter.loadTheme(...)`.
 *
 * @see https://shiki.style/guide/load-theme
 * @see https://shiki.style/guide/theme-colors
 *
 * @example
 * ```ts
 * import { defineConfig } from "@razorwind/core";
 * import shiki, { flattenTokens } from "@razorwind/shiki";
 *
 * export default defineConfig({
 *   plugins: [
 *     shiki({
 *       mapTheme: tokens => {
 *         const flat = flattenTokens(tokens);
 *         const color = (path: string) =>
 *           flat.find(t => t.path === path)?.cssValue ?? "#000000";
 *
 *         return {
 *           name: "my-theme",
 *           type: "dark",
 *           bg: color("color.bg"),
 *           fg: color("color.fg"),
 *           settings: [
 *             {
 *               scope: ["comment"],
 *               settings: { foreground: color("color.muted") }
 *             },
 *             {
 *               scope: ["string"],
 *               settings: { foreground: color("color.accent") }
 *             }
 *           ]
 *         };
 *       }
 *     })
 *   ]
 * });
 * ```
 */
export default definePlugin((options?: ShikiPluginOptions) => ({
  name: "shiki",
  generate: async spec => {
    if (!options) {
      throw new Error("@razorwind/shiki requires options: { mapTheme }");
    }
    return generateShikiTheme(spec, options);
  }
}));
