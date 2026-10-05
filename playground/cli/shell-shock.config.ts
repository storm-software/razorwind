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

import razorwind from "@razorwind/shell-shock/plugin";
import type { UserConfig } from "@shell-shock/core";
import { defineConfig } from "@shell-shock/core/config";
import preset from "@shell-shock/preset-cli";

/**
 * A Shell Shock CLI for the Razorwind playground design system.
 *
 * The `@razorwind/shell-shock` plugin loads the design system from the
 * sibling `tokens` playground's `razorwind.config.ts`, themes the CLI from
 * its color tokens, adds the design-system commands and exposes them as MCP
 * tools through the generated `mcp` command.
 */
const config: UserConfig = defineConfig({
  skipCache: true,
  name: "razorwind-playground",
  input: "src/commands",
  output: {
    storage: "fs"
  },
  plugins: [
    preset({
      theme: {
        icons: {
          banner: "⬤"
        },
        labels: {
          banner: {
            header: "Razorwind Playground",
            footer: "https://stormsoftware.com"
          }
        }
      }
    }),
    razorwind({
      root: "../tokens",
      guidelines: "./guidelines",
      // Keep help, update and completions commands out of the MCP tool list.
      mcp: { excludeTags: ["Utility"] }
    })
  ]
});

export default config;
