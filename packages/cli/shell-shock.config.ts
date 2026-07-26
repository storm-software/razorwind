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

import type { UserConfig } from "@shell-shock/core";
import { defineConfig } from "@shell-shock/core/config";
import preset from "@shell-shock/preset-cli";

const config: UserConfig = defineConfig({
  skipCache: true,
  name: "razorwind",
  input: "src/commands",
  output: {
    storage: "fs"
  },
  logLevel: {
    general: "debug",
    config: "trace"
  },
  docs: "https://docs.stormsoftware.com/projects/razorwind/reference/cli/{command}",
  plugins: [
    preset({
      theme: {
        icons: {
          banner: "⬤"
        },
        labels: {
          banner: {
            header: "Razorwind CLI",
            footer: "https://stormsoftware.com"
          }
        },
        spinner: "dotsCircle"
      }
    })
  ]
});

export default config;
