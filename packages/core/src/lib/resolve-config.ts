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

import { getEnvPaths } from "@stryke/env/get-env-paths";
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
        : existsSync(joinPaths(cwd, `razorwind.${options.mode}.ts`))
          ? joinPaths(cwd, `razorwind.${options.mode}.ts`)
          : existsSync(joinPaths(cwd, `razorwind.${options.mode}.js`))
            ? joinPaths(cwd, `razorwind.${options.mode}.js`)
            : existsSync(joinPaths(cwd, `razorwind.${options.mode}.mts`))
              ? joinPaths(cwd, `razorwind.${options.mode}.mts`)
              : existsSync(joinPaths(cwd, `razorwind.${options.mode}.mjs`))
                ? joinPaths(cwd, `razorwind.${options.mode}.mjs`)
                : existsSync(joinPaths(cwd, `razorwind.${options.mode}.cjs`))
                  ? joinPaths(cwd, `razorwind.${options.mode}.cjs`)
                  : existsSync(
                        joinPaths(cwd, `razorwind.${options.mode}.cts`)
                      )
                    ? joinPaths(cwd, `razorwind.${options.mode}.cts`)
                    : existsSync(
                          joinPaths(
                            cwd,
                            `razorwind.${options.mode}.json`
                          )
                        )
                      ? joinPaths(cwd, `razorwind.${options.mode}.json`)
                      : existsSync(
                            joinPaths(
                              cwd,
                              `razorwind.${options.mode}.yaml`
                            )
                          )
                        ? joinPaths(
                            cwd,
                            `razorwind.${options.mode}.yaml`
                          )
                        : existsSync(
                              joinPaths(
                                cwd,
                                `razorwind.${options.mode}.yml`
                              )
                            )
                          ? joinPaths(
                              cwd,
                              `razorwind.${options.mode}.yml`
                            )
                          : existsSync(joinPaths(cwd, `razorwind.config.ts`))
                            ? joinPaths(cwd, `razorwind.config.ts`)
                            : existsSync(joinPaths(cwd, `razorwind.config.js`))
                              ? joinPaths(cwd, `razorwind.config.js`)
                              : existsSync(
                                    joinPaths(cwd, `razorwind.config.mts`)
                                  )
                                ? joinPaths(cwd, `razorwind.config.mts`)
                                : existsSync(
                                      joinPaths(cwd, `razorwind.config.mjs`)
                                    )
                                  ? joinPaths(cwd, `razorwind.config.mjs`)
                                  : existsSync(
                                      joinPaths(cwd, `razorwind.config.cjs`)
                                  )
                                ? joinPaths(cwd, `razorwind.config.cjs`)
                                : existsSync(
                                      joinPaths(cwd, `razorwind.config.cts`)
                                    )
                                  ? joinPaths(cwd, `razorwind.config.cts`)
                                  : existsSync(
                                        joinPaths(cwd, `razorwind.config.json`)
                                      )
                                    ? joinPaths(cwd, `razorwind.config.json`)
                                    : existsSync(
                                          joinPaths(cwd, `razorwind.config.yaml`)
                                        )
                                      ? joinPaths(cwd, `razorwind.config.yaml`)
                                      : existsSync(
                                            joinPaths(cwd, `razorwind.config.yml`)
                                          )
                                            ? joinPaths(cwd, `razorwind.config.yml`)
                                            : undefined;

  const envPaths = getEnvPaths({
    orgId: "storm-software",
    appId: "razorwind",
    workspaceRoot: cwd
  });

  const jitiOptions = {
    fsCache: envPaths.cache
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
          resolved.default({ cwd, mode: options.mode ?? "development" })
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
      componentsPath: cwd,
      iconsPath: joinPaths(cwd, "assets/icons"),
      plugins: []
    }
  );

  if (Array.isArray(config.componentsPath)) {
    const paths = config.componentsPath
      .filter(isSetString)
      .map(path => findFilePath(path));
    config.componentsPath = paths.length > 0 ? paths : cwd;
  } else if (isSetString(config.componentsPath)) {
    config.componentsPath = findFilePath(config.componentsPath);
  } else {
    config.componentsPath = cwd;
  }

  if (Array.isArray(config.iconsPath)) {
    const paths = config.iconsPath
      .filter(isSetString)
      .map(path => findFilePath(path));
    config.iconsPath =
      paths.length > 0 ? paths : joinPaths(cwd, "assets/icons");
  } else if (isSetString(config.iconsPath)) {
    config.iconsPath = findFilePath(config.iconsPath);
  } else {
    config.iconsPath = joinPaths(cwd, "assets/icons");
  }

  if (!Array.isArray(config.plugins)) {
    config.plugins = [];
  }

  return config;
}
