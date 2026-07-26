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

import { getEnvPaths } from "@stryke/env";
import { findFilePath } from "@stryke/path/find";
import { joinPaths } from "@stryke/path/join";
import { replacePath } from "@stryke/path/replace";
import { isFunction } from "@stryke/type-checks/is-function";
import { isSetObject } from "@stryke/type-checks/is-set-object";
import { isSetString } from "@stryke/type-checks/is-set-string";
import { loadConfig as loadConfigC12 } from "c12";
import { defu } from "defu";
import { createJiti } from "jiti";
import { existsSync } from "node:fs";
import os from "node:os";
import type {
  Config,
  Options,
  UserConfig,
  UserConfigExport
} from "../types/config";

const homeDir = os.homedir();

/**
 * Loads the user configuration file for the project.
 *
 * @param cwd - The current working directory.
 * @param options - The options for the configuration.
 * @returns The resolved configuration.
 */
export async function resolveConfig(
  cwd: string,
  options: Options
): Promise<Config> {
  const resolvedFilePath =
    options.configFile && existsSync(replacePath(options.configFile, cwd))
      ? replacePath(options.configFile, cwd)
      : options.configFile && existsSync(options.configFile)
        ? options.configFile
        : existsSync(joinPaths(cwd, `razorwind.${options.mode}.config.ts`))
          ? joinPaths(cwd, `razorwind.${options.mode}.config.ts`)
          : existsSync(joinPaths(cwd, `razorwind.${options.mode}.config.js`))
            ? joinPaths(cwd, `razorwind.${options.mode}.config.js`)
            : existsSync(joinPaths(cwd, `razorwind.${options.mode}.config.mts`))
              ? joinPaths(cwd, `razorwind.${options.mode}.config.mts`)
              : existsSync(
                    joinPaths(cwd, `razorwind.${options.mode}.config.mjs`)
                  )
                ? joinPaths(cwd, `razorwind.${options.mode}.config.mjs`)
                : existsSync(joinPaths(cwd, `razorwind.config.ts`))
                  ? joinPaths(cwd, `razorwind.config.ts`)
                  : existsSync(joinPaths(cwd, `razorwind.config.js`))
                    ? joinPaths(cwd, `razorwind.config.js`)
                    : existsSync(joinPaths(cwd, `razorwind.config.mts`))
                      ? joinPaths(cwd, `razorwind.config.mts`)
                      : existsSync(joinPaths(cwd, `razorwind.config.mjs`))
                        ? joinPaths(cwd, `razorwind.config.mjs`)
                        : undefined;

  const envPaths = getEnvPaths({
    orgId: "storm-software",
    appId: "razorwind",
    workspaceRoot: cwd
  });

  const jitiOptions = {
    cacheDir: envPaths.cache
  };
  const jiti = createJiti(cwd, jitiOptions);

  let resolvedConfig: Partial<UserConfig> = {};
  if (resolvedFilePath) {
    const resolved = await jiti.import<{ default: UserConfigExport }>(
      jiti.esmResolve(resolvedFilePath)
    );
    if (resolved?.default) {
      let config = {};
      if (isFunction(resolved.default)) {
        config = await Promise.resolve(
          resolved.default({ cwd, mode: options.mode })
        );
      } else if (
        isSetObject(resolved.default) ||
        Array.isArray(resolved.default)
      ) {
        config = resolved.default;
      }

      if (isSetObject(config) || Array.isArray(config)) {
        resolvedConfig = {
          ...config,
          configFile: resolvedFilePath
        };
      }
    }
  }

  const [workspaceConfig, environmentConfig, homeConfig] = await Promise.all([
    loadConfigC12({
      cwd,
      name: "razorwind",
      envName: options.mode,
      globalRc: true,
      packageJson: "razorwind",
      dotenv: true,
      jitiOptions
    }),
    loadConfigC12({
      cwd: envPaths.config,
      name: "razorwind",
      envName: options.mode,
      dotenv: true,
      jitiOptions
    }),
    loadConfigC12({
      cwd: homeDir,
      name: "razorwind",
      envName: options.mode,
      dotenv: true,
      jitiOptions
    })
  ]);

  const config = defu(
    {
      cwd,
      envPaths: {
        ...envPaths,
        home: homeDir
      }
    },
    options,
    resolvedConfig,
    isSetObject(workspaceConfig?.config) ? { ...workspaceConfig.config } : {},
    isSetObject(environmentConfig?.config)
      ? { ...environmentConfig.config }
      : {},
    isSetObject(homeConfig?.config) ? { ...homeConfig.config } : {},
    {
      registryPath: isSetString(options.registryPath)
        ? findFilePath(options.registryPath)
        : cwd,
      plugins: []
    }
  );

  if (!Array.isArray(config.plugins)) {
    config.plugins = [];
  }

  return config;
}
