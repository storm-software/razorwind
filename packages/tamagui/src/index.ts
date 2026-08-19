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
import { generateTamaguiConfig } from "./generate";
import type { TamaguiPluginOptions } from "./types";

export {
  flattenTokens,
  isPaletteGroup,
  resolveTokenCategory,
  resolveTokenSets,
  toCamelCaseKey,
  toTokenKey
} from "./flatten";
export {
  collectTamaguiFonts,
  fontVarName,
  tamaguiFontKeyFromRole,
  typographyFontKey,
  type TamaguiFontDef
} from "./fonts";
export { formatTokenValue, toCssVar, toTamaguiValue } from "./format";
export {
  collectColorScales,
  colorLightness,
  flipPaletteStep,
  generateTamaguiConfig,
  orderPaletteForScheme,
  renderInstallMd,
  renderTamaguiConfig
} from "./generate";
export type {
  FlatToken,
  TamaguiAnimationDriver,
  TamaguiPluginOptions,
  TamaguiTokenCategory
} from "./types";

/**
 * Razorwind plugin that turns design tokens into a Tamagui v5 config
 * (`createTamagui` + `createTokens` + `createV5Theme` + `createFont`).
 *
 * Light and dark token sets are emitted as a single config: `createV5Theme`
 * receives both `lightPalette` / `darkPalette` and `childrenThemes` with
 * `{ light, dark }` palettes. Groups marked `palette: true` become
 * `childrenThemes`; palettes named `base`, `grey`, `gray`, or `neutral` also
 * set `lightPalette` / `darkPalette` (`color1`–`color12`). Semantic `theme`
 * tags select `getTheme` aliases keyed by the generated theme `name`
 * (`dark` / `dark_base` → Primary, `dark_warning` → Warning) rather than
 * childrenThemes maps. Light palettes are ordered lightest-first; dark palettes
 * darkest-first.
 *
 * Typography tokens (`$type: "typography"`) each emit their own Tamagui
 * `createFont` entry with that token's size, line height, and weight. Font
 * keys keep the DTCG token name (`display-lg`). Names with a `_` suffix (or a
 * nested language segment) become FontLanguage variants (`body_cn`).
 *
 * @see https://tamagui.dev/docs/core/config-v5
 * @see https://tamagui.dev/docs/core/font-language#font-tokens
 *
 * @example
 * ```ts
 * import { defineConfig } from "@razorwind/core";
 * import tamagui from "@razorwind/tamagui";
 *
 * export default defineConfig({
 *   plugins: [tamagui()]
 * });
 * ```
 */
export default definePlugin((options?: TamaguiPluginOptions) => ({
  name: "tamagui",
  themeGeneration: "combined",
  generate: async spec => generateTamaguiConfig(spec, options ?? {})
}));
