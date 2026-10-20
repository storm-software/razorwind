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

import type { StyleSpecification } from "@maplibre/maplibre-gl-style-spec";
import type { Tokens } from "@razorwind/core/schema";

/** A complete MapLibre style with a name used for its generated filename. */
export type MapLibreStyle = StyleSpecification & { name: string };

/** Map extracted design tokens into one or more complete MapLibre styles. */
export type GenerateMapLibreStyle = (
  tokens: Tokens | Record<string, Tokens>
) => MapLibreStyle | MapLibreStyle[] | Record<string, StyleSpecification>;

export interface MapLibrePluginOptions {
  /** Output directory relative to the generation root. Defaults to `maplibre-styles`. */
  outputPath?: string;
  /** Required mapping from extracted tokens to complete MapLibre style JSON. */
  mapTheme: GenerateMapLibreStyle;
  /** Override the generated setup instructions. */
  installGuide?: string;
}
