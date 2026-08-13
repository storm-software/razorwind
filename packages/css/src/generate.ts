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
import styleDictionary from "@razorwind/style-dictionary/generate";
import type { CssGeneratePluginOptions } from "./types";

export default definePlugin(
  (options?: CssGeneratePluginOptions) =>
    styleDictionary({
      platforms: {
        css: {
          transformGroup: "css",
          files: [
            {
              destination: options?.outputPath || "src/styles.css",
              format: "css/variables"
            }
          ]
        }
      }
    }),
  {
    name: "css:generate"
  }
);
