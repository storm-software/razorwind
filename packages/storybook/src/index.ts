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
export {
  applyBrandDefaults,
  generateTokenDocs,
  normalizeThemes,
  renderInstallMd,
  renderThemeFile
} from "./generate";
export type {
  FlatToken,
  GenerateStorybookTheme,
  StorybookPluginOptions,
  StorybookTheme,
  StorybookThemePartial,
  StorybookThemeResult
} from "./types";

/**
 * Razorwind plugin that turns design tokens into Storybook MDX doc blocks
 * (`ColorPalette`, `Typeset`, `TokenTable`, `IconGallery`) and optional UI themes.
 *
 * Light and dark token sets are emitted as a single `theme.ts`: one theme is
 * `export default create({…})`; multiple themes are a record keyed by name
 * (`{ light: create({…}), dark: create({…}) }`).
 *
 * @see https://storybook.js.org/docs/writing-docs/doc-blocks
 * @see https://storybook.js.org/docs/configure/user-interface/theming
 * @see https://github.com/unpunnyfuns/swatchbook/tree/main/packages/addon
 *
 * @example
 * ```ts
 * import { defineConfig } from "@razorwind/core";
 * import storybook from "@razorwind/storybook";
 *
 * export default defineConfig({
 *   plugins: [
 *     storybook({
 *       mapTheme: tokens => ({
 *         base: "light",
 *         colorPrimary: tokens.find(t => t.path === "color.primary")?.cssValue,
 *         brandTitle: "My Design System"
 *       })
 *     })
 *   ]
 * });
 * ```
 */
export default definePlugin((options?: StorybookPluginOptions) => ({
  name: "storybook",
  themeGeneration: "combined",
  generate: async spec => generateTokenDocs(spec, options ?? {})
}));
