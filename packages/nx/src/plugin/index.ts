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

/* eslint-disable no-console */

import type { CreateNodes, CreateNodesResultArray } from "@nx/devkit";
import { createNodesFromFiles } from "@nx/devkit";
import {
  getProjectConfigFromProjectRoot,
  getProjectRoot,
  getRoot
} from "@storm-software/workspace-tools/utils/plugin-helpers";
import { setDefaultProjectTags } from "@storm-software/workspace-tools/utils/project-tags";
import { getEnvPaths } from "@stryke/env/get-env-paths";
import { existsSync } from "@stryke/fs/exists";
import { joinPaths } from "@stryke/path/join-paths";
import { isError } from "@stryke/type-checks/is-error";
import { isSetString } from "@stryke/type-checks/is-set-string";
import type { PackageJson } from "@stryke/types/package-json";
import defu from "defu";
import { readFile } from "node:fs/promises";
import { readNxJson } from "nx/src/config/nx-json.js";
import type { ProjectConfiguration } from "nx/src/config/workspace-json-project-json.js";
import type { PackageJson as PackageJsonNx } from "nx/src/utils/package-json.js";
import { readTargetsFromPackageJson } from "nx/src/utils/package-json.js";
import {
  detectPackageManager,
  getPackageManagerCommand
} from "nx/src/utils/package-manager.js";
import { GENERATE_EXECUTOR } from "../helpers/constants";

export interface NxPluginOptions {
  /**
   * The name of the target to use.
   *
   * @defaultValue `"generate"`
   */
  targetName?: string;

  /**
   * The path to a directory containing component directories or files, or an array of paths.
   */
  componentsPath?: string | string[];

  /**
   * The path to the tokens.json file, or an array of paths.
   */
  tokensPath?: string | string[];

  /**
   * Whether to output verbose logs.
   *
   * @defaultValue `false`
   */
  verboseOutput?: boolean;
}

export const createNodesV2: CreateNodes<NxPluginOptions> = [
  "**/razorwind.config.ts",
  async (configFiles, options, contextV2): Promise<CreateNodesResultArray> => {
    if (options?.verboseOutput) {
      console.debug(
        `[razorwind] - ${new Date().toISOString()} - Initializing the Razorwind plugin for the following inputs: ${configFiles.join(", ")}`
      );
    }

    const envPaths = getEnvPaths({
      orgId: "storm-software",
      appId: "razorwind",
      workspaceRoot: contextV2.workspaceRoot
    });
    if (!envPaths.cache) {
      throw new Error("The cache directory could not be determined.");
    }

    const nxJson = readNxJson(contextV2.workspaceRoot);
    const packageManagerCommand = getPackageManagerCommand(
      detectPackageManager(contextV2.workspaceRoot),
      contextV2.workspaceRoot
    );

    return createNodesFromFiles(
      async (configFile, _, context) => {
        try {
          const projectRoot = getProjectRoot(
            configFile,
            contextV2.workspaceRoot
          );
          if (!projectRoot) {
            console.error(
              `[razorwind] - ${new Date().toISOString()} - package.json and ${
                configFile
              }`
            );

            return {};
          }

          const root = getRoot(projectRoot, context);

          if (options?.verboseOutput) {
            console.debug(
              `[razorwind] - ${new Date().toISOString()} - Loading ${
                projectRoot
              }.`
            );
          }

          if (
            !existsSync(
              joinPaths(contextV2.workspaceRoot, projectRoot, "package.json")
            )
          ) {
            if (options?.verboseOutput) {
              console.warn(
                `[razorwind] - ${new Date().toISOString()} - Cannot find \`package.json\` file in the project's root directory (path: "${joinPaths(
                  contextV2.workspaceRoot,
                  projectRoot
                )}"). Skipping project configuration.`
              );
            }

            return {};
          }

          const packageJsonContent = await readFile(
            joinPaths(contextV2.workspaceRoot, projectRoot, "package.json"),
            "utf8"
          );
          if (!packageJsonContent) {
            if (options?.verboseOutput) {
              console.warn(
                `[razorwind] - ${new Date().toISOString()} - No package.json file found for project in root directory ${projectRoot}`
              );
            }

            return {};
          }

          const packageJson: PackageJson = JSON.parse(packageJsonContent);
          const projectConfig = getProjectConfigFromProjectRoot(
            projectRoot,
            packageJson as PackageJsonNx
          );
          if (!projectConfig) {
            if (options?.verboseOutput) {
              console.warn(
                `[razorwind] - ${new Date().toISOString()} - No project configuration found for project in root directory ${
                  projectRoot
                }`
              );
            }

            return {};
          }

          const targets: ProjectConfiguration["targets"] =
            readTargetsFromPackageJson(
              packageJson as PackageJsonNx,
              nxJson,
              projectRoot,
              context.workspaceRoot,
              packageManagerCommand
            );

          if (options?.verboseOutput) {
            console.debug(
              `[razorwind] - ${new Date().toISOString()} - Preparing Nx targets for project in root directory ${
                projectRoot
              }.`
            );
          }

          const targetName =
            options?.targetName ||
            Object.keys(targets ?? {}).find(
              name => targets[name]?.executor === GENERATE_EXECUTOR
            ) ||
            "generate";

          targets[targetName] = defu(targets[targetName], {
            inputs: [
              configFile,
              ...((isSetString(options?.componentsPath)
                ? [options.componentsPath]
                : options?.componentsPath) ?? []),
              ...((isSetString(options?.tokensPath)
                ? [options.tokensPath]
                : options?.tokensPath) ?? [])
            ],
            executor: GENERATE_EXECUTOR,
            dependsOn: [`^${targetName}`],
            defaultConfiguration: "production",
            options: {
              configFile,
              componentsPath: options?.componentsPath,
              tokensPath: options?.tokensPath
            },
            configurations: {
              production: {
                mode: "production"
              },
              development: {
                mode: "development"
              }
            }
          });

          setDefaultProjectTags(projectConfig, "razorwind");
          if (options?.verboseOutput) {
            console.debug(
              `[razorwind] - ${new Date().toISOString()} - Completed preparing Nx configuration for project in root directory ${projectRoot}.`
            );
          }

          return {
            projects: {
              [root]: defu(projectConfig, {
                projectType: projectConfig.projectType || "library",
                root,
                targets
              })
            }
          };
        } catch (error) {
          console.error(
            `[razorwind] - ${new Date().toISOString()} - Failed to process the project configuration for file "${
              configFile
            }" - ${
              isError(error)
                ? error.message
                : isSetString(error)
                  ? error
                  : "Unknown fatal error"
            }`
          );

          return {};
        }
      },
      configFiles,
      options,
      contextV2
    );
  }
];
