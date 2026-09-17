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
import { generateLlms } from "./generate";
import type { LlmsPluginOptions } from "./types";

export * from "./generate";
export type * from "./types";

/** Generate AI-ready llms.txt documentation from a Razorwind schema. */
export default definePlugin((options?: LlmsPluginOptions) => ({
  name: "llms:generate",
  generate: async spec => generateLlms(spec, options ?? {})
}));
