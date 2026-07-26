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
 * Type helper for Razorwind plugins (`extract` / `validate` / `generate`).
 *
 * @example
 * ```ts
 * import { definePlugin } from "@razorwind/core";
 *
 * // As a plugin
 * export default definePlugin({
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
export function definePlugin(
  factory: (options: any) => Plugin
): (options: any) => Plugin;
export function definePlugin(plugin: Plugin): Plugin;
export function definePlugin<T extends Plugin | ((options: any) => Plugin)>(
  pluginOrFactory: T
): T {
  return pluginOrFactory;
}
