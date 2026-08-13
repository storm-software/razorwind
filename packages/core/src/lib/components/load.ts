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
import {
  findFileExtensionSafe,
  findFileName,
  findFolderName
} from "@stryke/path/file-path-fns";
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
  Components,
  ComponentUsage
} from "../../schema/components";
import {
  componentFileSchema,
  componentSchema,
  componentUsageSchema
} from "../../schema/components";
import type { Config } from "../../types/config";
import { normalizeUrl } from "../meta/normalize-url";

const componentPartialSchema = componentSchema.partial();

const USAGE_LANGUAGES = new Set([
  "tsx",
  "jsx",
  "ts",
  "js",
  "mdx",
  "md",
  "css",
  "html",
  "txt"
]);

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

function usageLanguageFromExtension(
  extension: string
): ComponentUsage["language"] | undefined {
  const normalized = extension.toLowerCase();
  if (USAGE_LANGUAGES.has(normalized)) {
    return normalized as ComponentUsage["language"];
  }

  return undefined;
}

function isUsageSourceFile(path: string): boolean {
  const extension = findFileExtensionSafe(path)?.toLowerCase();

  return Boolean(extension && USAGE_LANGUAGES.has(extension));
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

function parseComponentUsage(value: unknown): ComponentUsage[] | undefined {
  if (!value) {
    return undefined;
  }

  const single = componentUsageSchema.safeParse(value);
  if (single.success) {
    return [single.data];
  }

  if (!Array.isArray(value)) {
    return undefined;
  }

  const usage: ComponentUsage[] = [];
  for (const entry of value) {
    if (isSetString(entry)) {
      const name = findFileName(entry, { withExtension: false }) || entry;
      const parsed = componentUsageSchema.safeParse({ name, path: entry });
      if (parsed.success) {
        usage.push(parsed.data);
      }
      continue;
    }

    const parsed = componentUsageSchema.safeParse(entry);
    if (parsed.success) {
      usage.push(parsed.data);
    }
  }

  return usage.length > 0 ? usage : undefined;
}

function parseComponentPartial(value: unknown): Partial<Component> | undefined {
  if (!isSetObject(value)) {
    return undefined;
  }

  // Parse `files` / `usage` separately so string shorthand and file-shaped
  // entries do not fail the partial component parse.
  const {
    files: _files,
    usage: _usage,
    ...rest
  } = value as Record<string, unknown>;
  const parsed = componentPartialSchema.safeParse(rest);
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

  const repository = normalizeUrl(pkg.repository);
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
  let razorwindUsage: ComponentUsage[] | undefined;

  if (isComponentFileShape(razorwind)) {
    razorwindFiles = parseComponentFiles(razorwind);
  } else if (isSetObject(razorwind)) {
    fromRazorwind = parseComponentPartial(razorwind);
    if ("files" in razorwind) {
      razorwindFiles = parseComponentFiles(razorwind.files);
    }
    if ("usage" in razorwind) {
      razorwindUsage = parseComponentUsage(razorwind.usage);
    }
  }

  const merged: Partial<Component> = defuOverlay(fromRazorwind ?? {}, fromNpm);

  if (razorwindFiles?.length) {
    merged.files = razorwindFiles;
  }
  if (razorwindUsage?.length) {
    merged.usage = razorwindUsage;
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

  if (!isSetObject(data)) {
    return undefined;
  }

  const partial = parseComponentPartial(data) ?? {};
  const files = "files" in data ? parseComponentFiles(data.files) : undefined;
  const usage = "usage" in data ? parseComponentUsage(data.usage) : undefined;

  if (files?.length) {
    partial.files = files;
  }
  if (usage?.length) {
    partial.usage = usage;
  }

  return Object.keys(partial).length > 0 ? partial : undefined;
}

/** List direct child usage source filenames under a component `usage/` folder. */
async function listUsageSourceFiles(directory: string): Promise<string[]> {
  try {
    const entries = await readdir(directory, { withFileTypes: true });

    return entries
      .filter(
        entry =>
          entry.isFile() &&
          !entry.name.startsWith(".") &&
          isUsageSourceFile(entry.name)
      )
      .map(entry => entry.name)
      .toSorted((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

async function resolveComponentUsage(
  directory: string,
  usage: ComponentUsage[] | undefined
): Promise<ComponentUsage[] | undefined> {
  if (usage?.length) {
    return Promise.all(
      usage.map(async entry => {
        const absolute = appendPath(entry.path, directory);
        const extension = findFileExtensionSafe(entry.path) ?? "";
        const language =
          entry.language ?? usageLanguageFromExtension(extension);
        const name =
          entry.name ||
          findFileName(entry.path, { withExtension: false }) ||
          entry.path;
        const content =
          entry.content ??
          (existsSync(absolute) ? await readFile(absolute, "utf8") : undefined);

        return {
          ...entry,
          name,
          path: absolute,
          ...(language ? { language } : {}),
          ...(content !== undefined ? { content } : {})
        };
      })
    );
  }

  const usageDirectory = joinPaths(directory, "usage");
  if (!existsSync(usageDirectory) || !isDirectory(usageDirectory)) {
    return undefined;
  }

  const discovered = await listUsageSourceFiles(usageDirectory);
  if (discovered.length === 0) {
    return undefined;
  }

  return Promise.all(
    discovered.map(async file => {
      const absolute = joinPaths(usageDirectory, file);
      const extension = findFileExtensionSafe(file) ?? "";
      const language = usageLanguageFromExtension(extension);
      const name = findFileName(file, { withExtension: false }) || file;

      return {
        name,
        title: titleCase(name),
        path: absolute,
        content: await readFile(absolute, "utf8"),
        ...(language ? { language } : {})
      } satisfies ComponentUsage;
    })
  );
}

async function resolveComponentFiles(
  directory: string,
  files: ComponentFile[] | string[] | undefined
): Promise<ComponentFile[]> {
  const sources =
    files ??
    (await listFiles(directory)).filter(file => {
      const base = findFileName(file, { withExtension: false });

      // Skip usage assets; they are loaded separately under `usage`
      return base === "index";
    });

  return Promise.all(
    sources.filter(Boolean).map(async file =>
      typeof file === "string"
        ? {
            type: /[tj]sx$/.test(findFileExtensionSafe(file))
              ? ("component" as const)
              : ("file" as const),
            path: file,
            content: await readFile(appendPath(file, directory), "utf8")
          }
        : {
            type: /[tj]sx$/.test(findFileExtensionSafe(file.path))
              ? ("component" as const)
              : ("file" as const),
            ...file,
            content: file.content
              ? file.content
              : file.path
                ? await readFile(appendPath(file.path, directory), "utf8")
                : undefined,
            path: appendPath(file.path, directory)
          }
    )
  );
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

  const usage = await resolveComponentUsage(directory, parsed.data.usage);

  return {
    ...parsed.data,
    files: await resolveComponentFiles(directory, parsed.data.files),
    ...(usage?.length ? { usage } : {})
  };
}

/**
 * Load components from `componentsPath` directories.
 *
 * For each configured path that is a directory, every direct child directory is inspected for:
 * 1. `package.json` — npm fields and/or a `razorwind` object (including `componentFileSchema` file entries)
 * 2. `component.json` — component metadata or `componentFileSchema` values
 * 3. `usage/` — optional example source files (also declareable via `usage` in metadata)
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
