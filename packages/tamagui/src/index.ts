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
  generateTamaguiConfig,
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
 * Razorwind plugin that turns design tokens into a Tamagui config
 * (`createTamagui` + `createTokens` + `createThemes` + `createFont`).
 *
 * Light and dark token sets are emitted as a single config.
 * `createTokens({ color })` is palettes / primitives only. Semantic theme /
 * `$theme` colors (including computed state siblings such as hover / pressed /
 * disabled) go to `createThemes` extras — never to `tokens.color.*`. Tagged
 * semantics become nested Tamagui themes via `createThemes` from
 * `@tamagui/theme-builder` (`light_primary`, `dark_danger`, …), with the theme
 * name stripped from the token key (`backgroundPrimarySubtle` + `theme: "primary"`
 * → `backgroundSubtle`; `backgroundDangerHover` → `backgroundHover` on `danger`;
 * `ringPrimarySubtle` → `ringSubtle` on `primary`). Untagged semantic colors
 * (overlay, link, …) land on `base.extra`. Primitive palettes feed
 * `base.palette` / `accent.palette`.
 *
 * Typography tokens (`$type: "typography"`) each emit their own Tamagui
 * `createFont` entry with that token's size, line height, and weight. Font
 * keys keep the DTCG token name (`display-lg`). Names with a `_` suffix (or a
 * nested language segment) become FontLanguage variants (`body_cn`).
 *
 * @see https://tamagui.dev/docs/core/configuration
 * @see https://tamagui.dev/docs/intro/themes
 * @see https://tamagui.dev/docs/guides/theme-builder
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
