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
import {
  generateMapLibreStyle,
  normalizeStyles,
  renderStyleJson
} from "./generate";
import { renderInstallMd } from "./install";
import type {
  GenerateMapLibreStyle,
  MapLibrePluginOptions,
  MapLibreStyle
} from "./types";

export {
  flattenTokens,
  formatTokenValue,
  resolveTokenSets,
  toCssVar
} from "@razorwind/core/utils";
export {
  generateMapLibreStyle,
  normalizeStyles,
  renderInstallMd,
  renderStyleJson
};
export type { GenerateMapLibreStyle, MapLibrePluginOptions, MapLibreStyle };

/** Razorwind plugin that emits complete MapLibre style JSON from design tokens. */
export default definePlugin((options?: MapLibrePluginOptions) => ({
  name: "maplibre",
  generate: async spec => {
    if (!options) {
      throw new Error("@razorwind/maplibre requires options: { mapTheme }");
    }
    return generateMapLibreStyle(spec, options);
  }
}));
