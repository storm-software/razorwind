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

import type { GeneratedDocument } from "@power-plant/core";
import { format, parse } from "node:path";
import { slugifyThemeName } from "./slugify-theme-name";
import { titleCase } from "./title-case";

/**
 * Append a title-cased theme label to a display title.
 *
 * @example
 * applyThemeToTitle("My Theme", "dark") // "My Theme (Dark)"
 */
export function applyThemeToTitle(
  title: string | undefined,
  theme: string | undefined
): string | undefined {
  if (!title || !theme) {
    return title;
  }

  const suffix = ` (${titleCase(theme)})`;
  if (title.endsWith(suffix)) {
    return title;
  }

  return `${title}${suffix}`;
}

/**
 * Insert `-<theme>` before a file path's extension.
 *
 * @example
 * appendThemeToFilePath("tokens.css", "dark") // "tokens-dark.css"
 */
export function appendThemeToFilePath(filePath: string, theme: string): string {
  const parsed = parse(filePath);
  if (!parsed.name) {
    return filePath;
  }

  return format({
    root: parsed.root,
    dir: parsed.dir,
    ext: parsed.ext,
    name: `${parsed.name}-${slugifyThemeName(theme)}`
  });
}

/**
 * Rewrite document record keys and {@link GeneratedDocument.path} with a
 * theme suffix so per-theme generator passes do not collide.
 */
export function applyThemeToDocuments(
  documents: Record<string, GeneratedDocument>,
  theme: string
): Record<string, GeneratedDocument> {
  const result: Record<string, GeneratedDocument> = {};

  for (const [key, document] of Object.entries(documents)) {
    const appendTheme = (
      document?.meta?.data?.appendTheme &&
      typeof document.meta.data.appendTheme === "function"
        ? document.meta.data.appendTheme
        : appendThemeToFilePath
    ) as false | ((path: string, theme: string) => string);

    const nextKey =
      appendTheme !== false
        ? appendTheme(document.path ? document.path : key, theme)
        : document.path
          ? document.path
          : key;

    result[nextKey] = {
      ...document,
      path: nextKey
    };
  }

  return result;
}
