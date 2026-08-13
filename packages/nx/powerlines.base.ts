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

import { plugin as tsdown } from "@powerlines/plugin-tsdown";
import { plugin as untyped } from "@powerlines/plugin-untyped";
import type { UserConfig } from "powerlines";
import { defineConfig } from "powerlines/config";

const config: UserConfig = defineConfig({
  skipCache: true,
  name: "nx-base",
  input: ["src/executors/*/executor.ts", "src/generators/*/generator.ts"],
  plugins: [untyped(), tsdown()],
  platform: "node",
  resolve: {
    skipNodeModulesBundle: true
  },
  tsdown: {
    minify: false,
    unbundle: false,
    exports: false,
    fixedExtension: false
  }
});

export default config;
