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
import type { Icon, IconFile, Icons } from "../../schema/icons";
import { iconFileSchema, iconSchema } from "../../schema/icons";
import type { Config } from "../../types/config";
import { THEME_BASENAME_PATTERN } from "../tokens/constants";

const iconPartialSchema = iconSchema.partial();

const ICON_EXTENSIONS = new Set([
  "svg",
  "png",
  "webp",
  "jpg",
  "jpeg",
  "gif",
  "ico"
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

function normalizeIconsPaths(iconsPath: string | string[] | undefined): string[] {
  if (Array.isArray(iconsPath)) {
    return iconsPath.filter(isSetString);
  }

  return isSetString(iconsPath) ? [iconsPath] : [];
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

function iconTypeFromExtension(
  extension: string
): IconFile["type"] | undefined {
  const normalized = extension.toLowerCase();
  if (ICON_EXTENSIONS.has(normalized)) {
    return normalized as IconFile["type"];
  }

  return undefined;
}

function isIconAssetFile(path: string): boolean {
  const extension = findFileExtensionSafe(path)?.toLowerCase();
  return Boolean(extension && ICON_EXTENSIONS.has(extension));
}

function isThemeDirectoryName(name: string): boolean {
  return THEME_BASENAME_PATTERN.test(name);
}

/** List direct child icon asset filenames under a directory. */
async function listIconAssetFiles(directory: string): Promise<string[]> {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    return entries
      .filter(entry => entry.isFile() && isIconAssetFile(entry.name))
      .map(entry => entry.name);
  } catch {
    return [];
  }
}

function parseIconFiles(value: unknown): IconFile[] | undefined {
  if (!value) {
    return undefined;
  }

  const single = iconFileSchema.safeParse(value);
  if (single.success) {
    return [single.data];
  }

  if (!Array.isArray(value)) {
    return undefined;
  }

  const files: IconFile[] = [];
  for (const entry of value) {
    const parsed = iconFileSchema.safeParse(entry);
    if (parsed.success) {
      files.push(parsed.data);
    }
  }

  return files.length > 0 ? files : undefined;
}

function parseIconPartial(value: unknown): Partial<Icon> | undefined {
  if (!isSetObject(value)) {
    return undefined;
  }

  const parsed = iconPartialSchema.safeParse(value);
  if (!parsed.success) {
    return undefined;
  }

  return Object.keys(parsed.data).length > 0 ? parsed.data : undefined;
}

function isIconFileShape(value: unknown): boolean {
  return isSetObject(value) && "path" in value;
}

async function readIconFile(
  filePath: string,
  directory: string,
  theme?: string
): Promise<IconFile> {
  const absolute = appendPath(filePath, directory);
  const extension = findFileExtensionSafe(filePath) ?? "";
  const type = iconTypeFromExtension(extension) ?? "file";
  const content =
    type === "svg" ? await readFile(absolute, "utf8") : undefined;

  return {
    path: absolute,
    type,
    ...(theme ? { theme } : {}),
    ...(content !== undefined ? { content } : {})
  };
}

/**
 * Map npm `package.json` fields (and optional `razorwind` object) into a
 * partial {@link Icon}.
 */
async function extractFromPackageJson(
  directory: string
): Promise<Partial<Icon> | undefined> {
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

  const fromNpm: Partial<Icon> = {};

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

  if (Array.isArray(pkg.keywords)) {
    const tags = pkg.keywords.filter(isSetString);
    if (tags.length > 0) {
      fromNpm.tags = tags;
    }
  }

  const razorwind = pkg.razorwind;
  let fromRazorwind: Partial<Icon> | undefined;
  let razorwindFiles: IconFile[] | undefined;

  if (isIconFileShape(razorwind)) {
    razorwindFiles = parseIconFiles(razorwind);
  } else if (isSetObject(razorwind)) {
    fromRazorwind = parseIconPartial(razorwind);
    if ("files" in razorwind) {
      razorwindFiles = parseIconFiles(razorwind.files);
    }
  }

  const merged: Partial<Icon> = defuOverlay(fromRazorwind ?? {}, fromNpm);

  if (razorwindFiles?.length) {
    merged.files = razorwindFiles;
  }

  return Object.keys(merged).length > 0 ? merged : undefined;
}

/**
 * Read `icon.json` as a partial {@link Icon}, or as {@link IconFile} / file
 * list values when that is the file shape.
 */
async function extractFromIconJson(
  directory: string
): Promise<Partial<Icon> | undefined> {
  const iconJsonPath = joinPaths(directory, "icon.json");
  if (!existsSync(iconJsonPath)) {
    return undefined;
  }

  let data: unknown;
  try {
    data = await readJsonFile(iconJsonPath);
  } catch {
    return undefined;
  }

  if (isIconFileShape(data) || Array.isArray(data)) {
    const files = parseIconFiles(data);
    if (files) {
      return { files };
    }
  }

  return parseIconPartial(data);
}

async function resolveIconFiles(
  directory: string,
  files: IconFile[] | undefined
): Promise<IconFile[]> {
  if (files?.length) {
    return Promise.all(
      files.map(async file => {
        const absolute = appendPath(file.path, directory);
        const extension = findFileExtensionSafe(file.path) ?? "";
        const type =
          file.type ?? iconTypeFromExtension(extension) ?? ("file" as const);
        const content =
          file.content !== undefined
            ? file.content
            : type === "svg"
              ? await readFile(absolute, "utf8")
              : undefined;

        return {
          ...file,
          type,
          path: absolute,
          ...(content !== undefined ? { content } : {})
        };
      })
    );
  }

  const discovered = await listIconAssetFiles(directory);
  return Promise.all(discovered.map(file => readIconFile(file, directory)));
}

async function loadIconFromDirectory(
  directory: string
): Promise<Icon | undefined> {
  const fromPackageJson = await extractFromPackageJson(directory);
  const fromIconJson = await extractFromIconJson(directory);
  const assetFiles = await listIconAssetFiles(directory);

  if (!fromPackageJson && !fromIconJson && assetFiles.length === 0) {
    return undefined;
  }

  const merged: Partial<Icon> = defuOverlay(
    fromIconJson ?? {},
    fromPackageJson ?? {}
  );

  const name = isSetString(merged.name)
    ? merged.name
    : findFolderName(directory);
  const title = isSetString(merged.title) ? merged.title : titleCase(name);

  const parsed = iconSchema.safeParse({
    ...merged,
    name,
    title
  });
  if (!parsed.success) {
    return undefined;
  }

  return {
    ...parsed.data,
    files: await resolveIconFiles(directory, parsed.data.files)
  };
}

function upsertIconFile(icons: Icons, name: string, file: IconFile): void {
  const existing = icons[name];
  if (!existing) {
    icons[name] = {
      name,
      title: titleCase(name),
      files: [file]
    };
    return;
  }

  const files = [...(existing.files ?? [])];
  const duplicateIndex = files.findIndex(
    entry => entry.path === file.path && entry.theme === file.theme
  );
  if (duplicateIndex >= 0) {
    files[duplicateIndex] = file;
  } else {
    files.push(file);
  }

  icons[name] = {
    ...existing,
    files
  };
}

async function loadIconsFromThemeDirectory(
  directory: string,
  theme: string,
  icons: Icons
): Promise<void> {
  const files = await listIconAssetFiles(directory);
  for (const file of files) {
    const name = findFileName(file, { withExtension: false });
    if (!name) {
      continue;
    }

    upsertIconFile(icons, name, await readIconFile(file, directory, theme));
  }
}

/**
 * Load icons from `iconsPath` directories.
 *
 * Supports:
 * 1. Theme folders (`light` / `dark` / …) containing icon assets
 * 2. Per-icon directories with `package.json` / `icon.json` metadata
 * 3. Flat icon asset files at the icons path root
 */
export async function loadIcons(
  context: ExecutionContext<Schema, Config, void>
): Promise<Icons> {
  const icons: Icons = {};
  const paths = normalizeIconsPaths(context.options.iconsPath);

  for (const iconsPath of paths) {
    const absolute = toAbsolute(context.cwd, iconsPath);
    if (!existsSync(absolute) || !isDirectory(absolute)) {
      continue;
    }

    try {
      const entries = await readdir(absolute, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.name.startsWith(".")) {
          continue;
        }

        const entryPath = joinPaths(absolute, entry.name);

        if (entry.isDirectory()) {
          if (isThemeDirectoryName(entry.name)) {
            await loadIconsFromThemeDirectory(entryPath, entry.name, icons);
            continue;
          }

          const icon = await loadIconFromDirectory(entryPath);
          if (icon) {
            const existing = icons[icon.name];
            icons[icon.name] = existing
              ? defuOverlay(icon, existing)
              : icon;
          }
          continue;
        }

        if (entry.isFile() && isIconAssetFile(entry.name)) {
          const name = findFileName(entry.name, { withExtension: false });
          if (!name) {
            continue;
          }

          upsertIconFile(
            icons,
            name,
            await readIconFile(entry.name, absolute)
          );
        }
      }
    } catch {
      continue;
    }
  }

  return icons;
}
