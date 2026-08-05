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
import type { Schema } from "@razorwind/core/schema";
import type { ColorVariant, ColorVariantsPluginOptions } from "./types";
import { DEFAULT_COLOR_VARIANTS } from "./types";
import { expandColorVariants } from "./variants";

export {
  colorValueToHex,
  hexToColorValue,
  simulateCVD,
  transformHex
} from "./color";
export { DEFAULT_COLOR_VARIANTS, VARIANT_DESCRIPTIONS } from "./types";
export type { ColorVariant, ColorVariantsPluginOptions } from "./types";
export {
  appendVariantKey,
  applyColorVariantToTokens,
  expandColorVariants,
  isTokensRecord,
  variantToCamelCase,
  withVariantDescription
} from "./variants";

/**
 * Extract plugin that expands design-token color sets into alternate
 * accessibility / contrast variants (dimmed, high-contrast, CVD, …).
 *
 * @example
 * ```ts
 * import colorVariants from "@razorwind/color-variants";
 *
 * export default defineConfig({
 *   plugins: [
 *     colorVariants(),
 *     // or: colorVariants(["dimmed", "high-contrast", "protanopia"])
 *     // or: colorVariants({ variants: ["dimmed"] })
 *   ]
 * });
 * ```
 */
export default definePlugin(
  (
    options:
      ColorVariantsPluginOptions | ColorVariant[] = DEFAULT_COLOR_VARIANTS
  ) => {
    const variants: ColorVariant[] = Array.isArray(options)
      ? options
      : (options.variants ?? DEFAULT_COLOR_VARIANTS);

    return {
      name: "color-variants",
      extract: async (spec: Schema) => {
        if (!spec.tokens || Object.keys(spec.tokens).length === 0) {
          return spec;
        }

        return {
          ...spec,
          tokens: expandColorVariants(spec.tokens, variants)
        };
      }
    };
  }
);
