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
import { titleCase } from "@stryke/string-format/title-case";
import { isSetObject } from "@stryke/type-checks/is-set-object";
import { isSetString } from "@stryke/type-checks/is-set-string";
import { readdir, readFile } from "node:fs/promises";
import { basename, extname, isAbsolute, join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import type { Schema } from "../../schema";
import type { Guideline, Guidelines } from "../../schema/guidelines";
import type { Config } from "../../types/config";

const GUIDELINE_EXTENSIONS = new Set([".md", ".mdx", ".markdown"]);

const FRONT_MATTER_PATTERN = /^﻿?---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

function isGuidelineFile(name: string): boolean {
  return GUIDELINE_EXTENSIONS.has(extname(name).toLowerCase());
}

/**
 * Parse a markdown guideline. Frontmatter `name` / `version` populate the
 * top-level fields; every other frontmatter attribute is kept in `data`.
 *
 * @param id - The guideline key, used for the title-cased fallback name.
 * @param source - The raw markdown file contents.
 */
export function parseGuideline(id: string, source: string): Guideline {
  const match = FRONT_MATTER_PATTERN.exec(source);

  let frontMatter: Record<string, unknown> = {};
  if (match?.[1]) {
    const parsed: unknown = parseYaml(match[1]);
    if (isSetObject(parsed)) {
      frontMatter = parsed as Record<string, unknown>;
    }
  }

  const { name, version, content: _content, ...data } = frontMatter;

  return {
    name: isSetString(name) ? name : titleCase(id),
    ...(version != null && version !== ""
      ? { version: String(version) }
      : {}),
    content: (match ? source.slice(match[0].length) : source).trim(),
    ...(Object.keys(data).length > 0 ? { data } : {})
  };
}

async function readGuideline(path: string): Promise<[string, Guideline]> {
  const id = basename(path, extname(path));
  try {
    return [id, parseGuideline(id, await readFile(path, "utf8"))];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse guideline "${path}": ${message}`);
  }
}

async function loadGuidelinesDirectory(
  directory: string
): Promise<Guidelines> {
  const guidelines: Guidelines = {};
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries.toSorted((a, b) =>
    a.name.localeCompare(b.name)
  )) {
    if (entry.name.startsWith(".")) {
      continue;
    }

    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      const nested = await loadGuidelinesDirectory(entryPath);
      if (Object.keys(nested).length > 0) {
        guidelines[entry.name] = nested;
      }
    } else if (entry.isFile() && isGuidelineFile(entry.name)) {
      const [id, guideline] = await readGuideline(entryPath);
      guidelines[id] = guideline;
    }
  }

  return guidelines;
}

/**
 * Load guidelines from `guidelinesPath` markdown files and directories.
 *
 * Each markdown file becomes a guideline keyed by its file name (without
 * extension). Sub-directories become nested guideline groups keyed by the
 * directory name.
 */
export async function loadGuidelines(
  context: ExecutionContext<Schema, Config, void>
): Promise<Guidelines> {
  const { guidelinesPath } = context.options;
  const paths = (
    Array.isArray(guidelinesPath) ? guidelinesPath : [guidelinesPath]
  ).filter(isSetString);

  const guidelines: Guidelines = {};
  for (const path of paths) {
    const absolute = isAbsolute(path) ? path : resolve(context.cwd, path);
    if (!existsSync(absolute)) {
      continue;
    }

    if (isDirectory(absolute)) {
      Object.assign(guidelines, await loadGuidelinesDirectory(absolute));
    } else if (isGuidelineFile(absolute)) {
      const [id, guideline] = await readGuideline(absolute);
      guidelines[id] = guideline;
    }
  }

  return guidelines;
}
