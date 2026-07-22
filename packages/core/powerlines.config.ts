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

import tsdown from "@powerlines/plugin-tsdown";
import { defineConfig } from "powerlines/config";

export default defineConfig({
  input: ["src/*.ts"],
  platform: "node",
  output: {
    format: ["cjs", "esm"]
  },
  resolve: {
    skipNodeModulesBundle: true
  },
  plugins: [tsdown()]
});
