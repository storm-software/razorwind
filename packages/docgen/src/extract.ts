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
import type { DocgenExtractPluginOptions } from "./types";

/**
 * Razorwind plugin that passes through the design-system specification during
 * extract. Documentation pages are produced by the generate plugin.
 *
 * @example
 * ```ts
 * import { defineConfig } from "@razorwind/core";
 * import docgen from "@razorwind/docgen/extract";
 *
 * export default defineConfig({
 *   plugins: [docgen()]
 * });
 * ```
 */
export default definePlugin((_options: DocgenExtractPluginOptions = {}) => ({
  name: "docgen:extract",
  extract: async spec => spec
}));
