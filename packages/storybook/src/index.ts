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
import { generateTokenDocs } from "./generate";
import type { StorybookPluginOptions } from "./types";

export { flattenTokens, resolveTokenSets } from "./flatten";
export { formatTokenValue, toCssVar } from "./format";
export { generateTokenDocs } from "./generate";
export type { FlatToken, StorybookPluginOptions } from "./types";

/**
 * Razorwind plugin that turns design tokens into Storybook MDX doc blocks
 * (`ColorPalette`, `Typeset`, `TokenTable`).
 *
 * @see https://storybook.js.org/docs/writing-docs/doc-blocks
 * @see https://github.com/unpunnyfuns/swatchbook/tree/main/packages/addon
 *
 * @example
 * ```ts
 * import { defineConfig } from "@razorwind/core";
 * import storybook from "@razorwind/storybook";
 *
 * export default defineConfig({
 *   plugins: [storybook]
 * });
 * ```
 */
export default definePlugin((options?: StorybookPluginOptions) => ({
  name: "storybook",
  generate: async spec => generateTokenDocs(spec, options ?? {})
}));
