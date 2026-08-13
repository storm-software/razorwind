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
import { readdir } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import type { Schema } from "../../schema";
import type {
  Font,
  FontFile,
  FontFileFormat,
  Fonts,
  LocalFont
} from "../../schema/fonts";
import {
  fontFileSchema,
  fontSchema,
  googleFontSchema,
  localFontSchema
} from "../../schema/fonts";
import type { Config } from "../../types/config";
import {
  FONT_EXTENSIONS,
  FONT_FORMAT_FROM_EXTENSION,
  WEIGHT_FROM_SUFFIX
} from "./constants";

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

function normalizeFontsPaths(
  fontsPath: string | string[] | undefined
): string[] {
  if (Array.isArray(fontsPath)) {
    return fontsPath.filter(isSetString);
  }

  return isSetString(fontsPath) ? [fontsPath] : [];
}

function isFontAssetFile(path: string): boolean {
  const extension = findFileExtensionSafe(path)?.toLowerCase();

  return Boolean(extension && FONT_EXTENSIONS.has(extension));
}

function formatFromExtension(path: string): FontFileFormat | undefined {
  const extension = findFileExtensionSafe(path)?.toLowerCase();

  return extension ? FONT_FORMAT_FROM_EXTENSION[extension] : undefined;
}

async function listFontAssetFiles(directory: string): Promise<string[]> {
  try {
    const entries = await readdir(directory, { withFileTypes: true });

    return entries
      .filter(entry => entry.isFile() && isFontAssetFile(entry.name))
      .map(entry => entry.name);
  } catch {
    return [];
  }
}

const WEIGHT_SUFFIXES = Object.keys(WEIGHT_FROM_SUFFIX).sort(
  (a, b) => b.length - a.length
);

export interface ParsedFontFilename {
  family: string;
  weight?: number;
  style?: FontFile["style"];
  format?: FontFileFormat;
}

/**
 * Infer family / weight / style from a font filename such as
 * `Inter-BoldItalic.woff2`.
 */
export function parseFontFilename(filename: string): ParsedFontFilename {
  const format = formatFromExtension(filename);
  let stem = findFileName(filename, { withExtension: false }) ?? filename;

  let style: FontFile["style"] | undefined;
  const italicMatch = /(?:[-_ ](italic|oblique|it)|Italic|Oblique)$/.exec(stem);
  if (italicMatch) {
    const token = italicMatch[1] ?? italicMatch[0];
    style = token.toLowerCase() === "oblique" ? "oblique" : "italic";
    stem = stem.slice(0, italicMatch.index);
  }

  let weight: number | undefined;
  const dashed = /[-_ ]([^_-]+)$/.exec(stem);
  const suffix = (dashed?.[1] ?? stem).toLowerCase().replaceAll(/[\s_]/g, "");

  for (const name of WEIGHT_SUFFIXES) {
    if (suffix === name || suffix.endsWith(name)) {
      weight = WEIGHT_FROM_SUFFIX[name];
      if (dashed) {
        stem = stem.slice(0, dashed.index);
      } else {
        const index = stem.toLowerCase().lastIndexOf(name);
        stem = index > 0 ? stem.slice(0, index) : stem;
      }
      break;
    }
  }

  const family = stem.replaceAll(/[-_]+$/g, "").trim() || stem;

  return {
    family,
    ...(weight !== undefined ? { weight } : {}),
    ...(style ? { style } : {}),
    ...(format ? { format } : {})
  };
}

function slugifyFamily(family: string): string {
  return family
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");
}

function parseFontFiles(value: unknown): FontFile[] | undefined {
  if (!value) {
    return undefined;
  }

  const single = fontFileSchema.safeParse(value);
  if (single.success) {
    return [single.data];
  }

  if (!Array.isArray(value)) {
    return undefined;
  }

  const files: FontFile[] = [];
  for (const entry of value) {
    const parsed = fontFileSchema.safeParse(entry);
    if (parsed.success) {
      files.push(parsed.data);
    }
  }

  return files.length > 0 ? files : undefined;
}

function inferSource(
  value: Record<string, unknown>,
  files: FontFile[] | undefined
): "google" | "local" | undefined {
  if (value.source === "google" || value.source === "local") {
    return value.source;
  }

  if (files && files.length > 0) {
    return "local";
  }

  if (
    "weights" in value ||
    "subsets" in value ||
    "variable" in value ||
    "styles" in value
  ) {
    return "google";
  }

  if (isSetString(value.family) && !files) {
    return "google";
  }

  return undefined;
}

function parseFontPartial(value: unknown): Partial<Font> | undefined {
  if (!isSetObject(value)) {
    return undefined;
  }

  const files = "files" in value ? parseFontFiles(value.files) : undefined;
  const source = inferSource(value as Record<string, unknown>, files);
  if (!source) {
    const parsed = fontSchema.safeParse(value);

    return parsed.success ? parsed.data : undefined;
  }

  const candidate = {
    ...value,
    source,
    ...(files ? { files } : {})
  };

  const parsed =
    source === "google"
      ? googleFontSchema.partial().safeParse({ ...candidate, source: "google" })
      : localFontSchema.partial().safeParse({ ...candidate, source: "local" });

  if (!parsed.success) {
    return undefined;
  }

  return Object.keys(parsed.data).length > 0 ? parsed.data : undefined;
}

function isFontFileShape(value: unknown): boolean {
  return isSetObject(value) && "path" in value;
}

async function extractFromPackageJson(
  directory: string
): Promise<Partial<Font> | undefined> {
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

  const fromNpm: Partial<Font> = {};

  if (isSetString(pkg.name)) {
    fromNpm.name = pkg.name;
    fromNpm.title = pkg.name;
  }
  if (isSetString(pkg.description)) {
    fromNpm.description = pkg.description;
  }

  if (Array.isArray(pkg.keywords)) {
    const tags = pkg.keywords.filter(isSetString);
    if (tags.length > 0) {
      fromNpm.tags = tags;
    }
  }

  const razorwind = pkg.razorwind;
  let fromRazorwind: Partial<Font> | undefined;

  if (isFontFileShape(razorwind) || Array.isArray(razorwind)) {
    const files = parseFontFiles(razorwind);
    if (files) {
      fromRazorwind = { source: "local", files };
    }
  } else if (isSetObject(razorwind)) {
    fromRazorwind = parseFontPartial(razorwind);
  }

  const merged = defuOverlay(fromRazorwind ?? {}, fromNpm);

  return Object.keys(merged).length > 0 ? (merged as Partial<Font>) : undefined;
}

async function extractFromFontJson(
  directory: string
): Promise<Partial<Font> | undefined> {
  const fontJsonPath = joinPaths(directory, "font.json");
  if (!existsSync(fontJsonPath)) {
    return undefined;
  }

  let data: unknown;
  try {
    data = await readJsonFile(fontJsonPath);
  } catch {
    return undefined;
  }

  if (isFontFileShape(data) || Array.isArray(data)) {
    const files = parseFontFiles(data);
    if (files) {
      return { source: "local", files };
    }
  }

  return parseFontPartial(data);
}

function resolveFontFiles(
  directory: string,
  files: FontFile[] | undefined,
  discovered: string[]
): FontFile[] {
  if (files?.length) {
    return files.map(file => {
      const absolute = appendPath(file.path, directory);

      return {
        ...file,
        path: absolute,
        format: file.format ?? formatFromExtension(file.path)
      };
    });
  }

  return discovered.map(filename => {
    const parsed = parseFontFilename(filename);

    return {
      path: appendPath(filename, directory),
      format: parsed.format,
      ...(parsed.weight !== undefined ? { weight: parsed.weight } : {}),
      ...(parsed.style ? { style: parsed.style } : {})
    };
  });
}

async function loadFontFromDirectory(
  directory: string
): Promise<Font | undefined> {
  const fromPackageJson = await extractFromPackageJson(directory);
  const fromFontJson = await extractFromFontJson(directory);
  const assetFiles = await listFontAssetFiles(directory);

  if (!fromPackageJson && !fromFontJson && assetFiles.length === 0) {
    return undefined;
  }

  const merged = defuOverlay(fromFontJson ?? {}, fromPackageJson ?? {});

  const folderName = findFolderName(directory);
  const name = isSetString(merged.name) ? merged.name : folderName;
  const title = isSetString(merged.title) ? merged.title : titleCase(name);
  const files = resolveFontFiles(
    directory,
    merged.source === "local" ? merged.files : undefined,
    assetFiles
  );

  const source = merged.source ?? (files.length > 0 ? "local" : "google");

  const candidate =
    source === "google"
      ? {
          ...merged,
          source: "google" as const,
          name,
          title,
          family: merged.family ?? title
        }
      : {
          ...merged,
          source: "local" as const,
          name,
          title,
          family: merged.family ?? title,
          files:
            files.length > 0
              ? files
              : merged.source === "local"
                ? merged.files
                : files
        };

  const parsed = fontSchema.safeParse(candidate);

  return parsed.success ? parsed.data : undefined;
}

function upsertLocalFontFile(
  fonts: Fonts,
  family: string,
  file: FontFile
): void {
  const key = slugifyFamily(family) || "font";
  const existing = fonts[key];

  if (existing?.source === "local") {
    const files = [...existing.files];
    const duplicate = files.findIndex(entry => entry.path === file.path);
    if (duplicate >= 0) {
      files[duplicate] = file;
    } else {
      files.push(file);
    }
    fonts[key] = { ...existing, files };
    return;
  }

  if (existing) {
    return;
  }

  fonts[key] = {
    source: "local",
    name: key,
    title: titleCase(family),
    family,
    files: [file]
  } satisfies LocalFont;
}

/**
 * Load fonts from `fontsPath` directories.
 *
 * Supports:
 * 1. Per-font directories with `package.json` / `font.json` metadata
 * 2. Flat font files at the fonts path root, grouped by family prefix
 */
export async function loadFonts(
  context: ExecutionContext<Schema, Config, void>
): Promise<Fonts> {
  const fonts: Fonts = {};
  const paths = normalizeFontsPaths(context.options.fontsPath);

  for (const fontsPath of paths) {
    const absolute = toAbsolute(context.cwd, fontsPath);
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
          const font = await loadFontFromDirectory(entryPath);
          if (font) {
            const existing = fonts[font.name];
            fonts[font.name] = existing
              ? (defuOverlay(font, existing) as Font)
              : font;
          }
          continue;
        }

        if (entry.isFile() && isFontAssetFile(entry.name)) {
          const parsed = parseFontFilename(entry.name);
          upsertLocalFontFile(fonts, parsed.family, {
            path: entryPath,
            format: parsed.format,
            ...(parsed.weight !== undefined ? { weight: parsed.weight } : {}),
            ...(parsed.style ? { style: parsed.style } : {})
          });
        }
      }
    } catch {
      continue;
    }
  }

  return fonts;
}
