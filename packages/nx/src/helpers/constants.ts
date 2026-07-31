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

import { SUPPORTED_EXTENSIONS } from "c12";

export const GENERATOR_NAME = "@razorwind/nx:sync";
export const GENERATE_EXECUTOR = "@razorwind/nx:generate";

const CONFIG_NAME = "razorwind";

/**
 * Config file base paths resolved by c12 in priority order.
 *
 * @see https://github.com/unjs/c12
 */
const CONFIG_FILE_BASES = [
  `${CONFIG_NAME}.config`,
  `.config/${CONFIG_NAME}`,
  `.config/${CONFIG_NAME}.config`
] as const;

/**
 * All Razorwind config file names supported by c12.
 *
 * @see https://github.com/unjs/c12/blob/main/src/loader.ts
 */
export const CONFIG_FILE_NAMES = SUPPORTED_EXTENSIONS.flatMap(extension =>
  CONFIG_FILE_BASES.map(base => `${base}${extension}`)
) as readonly string[];
