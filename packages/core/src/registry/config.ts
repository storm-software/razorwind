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

import { loadTsConfig } from "@stryke/fs/tsconfig";
import { joinPaths } from "@stryke/path/join";
import type { TsConfigJson } from "@stryke/types/tsconfig";
import chalk from "chalk";
import { cosmiconfig } from "cosmiconfig";
import fg from "fast-glob";
import path from "node:path";
import type { PresetBase } from "shadcn/preset";
import {
  configSchema,
  rawConfigSchema,
  workspaceConfigSchema
} from "shadcn/schema";
import { parsePresetStyle } from "./preset";
import type {
  ShadcnConfig,
  ShadcnRawConfig,
  ShadcnRegistryConfig
} from "./shadcn-types";
import { REGISTRY_URL } from "./utils/base-urls";
import { getProjectInfo } from "./utils/get-project-info";
import { resolveImportWithMetadata } from "./utils/resolve";

export const DEFAULT_STYLE = "default";
export const DEFAULT_COMPONENTS = "@/components";
export const DEFAULT_UTILS = "@/lib/utils";
export const DEFAULT_TAILWIND_CSS = "app/globals.css";
export const DEFAULT_TAILWIND_CONFIG = "tailwind.config.js";
export const DEFAULT_TAILWIND_BASE_COLOR = "slate";

// TODO: Figure out if we want to support all cosmiconfig formats.
// A simple components.json file would be nice.
export const explorer = cosmiconfig("components", {
  searchPlaces: ["components.json"]
});

export type Config = ShadcnConfig;

export async function getConfig(cwd: string) {
  const config = await getRawConfig(cwd);
  if (!config) {
    return null;
  }

  // Set default icon library if not provided.
  if (!config.iconLibrary) {
    config.iconLibrary = config.style === "new-york" ? "radix" : "lucide";
  }

  return resolveConfigPaths(cwd, config);
}

export const BUILTIN_REGISTRIES: ShadcnRegistryConfig = {
  "@shadcn": `${REGISTRY_URL}/styles/{style}/{name}.json`
};

export async function resolveConfigPaths(cwd: string, config: ShadcnRawConfig) {
  // Merge built-in registries with user registries
  config.registries = {
    ...BUILTIN_REGISTRIES,
    ...(config.registries ?? {})
  };

  // Read tsconfig.json.
  const tsConfig = await loadTsConfig(cwd);
  if (!tsConfig) {
    throw new Error(`Failed to load tsconfig.json.`);
  }

  // Resolve the primary aliases first so fallbacks can reuse their results.
  const resolvedUtils = await resolveAliasPath(
    "utils",
    config.aliases.utils,
    cwd,
    tsConfig
  );
  const resolvedComponents = await resolveAliasPath(
    "components",
    config.aliases.components,
    cwd,
    tsConfig
  );
  const resolvedUi = config.aliases.ui
    ? await resolveAliasPath("ui", config.aliases.ui, cwd, tsConfig)
    : path.resolve(resolvedComponents ?? cwd, "ui");
  const resolvedLib = config.aliases.lib
    ? await resolveAliasPath("lib", config.aliases.lib, cwd, tsConfig)
    : path.resolve(resolvedUtils ?? cwd, "..");
  const resolvedHooks = config.aliases.hooks
    ? await resolveAliasPath("hooks", config.aliases.hooks, cwd, tsConfig)
    : path.resolve(resolvedComponents ?? cwd, "..", "hooks");

  assertResolvedAliases(cwd, {
    components: resolvedComponents,
    utils: resolvedUtils,
    ui: resolvedUi,
    lib: resolvedLib,
    hooks: resolvedHooks
  });

  return configSchema.parse({
    ...config,
    resolvedPaths: {
      cwd,
      tailwindConfig: config.tailwind.config
        ? path.resolve(cwd, config.tailwind.config)
        : "",
      tailwindCss: path.resolve(cwd, config.tailwind.css),
      utils: resolvedUtils,
      components: resolvedComponents,
      ui: resolvedUi,
      // TODO: Make this configurable.
      // For now, we assume the lib and hooks directories are one level up from the components directory.
      lib: resolvedLib,
      hooks: resolvedHooks
    }
  });
}

async function resolveAliasPath(
  aliasKey: "components" | "utils" | "ui" | "lib" | "hooks",
  alias: string,
  cwd: string,
  tsConfig: TsConfigJson
) {
  const resolved = await resolveImportWithMetadata(alias, {
    ...tsConfig,
    cwd
  });

  if (!resolved?.path) {
    return null;
  }

  if (alias.startsWith("#") && resolved.path === joinPaths(cwd, alias)) {
    return null;
  }

  // For non-utils alias keys backed by package imports or workspace exports,
  // strip directory-level artifacts so the resolved path points at the
  // directory root rather than a specific file.
  if (
    aliasKey !== "utils" &&
    (resolved.source === "package_imports" ||
      resolved.source === "workspace_package_exports")
  ) {
    // Exact aliases (e.g. `#hooks` → `./src/hooks/index.ts`) should resolve
    // to the directory root.
    if (
      !resolved.matchedAlias.includes("*") &&
      /\/index\.[^/]+$/.test(resolved.path)
    ) {
      return path.dirname(resolved.path);
    }

    // Wildcard aliases with explicit extensions (e.g. `#components/*` →
    // `./src/components/*.tsx`) should strip the source extension so `ui`
    // resolves to `/src/components/ui` instead of `/src/components/ui.tsx`.
    if (resolved.matchedAlias.includes("*") && /\.[^/]+$/.test(resolved.path)) {
      return resolved.path.replace(/\.[^/]+$/, "");
    }
  }

  return resolved.path;
}

function assertResolvedAliases(
  cwd: string,
  resolvedAliases: Record<
    "components" | "utils" | "ui" | "lib" | "hooks",
    string | null
  >
) {
  const missingAliases = ["components", "ui", "lib", "hooks", "utils"].filter(
    key => !resolvedAliases[key as keyof typeof resolvedAliases]
  );

  if (!missingAliases.length) {
    return;
  }

  throw new Error(
    [
      `Could not resolve the following aliases in ${chalk.cyan(cwd)}: ${chalk.cyan(
        missingAliases.join(", ")
      )}.`,
      `Configure path aliases in ${chalk.cyan(
        "tsconfig.json"
      )} or imports in ${chalk.cyan(
        "package.json"
      )} for this workspace and try again.`
    ].join("\n")
  );
}

export async function getRawConfig(
  cwd: string
): Promise<ShadcnRawConfig | null> {
  try {
    const configResult = await explorer.search(cwd);

    if (!configResult) {
      return null;
    }

    const config = rawConfigSchema.parse(configResult.config);

    // Check if user is trying to override built-in registries
    if (config.registries) {
      for (const registryName of Object.keys(config.registries)) {
        if (registryName in BUILTIN_REGISTRIES) {
          throw new Error(
            `"${registryName}" is a built-in registry and cannot be overridden.`
          );
        }
      }
    }

    return config;
  } catch (error) {
    const componentPath = `${cwd}/components.json`;
    if (error instanceof Error && error.message.includes("reserved registry")) {
      throw error;
    }
    throw new Error(
      `Invalid configuration found in ${chalk.cyan(componentPath)}.`
    );
  }
}

// Note: we can check for -workspace.yaml or "workspace" in package.json.
// Since cwd is not necessarily the root of the project.
// We'll instead check if ui aliases resolve to a different root.
export async function getWorkspaceConfig(config: Config) {
  const resolvedAliases: any = {};

  for (const key of Object.keys(config.aliases)) {
    if (!isAliasKey(key, config)) {
      continue;
    }

    const resolvedPath = config.resolvedPaths[key];
    const packageRoot = await findPackageRoot(
      config.resolvedPaths.cwd,
      resolvedPath
    );

    if (!packageRoot) {
      resolvedAliases[key] = config;
      continue;
    }

    const workspaceConfig = await getConfig(packageRoot);

    if (!workspaceConfig) {
      throw new Error(
        [
          `Could not load the workspace config in ${chalk.cyan(packageRoot)}.`,
          `Add ${chalk.cyan(
            "components.json"
          )} to this workspace and configure its path aliases or package imports, then try again.`
        ].join("\n")
      );
    }

    resolvedAliases[key] = workspaceConfig;
  }

  const result = workspaceConfigSchema.safeParse(resolvedAliases);
  if (!result.success) {
    return null;
  }

  return result.data;
}

export async function findPackageRoot(cwd: string, resolvedPath: string) {
  const commonRoot = findCommonRoot(cwd, resolvedPath);
  const relativePath = path.relative(commonRoot, resolvedPath);

  const packageRoots = await fg.glob("**/package.json", {
    cwd: commonRoot,
    deep: 3,
    ignore: ["**/node_modules/**", "**/dist/**", "**/build/**", "**/public/**"]
  });

  const matchingPackageRoot = packageRoots
    .map(pkgPath => path.dirname(pkgPath))
    .find(pkgDir => relativePath.startsWith(pkgDir));

  return matchingPackageRoot
    ? path.join(commonRoot, matchingPackageRoot)
    : null;
}

function isAliasKey(
  key: string,
  config: Config
): key is Exclude<Extract<keyof Config["aliases"], string>, "utils"> {
  return key !== "utils" && key in config.resolvedPaths;
}

export function findCommonRoot(cwd: string, resolvedPath: string) {
  const parts1 = cwd.split(path.sep);
  const parts2 = resolvedPath.split(path.sep);
  const commonParts = [];

  for (let i = 0; i < Math.min(parts1.length, parts2.length); i++) {
    if (parts1[i] !== parts2[i]) {
      break;
    }
    commonParts.push(parts1[i]);
  }

  return commonParts.join(path.sep);
}

// TODO: Cache this call.
export async function getTargetStyleFromConfig(cwd: string, fallback: string) {
  const projectInfo = await getProjectInfo(cwd);

  return projectInfo?.tailwindVersion === "v4" ? "new-york-v4" : fallback;
}

export function getBase(style: string | undefined): PresetBase {
  // An undefined style means no existing config, so default to base.
  // Any defined style, including empty and unprefixed legacy values
  // (new-york, new-york-v4, default), stays radix.
  if (style === undefined) {
    return "base";
  }

  return parsePresetStyle(style).base ?? "radix";
}

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Creates a config object with sensible defaults.
 * Useful for universal registry items that bypass framework detection.
 *
 * @param partial - Partial config values to override defaults
 * @returns A complete Config object
 */
export function createConfig(partial?: DeepPartial<Config>): Config {
  const defaultConfig: Config = {
    resolvedPaths: {
      cwd: process.cwd(),
      tailwindConfig: "",
      tailwindCss: "",
      utils: "",
      components: "",
      ui: "",
      lib: "",
      hooks: ""
    },
    style: "",
    tailwind: {
      config: "",
      css: "",
      baseColor: "",
      cssVariables: false
    },
    rsc: false,
    tsx: true,
    aliases: {
      components: "",
      utils: ""
    },
    registries: {
      ...BUILTIN_REGISTRIES
    }
  };

  // Deep merge the partial config with defaults
  if (partial) {
    return {
      ...defaultConfig,
      ...partial,
      resolvedPaths: {
        ...defaultConfig.resolvedPaths,
        ...(partial.resolvedPaths ?? {})
      },
      tailwind: {
        ...defaultConfig.tailwind,
        ...(partial.tailwind ?? {})
      },
      aliases: {
        ...defaultConfig.aliases,
        ...(partial.aliases ?? {})
      },
      registries: {
        ...defaultConfig.registries,
        ...(partial.registries ?? {})
      }
    };
  }

  return defaultConfig;
}
