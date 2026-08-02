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

import type { ExecutionContext } from "@power-plant/core";
import { existsSync } from "@stryke/fs/exists";
import { isDirectory } from "@stryke/fs/is-file";
import { readJsonFile } from "@stryke/fs/json";
import { listFiles } from "@stryke/fs/list-files";
import { appendPath } from "@stryke/path/append";
import { findFolderName } from "@stryke/path/file-path-fns";
import { joinPaths } from "@stryke/path/join";
import { titleCase } from "@stryke/string-format/title-case";
import { isSetObject } from "@stryke/type-checks/is-set-object";
import { isSetString } from "@stryke/type-checks/is-set-string";
import { createDefu } from "defu";
import { readdir, readFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import type { Schema } from "../../schema";
import type {
  Component,
  ComponentFile,
  Components
} from "../../schema/components";
import { componentFileSchema, componentSchema } from "../../schema/components";
import type { Config } from "../../types/config";

const componentPartialSchema = componentSchema.partial();

/** Overlay merge: arrays from the left source replace (do not concat). */
const defuOverlay = createDefu((object, key, value) => {
  if (Array.isArray(value)) {
    object[key] = value;
    return true;
  }

  return false;
});

function toAbsolute(cwd: string, target: string): string {
  return isAbsolute(target) ? target : resolve(cwd, target);
}

function normalizeComponentsPaths(
  componentsPath: string | string[] | undefined
): string[] {
  if (Array.isArray(componentsPath)) {
    return componentsPath.filter(isSetString);
  }

  return isSetString(componentsPath) ? [componentsPath] : [];
}

function normalizeRepository(value: unknown): string | undefined {
  if (isSetString(value)) {
    return value;
  }

  if (
    isSetObject(value) &&
    "url" in value &&
    isSetString((value as { url?: unknown }).url)
  ) {
    return (value as { url: string }).url;
  }

  return undefined;
}

function parseComponentFiles(value: unknown): ComponentFile[] | undefined {
  if (!value) {
    return undefined;
  }

  const single = componentFileSchema.safeParse(value);
  if (single.success) {
    return [single.data];
  }

  if (!Array.isArray(value)) {
    return undefined;
  }

  const files: ComponentFile[] = [];
  for (const entry of value) {
    const parsed = componentFileSchema.safeParse(entry);
    if (parsed.success) {
      files.push(parsed.data);
    }
  }

  return files.length > 0 ? files : undefined;
}

function parseComponentPartial(value: unknown): Partial<Component> | undefined {
  if (!isSetObject(value)) {
    return undefined;
  }

  const parsed = componentPartialSchema.safeParse(value);
  if (!parsed.success) {
    return undefined;
  }

  return Object.keys(parsed.data).length > 0 ? parsed.data : undefined;
}

function isComponentFileShape(value: unknown): boolean {
  return isSetObject(value) && "path" in value;
}

/**
 * Map npm `package.json` fields (and optional `razorwind` object) into a
 * partial {@link Component}. `componentFileSchema` values come from
 * `razorwind` when it is a file entry or includes a `files` array.
 */
async function extractFromPackageJson(
  directory: string
): Promise<Partial<Component> | undefined> {
  const packageJsonPath = joinPaths(directory, "package.json");
  if (!existsSync(packageJsonPath)) {
    return undefined;
  }

  let pkg: Record<string, unknown>;
  try {
    pkg = await readJsonFile<Record<string, unknown>>(packageJsonPath);
  } catch {
    return undefined;
  }

  const fromNpm: Partial<Component> = {};

  if (isSetString(pkg.name)) {
    fromNpm.name = pkg.name;
    fromNpm.title = pkg.name;
  }
  if (isSetString(pkg.description)) {
    fromNpm.description = pkg.description;
  }
  if (isSetString(pkg.version)) {
    fromNpm.version = pkg.version;
  }
  if (isSetString(pkg.homepage)) {
    fromNpm.homepage = pkg.homepage;
  }

  const repository = normalizeRepository(pkg.repository);
  if (repository) {
    fromNpm.repository = repository;
  }

  if (isSetObject(pkg.dependencies)) {
    fromNpm.dependencies = pkg.dependencies as Record<string, string>;
  }
  if (isSetObject(pkg.devDependencies)) {
    fromNpm.devDependencies = pkg.devDependencies as Record<string, string>;
  }
  if (Array.isArray(pkg.keywords)) {
    const tags = pkg.keywords.filter(isSetString);
    if (tags.length > 0) {
      fromNpm.tags = tags;
    }
  }

  const razorwind = pkg.razorwind;
  let fromRazorwind: Partial<Component> | undefined;
  let razorwindFiles: ComponentFile[] | undefined;

  if (isComponentFileShape(razorwind)) {
    razorwindFiles = parseComponentFiles(razorwind);
  } else if (isSetObject(razorwind)) {
    fromRazorwind = parseComponentPartial(razorwind);
    if ("files" in razorwind) {
      razorwindFiles = parseComponentFiles(razorwind.files);
    }
  }

  const merged: Partial<Component> = defuOverlay(fromRazorwind ?? {}, fromNpm);

  if (razorwindFiles?.length) {
    merged.files = razorwindFiles;
  }

  return Object.keys(merged).length > 0 ? merged : undefined;
}

/**
 * Read `component.json` as a partial {@link Component}, or as
 * {@link ComponentFile} / file list values when that is the file shape.
 */
async function extractFromComponentJson(
  directory: string
): Promise<Partial<Component> | undefined> {
  const componentJsonPath = joinPaths(directory, "component.json");
  if (!existsSync(componentJsonPath)) {
    return undefined;
  }

  let data: unknown;
  try {
    data = await readJsonFile(componentJsonPath);
  } catch {
    return undefined;
  }

  if (isComponentFileShape(data) || Array.isArray(data)) {
    const files = parseComponentFiles(data);
    if (files) {
      return { files };
    }
  }

  return parseComponentPartial(data);
}

async function loadComponentFromDirectory(
  directory: string
): Promise<Component | undefined> {
  const fromPackageJson = await extractFromPackageJson(directory);
  const fromComponentJson = await extractFromComponentJson(directory);

  if (!fromPackageJson && !fromComponentJson) {
    return undefined;
  }

  // component.json overlays package.json (defuOverlay: first argument wins;
  // arrays replace rather than concat)
  const merged: Partial<Component> = defuOverlay(
    fromComponentJson ?? {},
    fromPackageJson ?? {}
  );

  const name = isSetString(merged.name)
    ? merged.name
    : findFolderName(directory);
  const title = isSetString(merged.title) ? merged.title : titleCase(name);

  const parsed = componentSchema.safeParse({
    ...merged,
    name,
    title
  });
  if (!parsed.success) {
    return undefined;
  }

  return {
    ...parsed.data,
    files: await Promise.all(
      (parsed.data.files ?? (await listFiles(directory)))
        ?.filter(Boolean)
        ?.map(async file =>
          typeof file === "string"
            ? {
                type: "component",
                path: file,
                content: await readFile(appendPath(file, directory), "utf8")
              }
            : {
                ...file,
                content: file.content
                  ? file.content
                  : file.path
                    ? await readFile(appendPath(file.path, directory), "utf8")
                    : undefined,
                path: appendPath(file.path, directory)
              }
        )
    )
  };
}

/**
 * Load components from `componentsPath` directories.
 *
 * For each configured path that is a directory, every direct child directory
 * is inspected for:
 * 1. `package.json` — npm fields and/or a `razorwind` object (including
 *    `componentFileSchema` file entries)
 * 2. `component.json` — component metadata or `componentFileSchema` values
 *
 * When both resolve values, `component.json` overlays `package.json`.
 */
export async function loadComponents(
  context: ExecutionContext<Schema, Config, void>
): Promise<Components> {
  const components: Components = {};
  const paths = normalizeComponentsPaths(context.options.componentsPath);

  for (const componentsPath of paths) {
    const absolute = toAbsolute(context.cwd, componentsPath);
    if (!existsSync(absolute) || !isDirectory(absolute)) {
      continue;
    }

    try {
      const entries = await readdir(absolute, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith(".")) {
          continue;
        }

        const component = await loadComponentFromDirectory(
          joinPaths(absolute, entry.name)
        );
        if (component) {
          components[component.name] = component;
        }
      }
    } catch {
      continue;
    }
  }

  return components;
}
