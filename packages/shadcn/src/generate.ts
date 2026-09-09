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
import { createDocument, resolveSchemaIdentity } from "@razorwind/core/utils";
import { existsSync } from "@stryke/fs/exists";
import { readJsonFile } from "@stryke/fs/json";
import { joinPaths } from "@stryke/path/join";
import fg from "fast-glob";
import { readFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
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

type DependencyRecord = Record<string, string>;

interface WorkspaceManifest {
  packages?: string[];
  catalog?: DependencyRecord;
  catalogs?: Record<string, DependencyRecord>;
}

interface WorkspacePackage {
  name?: string;
  version?: string;
}

function resolveWorkspaceSpecifier(specifier: string, version: string): string {
  const range = specifier.slice("workspace:".length);

  if (range === "*") {
    return version;
  }

  if (range === "^" || range === "~") {
    return `${range}${version}`;
  }

  return range;
}

function findPnpmWorkspaceRoot(cwd: string): string | undefined {
  let directory = resolve(cwd);

  while (true) {
    if (existsSync(join(directory, "pnpm-workspace.yaml"))) {
      return directory;
    }

    const parent = dirname(directory);
    if (parent === directory) {
      return undefined;
    }

    directory = parent;
  }
}

async function createDependencyVersionResolver(cwd: string) {
  const workspaceRoot = findPnpmWorkspaceRoot(cwd) ?? cwd;
  const workspaceFile = join(workspaceRoot, "pnpm-workspace.yaml");
  let manifest: WorkspaceManifest = {};

  if (existsSync(workspaceFile)) {
    try {
      manifest = (parseYaml(await readFile(workspaceFile, "utf8")) ??
        {}) as WorkspaceManifest;
    } catch {
      // The resolver below reports a dependency-specific error when needed.
    }
  }

  const workspaceVersions = new Map<string, string>();
  const patterns = manifest.packages?.filter(
    (pattern): pattern is string =>
      typeof pattern === "string" && !pattern.startsWith("!")
  );
  if (patterns && patterns.length) {
    const packageJsonPaths = await fg(
      patterns.map(
        pattern =>
          `${pattern
            .split("\\")
            .join("/")
            .replace(/[\\/]$/, "")}/package.json`
      ),
      { cwd: workspaceRoot, ignore: ["**/node_modules/**"] }
    );

    for (const packageJsonPath of packageJsonPaths) {
      try {
        const packageJson = await readJsonFile<WorkspacePackage>(
          join(workspaceRoot, packageJsonPath)
        );
        if (packageJson.name && packageJson.version) {
          workspaceVersions.set(packageJson.name, packageJson.version);
        }
      } catch {
        // Ignore unreadable workspace manifests.
      }
    }
  }

  return (name: string, specifier: string): string => {
    if (specifier.startsWith("catalog:")) {
      const catalogName = specifier.slice("catalog:".length);
      const catalog = catalogName
        ? manifest.catalogs?.[catalogName]
        : manifest.catalog;
      const version = catalog?.[name];

      if (!version) {
        throw new Error(
          `Unable to resolve ${specifier} for ${name} from ${workspaceFile}.`
        );
      }

      return version;
    }

    if (specifier.startsWith("workspace:")) {
      const version = workspaceVersions.get(name);
      if (!version) {
        throw new Error(
          `Unable to resolve ${specifier} for workspace package ${name}.`
        );
      }

      return resolveWorkspaceSpecifier(specifier, version);
    }

    return specifier;
  };
}

async function resolveComponentDependencyVersions(
  components: Components,
  cwd: string
): Promise<Components> {
  const resolveVersion = await createDependencyVersionResolver(cwd);
  const resolveRecord = (deps: DependencyRecord | undefined) =>
    deps
      ? Object.fromEntries(
          Object.entries(deps).map(([name, version]) => [
            name,
            resolveVersion(name, version)
          ])
        )
      : undefined;
  const resolved: Components = {};

  for (const [name, component] of Object.entries(components)) {
    if (!component) {
      continue;
    }

    resolved[name] = {
      ...component,
      ...(component.dependencies
        ? { dependencies: resolveRecord(component.dependencies) }
        : {}),
      ...(component.devDependencies
        ? { devDependencies: resolveRecord(component.devDependencies) }
        : {}),
      ...(component.registryDependencies
        ? {
            registryDependencies: resolveRecord(component.registryDependencies)
          }
        : {})
    };
  }

  return resolved;
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

function toRegistryFileType(
  type: NonNullable<ComponentFile["type"]>
): RegistryFileType {
  return `registry:${type}`;
}

function toRegistryPath(path: string, cwd = process.cwd()): string {
  return isAbsolute(path) ? relative(cwd, path) : path;
}

function mapFiles(
  files: ComponentFile[] | undefined,
  cwd?: string
): RegistryFileLike[] | undefined {
  if (!files?.length) {
    return undefined;
  }

  return files.map(file => {
    const type = toRegistryFileType(file.type!);
    const entry: RegistryFileLike = {
      path: toRegistryPath(file.path, cwd),
      type
    };

    if (file.content && !existsSync(file.path)) {
      entry.content = file.content;
    }

    if (file.target) {
      entry.target = toRegistryPath(file.target, cwd);
    } else if (type === "registry:file" || type === "registry:page") {
      // shadcn schema requires `target` for file/page entries
      entry.target = toRegistryPath(file.path, cwd);
    }

    return entry;
  });
}

/**
 * Map a Razorwind {@link Component} into a shadcn registry item.
 */
export function componentToRegistryItem(
  component: Component,
  cwd?: string
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
  const files = mapFiles(component.files, cwd);

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
  components: Components | undefined,
  cwd?: string
): RegistryItemLike[] {
  if (!components || Object.keys(components).length === 0) {
    return [];
  }

  return Object.values(components)
    .filter((component): component is Component => Boolean(component?.name))
    .map(component => componentToRegistryItem(component, cwd))
    .toSorted((a, b) => a.name.localeCompare(b.name));
}

/**
 * Build a shadcn `registry.json` document from schema components.
 */
export function renderRegistryJson(
  components: Components | undefined,
  options: Pick<ShadcnGeneratePluginOptions, "name" | "homepage"> = {},
  cwd?: string
): RegistryDocument {
  const document: RegistryDocument = {
    $schema: REGISTRY_SCHEMA,
    items: componentsToRegistryItems(components, cwd)
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

async function resolveoutputPath(
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
  options: ShadcnGeneratePluginOptions = {},
  cwd?: string
): Promise<GeneratorFunctionResult<Schema, ShadcnGeneratePluginOptions>> {
  if (!spec.components || Object.keys(spec.components).length === 0) {
    return {};
  }

  const identity = resolveSchemaIdentity(spec, {
    name: options.name,
    homepage: options.homepage
  });
  const registryOptions = {
    name: options.name ?? identity.name,
    homepage: options.homepage ?? identity.homepage
  };

  const outputPath = await resolveoutputPath(options);
  const components = await resolveComponentDependencyVersions(
    spec.components,
    cwd ?? process.cwd()
  );
  const content = `${JSON.stringify(renderRegistryJson(components, registryOptions, cwd), null, 2)}\n`;
  const installBody =
    options.installGuide ??
    renderInstallMd({
      configFile: outputPath,
      name: registryOptions.name
    });
  const installPath = join(dirname(outputPath), "INSTALL.md");

  return {
    [outputPath]: createDocument<Schema, ShadcnGeneratePluginOptions>(
      outputPath,
      content,
      { name: "shadcn:generate" },
      undefined,
      "json"
    ),
    [installPath]: createDocument<Schema, ShadcnGeneratePluginOptions>(
      installPath,
      installBody,
      { name: "shadcn:generate" },
      undefined,
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
  themeGeneration: "combined",
  generate: async (spec, config) =>
    generateRegistryJson(spec, options ?? {}, config.cwd)
}));
