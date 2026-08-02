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

import type { Plugin } from "./types/plugin";

export type * from "./types/plugin";

/**
 * Type helper for Razorwind plugins (`parsers` / `preprocessors` + `extract` / `validate` / `generate`).
 *
 * Platform generation (`platforms`, transforms, formats, …) belongs on
 * `@razorwind/style-dictionary` plugin options — not on this interface.
 *
 * @see https://styledictionary.com/reference/api/
 *
 * @example
 * ```ts
 * import { definePlugin } from "@razorwind/core";
 *
 * // As a plugin
 * export default definePlugin({
 *   name: "my-plugin",
 *   parsers: [{ pattern: /\.foo$/, parser: contents => JSON.parse(contents) }],
 *   extract: async (spec) => {
 *     ...
 *   },
 *   validate: async () => {
 *     ...
 *   },
 *   generate: async () => {
 *     ...
 *   }
 * });
 *
 * // As a plugin factory
 * export default definePlugin((options) => ({
 *   name: "my-plugin",
 *   extract: async (spec) => {
 *     ...
 *   },
 *   validate: async () => {
 *     ...
 *   },
 *   generate: async () => {
 *     ...
 *   }
 * }));
 * ```
 */
export function definePlugin<TOptions>(
  factory: (options?: TOptions) => Plugin
): (options?: TOptions) => Plugin;
export function definePlugin(plugin: Plugin): Plugin;
export function definePlugin<TOptions>(
  pluginOrFactory: Plugin | ((options?: TOptions) => Plugin)
): Plugin | ((options?: TOptions) => Plugin) {
  return pluginOrFactory;
}
