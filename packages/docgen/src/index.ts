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
import { generateDocs } from "./generate";

export { flattenTokens, resolveTokenSets } from "./flatten";
export { escapeTableCell, formatTokenValue, toCssVar, toSlug } from "./format";
export {
  COMPONENT_TYPES,
  extractRegistryItems,
  generateDocs,
  groupTokens,
  REGISTRY_ITEM_TYPES,
  renderGroupMdx,
  renderIndexMdx,
  renderRegistryItemsMdx,
  renderTokenTable,
  type ComponentDocType,
  type RegistryItemPage,
  type RegistryItemType
} from "./generate";
export type { FlatToken, Options } from "./types";

/**
 * Razorwind plugin that turns the design system specification (tokens +
 * optional components) into MDX documentation pages.
 *
 * @example
 * ```ts
 * import { defineConfig } from "@razorwind/core";
 * import docs from "@razorwind/docs-generator";
 *
 * export default defineConfig({
 *   plugins: [docs]
 * });
 * ```
 */
export default definePlugin({
  name: "razorwind-docs",
  extract: async spec => spec,
  validate: async () => undefined,
  generate: async (spec, config) => {
    return generateDocs(spec, config);
  }
});
