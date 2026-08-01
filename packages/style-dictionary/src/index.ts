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
import { generateStyleDictionary } from "./generate";
import type { StyleDictionaryPluginOptions } from "./types";

export { generateStyleDictionary } from "./generate";
export type { PlatformConfig, StyleDictionaryPluginOptions } from "./types";

/**
 * Razorwind plugin that uses Style Dictionary to generate platform code from
 * design tokens.
 *
 * Pass {@link StyleDictionaryPluginOptions.platforms} to configure build
 * targets (transform groups, formats, build paths, files).
 *
 * @see https://styledictionary.com/reference/config/#platform
 *
 * @example
 * ```ts
 * import { defineConfig } from "@razorwind/core";
 * import styleDictionary from "@razorwind/style-dictionary";
 *
 * export default defineConfig({
 *   plugins: [
 *     styleDictionary({
 *       platforms: {
 *         css: {
 *           transformGroup: "css",
 *           buildPath: "build/css/",
 *           files: [
 *             {
 *               destination: "variables.css",
 *               format: "css/variables"
 *             }
 *           ]
 *         }
 *       }
 *     })
 *   ]
 * });
 * ```
 */
export default definePlugin((options?: StyleDictionaryPluginOptions) => ({
  name: "style-dictionary",
  generate: async (spec, config) =>
    generateStyleDictionary(spec, options ?? {}, config.cwd)
}));
