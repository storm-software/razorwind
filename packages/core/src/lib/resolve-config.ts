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
import { isAbsolute, resolve } from "node:path";
import type {
  Config,
  Options,
  UserConfig,
  UserConfigFn
} from "../types/config";
import type { Plugin } from "../types/plugin";

/**
 * Keep the first plugin for each {@link Plugin.name}.
 *
 * `defu` concatenates plugin arrays when the same config is loaded via jiti
 * and c12, which would otherwise run every generator twice.
 */
export function uniquePlugins(plugins: Plugin[]): Plugin[] {
  const seen = new Set<string>();

  return plugins.filter(plugin => {
    if (!plugin?.name) {
      return true;
    }
    if (seen.has(plugin.name)) {
      return false;
    }
    seen.add(plugin.name);
    return true;
  });
}

const homeDir = os.homedir();

function toUserConfigs(value: unknown): UserConfig[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(item => isSetObject(item));
}

function asConfigLayer(value: unknown): Record<string, unknown> {
  if (Array.isArray(value) || !isSetObject(value)) {
    return {};
  }

  return { ...value };
}

const CONFIG_OWNED_OPTION_KEYS = [
  "tokensPath",
  "componentsPath",
  "iconsPath",
  "fontsPath"
] as const;

/**
 * Execute/CLI options fill gaps. Fields already set on a config item stay
 * on that item — otherwise a single `tokensPath` glob from `execute()` would
 * replace every array-config run and merge all theme files together.
 */
function executeOptionsForUserConfig(
  options: Options,
  userConfig: Partial<UserConfig>
): Options {
  const next: Options = { ...options };

  for (const key of CONFIG_OWNED_OPTION_KEYS) {
    if (userConfig[key] != null) {
      delete next[key];
    }
  }

  return next;
}

interface SharedConfigLayers {
  envPaths: Config["envPaths"];
  workspaceLayer: Record<string, unknown>;
  environmentLayer: Record<string, unknown>;
  homeLayer: Record<string, unknown>;
}

function finalizeConfig(
  cwd: string,
  options: Options,
  userConfig: Partial<UserConfig>,
  layers: SharedConfigLayers
): Config {
  const config = defu(
    {
      cwd,
      envPaths: layers.envPaths
    },
    executeOptionsForUserConfig(options, userConfig),
    userConfig,
    layers.workspaceLayer,
    layers.environmentLayer,
    layers.homeLayer,
    {
      componentsPath: cwd,
      iconsPath: joinPaths(cwd, "assets/icons"),
      fontsPath: joinPaths(cwd, "assets/fonts"),
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

  if (Array.isArray(config.fontsPath)) {
    const paths = config.fontsPath
      .filter(isSetString)
      .map(path => findFilePath(path));
    config.fontsPath =
      paths.length > 0 ? paths : joinPaths(cwd, "assets/fonts");
  } else if (isSetString(config.fontsPath)) {
    config.fontsPath = findFilePath(config.fontsPath);
  } else {
    config.fontsPath = joinPaths(cwd, "assets/fonts");
  }

  const plugins = uniquePlugins(
    Array.isArray(config.plugins) ? config.plugins : []
  );
  (config as Config).plugins = plugins;

  // `defu` treats `verbose: false` from execute options as an override. Only
  // `verbose: true` should force logging on; a false/omitted CLI flag must not
  // disable `verbose: true` from the config file.
  (config as Config).verbose =
    options.verbose === true || userConfig.verbose === true;

  return config;
}

/**
 * Loads the user configuration file for the project.
 *
 * Array exports (`defineConfig([...])`) resolve to one {@link Config} per
 * item. Each item is a separate generation run.
 *
 * @param cwd - The current working directory.
 * @param options - The options for the configuration.
 * @returns Resolved configurations, one per exported config object.
 */
export async function resolveConfigs(
  cwd: string,
  options: Options
): Promise<Config[]> {
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
                  : existsSync(joinPaths(cwd, `razorwind.${options.mode}.cts`))
                    ? joinPaths(cwd, `razorwind.${options.mode}.cts`)
                    : existsSync(
                          joinPaths(cwd, `razorwind.${options.mode}.json`)
                        )
                      ? joinPaths(cwd, `razorwind.${options.mode}.json`)
                      : existsSync(
                            joinPaths(cwd, `razorwind.${options.mode}.yaml`)
                          )
                        ? joinPaths(cwd, `razorwind.${options.mode}.yaml`)
                        : existsSync(
                              joinPaths(cwd, `razorwind.${options.mode}.yml`)
                            )
                          ? joinPaths(cwd, `razorwind.${options.mode}.yml`)
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
                                            joinPaths(
                                              cwd,
                                              `razorwind.config.json`
                                            )
                                          )
                                        ? joinPaths(
                                            cwd,
                                            `razorwind.config.json`
                                          )
                                        : existsSync(
                                              joinPaths(
                                                cwd,
                                                `razorwind.config.yaml`
                                              )
                                            )
                                          ? joinPaths(
                                              cwd,
                                              `razorwind.config.yaml`
                                            )
                                          : existsSync(
                                                joinPaths(
                                                  cwd,
                                                  `razorwind.config.yml`
                                                )
                                              )
                                            ? joinPaths(
                                                cwd,
                                                `razorwind.config.yml`
                                              )
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

  let userConfigs: Partial<UserConfig>[] = [{}];
  if (resolvedFilePath) {
    const configModulePath = isAbsolute(resolvedFilePath)
      ? resolvedFilePath
      : resolve(cwd, resolvedFilePath);
    const resolved = await jiti.import<
      UserConfig | UserConfig[] | UserConfigFn
    >(configModulePath, {
      default: true
    });
    if (resolved) {
      let loaded: unknown = resolved;
      if (isFunction(resolved)) {
        loaded = await Promise.resolve(
          resolved({ cwd, mode: options.mode ?? "development" })
        );
      } else {
        loaded = await Promise.resolve(resolved);
      }

      if (Array.isArray(loaded)) {
        const items = toUserConfigs(loaded);
        if (items.length === 0) {
          throw new Error(
            "Razorwind config array is empty. Provide at least one configuration object."
          );
        }
        userConfigs = items.map(config => ({
          ...config,
          configFile: resolvedFilePath
        }));
      } else if (isSetObject(loaded)) {
        userConfigs = [
          {
            ...(loaded as UserConfig),
            configFile: resolvedFilePath
          }
        ];
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

  const workspaceLayer = asConfigLayer(workspaceConfig?.config);
  const loadedConfigPath = resolvedFilePath
    ? isAbsolute(resolvedFilePath)
      ? resolvedFilePath
      : resolve(cwd, resolvedFilePath)
    : undefined;
  const workspaceConfigFile =
    typeof (workspaceConfig as { configFile?: unknown } | undefined)
      ?.configFile === "string"
      ? (workspaceConfig as { configFile: string }).configFile
      : undefined;
  if (
    loadedConfigPath &&
    workspaceConfigFile &&
    resolve(cwd, workspaceConfigFile) === loadedConfigPath
  ) {
    delete workspaceLayer.plugins;
  }

  const sharedLayers = {
    envPaths: {
      ...envPaths,
      home: homeDir
    },
    workspaceLayer,
    environmentLayer: asConfigLayer(environmentConfig?.config),
    homeLayer: asConfigLayer(homeConfig?.config)
  };

  return userConfigs.map(userConfig =>
    finalizeConfig(cwd, options, userConfig, sharedLayers)
  );
}

/**
 * Loads the user configuration file for the project.
 *
 * When the file exports an array of configs, this returns the first resolved
 * {@link Config}. Use {@link resolveConfigs} to run every array item.
 *
 * @param cwd - The current working directory.
 * @param options - The options for the configuration.
 * @returns The first resolved configuration.
 */
export async function resolveConfig(
  cwd: string,
  options: Options
): Promise<Config> {
  const configs = await resolveConfigs(cwd, options);
  const config = configs[0];
  if (!config) {
    throw new Error("Unable to resolve Razorwind configuration.");
  }

  return config;
}
