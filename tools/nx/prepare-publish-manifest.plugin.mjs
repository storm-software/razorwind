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

import { createNodesFromFiles, readJsonFile } from "@nx/devkit";
import { dirname, join } from "node:path";

export const createNodesV2 = [
  "packages/*/package.json",
  async (configFiles, options, context) =>
    createNodesFromFiles(
      configFile => {
        const packageJson = readJsonFile(
          join(context.workspaceRoot, configFile)
        );
        if (packageJson.private === true) {
          return {};
        }

        const root = dirname(configFile);

        return {
          projects: {
            [root]: {
              targets: {
                "prepare-publish-manifest": {
                  cache: false,
                  inputs: [
                    "{projectRoot}/package.json",
                    "{projectRoot}/dist",
                    "{projectRoot}/*.md",
                    "{workspaceRoot}/LICENSE",
                    "{workspaceRoot}/pnpm-workspace.yaml"
                  ],
                  outputs: ["{workspaceRoot}/dist/{projectRoot}"],
                  dependsOn: ["build"],
                  executor: "nx:run-commands",
                  options: {
                    command:
                      "pnpm exec zx tools/scripts/src/prepare-publish-manifest.mjs --projectRoot={projectRoot}"
                  }
                }
              }
            }
          }
        };
      },
      configFiles,
      options,
      context
    )
];
