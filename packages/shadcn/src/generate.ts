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

import type { GeneratorFunctionResult } from "@power-plant/core";
import { useExecution } from "@power-plant/core";
import { definePlugin } from "@razorwind/core/plugin";
import type {
  Component,
  ComponentFile,
  Components,
  Schema
} from "@razorwind/core/schema";
import { createDocument } from "@razorwind/core/utils";
import { joinPaths } from "@stryke/path/join";
import { dirname, join } from "node:path";
import { renderInstallMd } from "./install";
import type { ShadcnGeneratePluginOptions } from "./types";

export type { ShadcnGeneratePluginOptions } from "./types";

const REGISTRY_SCHEMA = "https://ui.shadcn.com/schema/registry.json";

type RegistryItemType =
  "registry:block" | "registry:component" | "registry:ui" | "registry:page";

type RegistryFileType =
  | "registry:lib"
  | "registry:block"
  | "registry:component"
  | "registry:ui"
  | "registry:hook"
  | "registry:theme"
  | "registry:page"
  | "registry:file"
  | "registry:style"
  | "registry:base"
  | "registry:font"
  | "registry:item";

export interface RegistryFileLike {
  path: string;
  type: RegistryFileType;
  content?: string;
  target?: string;
}

export interface RegistryItemLike {
  name: string;
  title?: string;
  type: RegistryItemType;
  description?: string;
  categories?: string[];
  dependencies?: string[];
  devDependencies?: string[];
  registryDependencies?: string[];
  files?: RegistryFileLike[];
}

export interface RegistryDocument {
  $schema: string;
  name?: string;
  homepage?: string;
  items: RegistryItemLike[];
}

/**
 * Convert a name → version record back into npm-style dependency strings.
 * Versions of `*` omit the `@version` suffix.
 */
export function fromDependencyRecord(
  deps: Record<string, string> | undefined
): string[] | undefined {
  if (!deps || Object.keys(deps).length === 0) {
    return undefined;
  }

  return Object.entries(deps).map(([name, version]) =>
    !version || version === "*" ? name : `${name}@${version}`
  );
}

function toRegistryItemType(
  type: Component["type"] | undefined
): RegistryItemType {
  switch (type) {
    case "block":
    case "component":
    case "ui":
    case "page":
      return `registry:${type}`;
    case undefined:
    default:
      return "registry:component";
  }
}

function toRegistryFileType(type: ComponentFile["type"]): RegistryFileType {
  return `registry:${type}`;
}

function mapFiles(
  files: ComponentFile[] | undefined
): RegistryFileLike[] | undefined {
  if (!files?.length) {
    return undefined;
  }

  return files.map(file => {
    const type = toRegistryFileType(file.type);
    const entry: RegistryFileLike = {
      path: file.path,
      type
    };

    if (file.content) {
      entry.content = file.content;
    }

    if (file.target) {
      entry.target = file.target;
    } else if (type === "registry:file" || type === "registry:page") {
      // shadcn schema requires `target` for file/page entries
      entry.target = file.path;
    }

    return entry;
  });
}

/**
 * Map a Razorwind {@link Component} into a shadcn registry item.
 */
export function componentToRegistryItem(
  component: Component
): RegistryItemLike {
  const categories = component.tags?.length
    ? [...component.tags]
    : component.category
      ? [component.category]
      : undefined;
  const dependencies = fromDependencyRecord(component.dependencies);
  const devDependencies = fromDependencyRecord(component.devDependencies);
  const registryDependencies = fromDependencyRecord(
    component.registryDependencies
  );
  const files = mapFiles(component.files);

  return {
    name: component.name,
    type: toRegistryItemType(component.type),
    ...(component.title ? { title: component.title } : {}),
    ...(component.description ? { description: component.description } : {}),
    ...(categories ? { categories } : {}),
    ...(dependencies ? { dependencies } : {}),
    ...(devDependencies ? { devDependencies } : {}),
    ...(registryDependencies ? { registryDependencies } : {}),
    ...(files ? { files } : {})
  };
}

/**
 * Convert a `schema.components` record into a shadcn registry `items` list.
 */
export function componentsToRegistryItems(
  components: Components | undefined
): RegistryItemLike[] {
  if (!components || Object.keys(components).length === 0) {
    return [];
  }

  return Object.values(components)
    .filter((component): component is Component => Boolean(component?.name))
    .map(componentToRegistryItem)
    .toSorted((a, b) => a.name.localeCompare(b.name));
}

/**
 * Build a shadcn `registry.json` document from schema components.
 */
export function renderRegistryJson(
  components: Components | undefined,
  options: Pick<ShadcnGeneratePluginOptions, "name" | "homepage"> = {}
): RegistryDocument {
  const document: RegistryDocument = {
    $schema: REGISTRY_SCHEMA,
    items: componentsToRegistryItems(components)
  };

  if (options.name) {
    document.name = options.name;
  }

  if (options.homepage) {
    document.homepage = options.homepage;
  }

  return document;
}

export { renderInstallMd };

async function resolveOutFile(
  options: ShadcnGeneratePluginOptions
): Promise<string> {
  if (options.configFile) {
    return options.configFile;
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks, react/rules-of-hooks
  const { cwd } = useExecution();

  return joinPaths(cwd, "registry.json");
}

/**
 * Generate a shadcn `registry.json` file from a Razorwind schema.
 */
export async function generateRegistryJson(
  spec: Schema,
  options: ShadcnGeneratePluginOptions = {}
): Promise<GeneratorFunctionResult<Schema, ShadcnGeneratePluginOptions>> {
  if (!spec.components || Object.keys(spec.components).length === 0) {
    return {};
  }

  const outFile = await resolveOutFile(options);
  const content = `${JSON.stringify(renderRegistryJson(spec.components, options), null, 2)}\n`;
  const installBody =
    options.installGuide ??
    renderInstallMd({
      configFile: outFile,
      name: options.name
    });
  const installPath = join(dirname(outFile), "INSTALL.md");

  return {
    [outFile]: createDocument<Schema, ShadcnGeneratePluginOptions>(
      outFile,
      content,
      { name: "shadcn:generate" },
      "json"
    ),
    [installPath]: createDocument<Schema, ShadcnGeneratePluginOptions>(
      installPath,
      installBody,
      { name: "shadcn:generate" },
      "markdown"
    )
  };
}

/**
 * Razorwind plugin: generate a shadcn `registry.json` from schema components.
 *
 * @example
 * ```ts
 * import { defineConfig } from "@razorwind/core";
 * import shadcn from "@razorwind/shadcn/generate";
 *
 * export default defineConfig({
 *   plugins: [shadcn({ name: "acme", homepage: "https://acme.com" })]
 * });
 * ```
 */
export default definePlugin((options?: ShadcnGeneratePluginOptions) => ({
  name: "shadcn:generate",
  generate: async spec => generateRegistryJson(spec, options ?? {})
}));
