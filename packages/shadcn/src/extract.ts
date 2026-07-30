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

import { useExecution } from "@power-plant/core";
import { definePlugin } from "@razorwind/core/plugin";
import type {
  Component,
  ComponentFile,
  Components
} from "@razorwind/core/schema";
import { joinPaths } from "@stryke/path/join";
import { existsSync, statSync } from "node:fs";
import { basename, dirname } from "node:path";
import { loadRegistry } from "shadcn/registry";
import type { ShadcnExtractPluginOptions } from "./types";

export {
  BUILTIN_REGISTRIES,
  createRegistryConfig,
  DEFAULT_COMPONENTS,
  DEFAULT_STYLE,
  DEFAULT_TAILWIND_BASE_COLOR,
  DEFAULT_TAILWIND_CONFIG,
  DEFAULT_TAILWIND_CSS,
  DEFAULT_UTILS,
  getRawConfig,
  getRegistryConfig,
  resolveConfigPaths,
  type RegistryConfig
} from "./registry/config";
export type {
  ShadcnConfig,
  ShadcnRawConfig,
  ShadcnRegistryConfig,
  ShadcnWorkspaceConfig
} from "./registry/shadcn-types";
export type { ShadcnExtractPluginOptions } from "./types";

const COMPONENT_TYPES = new Set(["block", "component", "ui", "page"]);

const FILE_TYPES = new Set([
  "lib",
  "block",
  "component",
  "ui",
  "hook",
  "theme",
  "page",
  "file",
  "style",
  "base",
  "font",
  "item"
]);

interface RegistryItemLike {
  name: string;
  title?: string;
  type?: string;
  description?: string;
  categories?: string[];
  dependencies?: string[];
  devDependencies?: string[];
  registryDependencies?: string[];
  files?: unknown[];
  docs?: string;
}

/**
 * Convert npm-style dependency strings (`pkg`, `pkg@version`) into a
 * name → version record.
 */
export function toDependencyRecord(
  deps: string[] | undefined
): Record<string, string> | undefined {
  if (!deps?.length) {
    return undefined;
  }

  const record: Record<string, string> = {};

  for (const dep of deps) {
    const at = dep.lastIndexOf("@");
    if (at > 0) {
      record[dep.slice(0, at)] = dep.slice(at + 1) || "*";
    } else {
      record[dep] = "*";
    }
  }

  return record;
}

function stripRegistryPrefix(value: string): string {
  return value.startsWith("registry:")
    ? value.slice("registry:".length)
    : value;
}

function mapComponentType(
  type: string | undefined
): Component["type"] | undefined {
  if (!type) {
    return undefined;
  }

  const normalized = stripRegistryPrefix(type);

  return COMPONENT_TYPES.has(normalized)
    ? (normalized as Component["type"])
    : undefined;
}

function mapFileType(
  type: string | undefined
): ComponentFile["type"] | undefined {
  if (!type) {
    return undefined;
  }

  const normalized = stripRegistryPrefix(type);

  return FILE_TYPES.has(normalized)
    ? (normalized as ComponentFile["type"])
    : undefined;
}

function mapFiles(files: unknown[] | undefined): ComponentFile[] | undefined {
  if (!files?.length) {
    return undefined;
  }

  const mapped: ComponentFile[] = [];

  for (const file of files) {
    if (typeof file === "string") {
      mapped.push({ path: file, type: "file" });
      continue;
    }

    if (!file || typeof file !== "object") {
      continue;
    }

    const entry = file as {
      path?: string;
      type?: string;
      content?: string;
      target?: string;
    };

    if (!entry.path) {
      continue;
    }

    const fileType = mapFileType(entry.type) ?? "file";
    mapped.push({
      path: entry.path,
      type: fileType,
      ...(entry.content ? { content: entry.content } : {}),
      ...(entry.target ? { target: entry.target } : {})
    });
  }

  return mapped.length > 0 ? mapped : undefined;
}

/**
 * Map a single shadcn registry item into a Razorwind {@link Component}.
 */
export function registryItemToComponent(item: RegistryItemLike): Component {
  const description = [item.description, item.docs]
    .filter((part): part is string => Boolean(part?.trim()))
    .join("\n\n");
  const type = mapComponentType(item.type);
  const files = mapFiles(item.files);
  const dependencies = toDependencyRecord(item.dependencies);
  const devDependencies = toDependencyRecord(item.devDependencies);
  const registryDependencies = toDependencyRecord(item.registryDependencies);

  return {
    name: item.name,
    title: item.title?.trim() || item.name,
    ...(type ? { type } : {}),
    ...(item.categories?.[0] ? { category: item.categories[0] } : {}),
    ...(item.categories?.length ? { tags: [...item.categories] } : {}),
    ...(description ? { description } : {}),
    ...(dependencies ? { dependencies } : {}),
    ...(devDependencies ? { devDependencies } : {}),
    ...(registryDependencies ? { registryDependencies } : {}),
    ...(files ? { files } : {})
  };
}

/**
 * Convert a list of shadcn registry items into a `schema.components` record.
 */
export function registryItemsToComponents(
  items: RegistryItemLike[] | undefined
): Components {
  if (!items?.length) {
    return {};
  }

  const components: Components = {};

  for (const item of items) {
    if (!item?.name) {
      continue;
    }

    components[item.name] = registryItemToComponent(item);
  }

  return components;
}

function resolveLoadOptions(registryPath: string): {
  cwd: string;
  registryFile?: string;
} {
  if (existsSync(registryPath) && statSync(registryPath).isFile()) {
    return {
      cwd: dirname(registryPath),
      registryFile: basename(registryPath)
    };
  }

  return { cwd: registryPath };
}

/**
 * Load a local `registry.json` and map its items into `schema.components`.
 *
 * Returns an empty record when the registry file is missing or unreadable.
 */
export async function extractComponentsFromRegistry(
  registryPath: string
): Promise<Components> {
  try {
    const registry = await loadRegistry(resolveLoadOptions(registryPath));

    return registryItemsToComponents(registry.items);
  } catch {
    return {};
  }
}

/**
 * Razorwind plugin: load shadcn `registry.json` items into `schema.components`.
 *
 * @example
 * ```ts
 * import { defineConfig } from "@razorwind/core";
 * import shadcn from "@razorwind/shadcn/extract";
 *
 * export default defineConfig({
 *   plugins: [shadcn()]
 * });
 * ```
 */
export default definePlugin((options?: ShadcnExtractPluginOptions) => ({
  name: "shadcn:extract",
  extract: async spec => {
    if (spec.components && Object.keys(spec.components).length > 0) {
      return spec;
    }

    let configFile = options?.configFile;
    if (!configFile) {
      // eslint-disable-next-line react-hooks/rules-of-hooks, react/rules-of-hooks
      const { cwd } = useExecution();
      configFile = joinPaths(cwd, "registry.json");
    }

    const components = await extractComponentsFromRegistry(configFile);

    return { ...spec, components };
  }
}));
