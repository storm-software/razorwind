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
 * appendThemeToFilePath("tokens.d.ts", "dark") // "tokens-dark.d.ts"
 */
export function appendThemeToFilePath(filePath: string, theme: string): string {
  const declaration = /(\.d\.[cm]?ts)$/.exec(filePath);
  if (declaration?.[1] && filePath.length > declaration[1].length) {
    return `${filePath.slice(0, -declaration[1].length)}-${slugifyThemeName(theme)}${declaration[1]}`;
  }

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
    const custom = document?.meta?.data?.appendTheme;
    const appendTheme = (
      custom === false
        ? false
        : typeof custom === "function"
          ? custom
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

interface ThemedDocuments {
  theme: string;
  documents: Record<string, GeneratedDocument>;
}

interface ThemedDocumentEntry {
  theme: string;
  key: string;
  path: string;
  document: GeneratedDocument;
}

function documentContent(document: GeneratedDocument): string {
  return JSON.stringify(
    document.chunks?.map(chunk => chunk.content ?? "") ?? []
  );
}

/**
 * Rewrite documents from every split-theme pass, sharing identical opt-in
 * outputs at their original path.
 *
 * A generator opts a document in with
 * `meta.data.shareIdenticalThemeOutput: true`. For each original path, the
 * largest identical-content group is emitted once without a theme suffix;
 * other identical groups are also deduplicated under their first theme.
 */
export function applyThemesToDocuments(
  themedDocuments: ThemedDocuments[]
): Record<string, GeneratedDocument> {
  const entries: ThemedDocumentEntry[] = themedDocuments.flatMap(
    ({ theme, documents }) =>
      Object.entries(documents).map(([key, document]) => ({
        theme,
        key,
        path: document.path || key,
        document
      }))
  );
  const shareableByPath = new Map<string, ThemedDocumentEntry[]>();

  for (const entry of entries) {
    if (entry.document.meta?.data?.shareIdenticalThemeOutput === true) {
      const shareable = shareableByPath.get(entry.path) ?? [];
      shareable.push(entry);
      shareableByPath.set(entry.path, shareable);
    }
  }

  const shared = new Set<ThemedDocumentEntry>();
  const omitted = new Set<ThemedDocumentEntry>();

  for (const shareable of shareableByPath.values()) {
    const contentGroups = new Map<string, ThemedDocumentEntry[]>();

    for (const entry of shareable) {
      const content = documentContent(entry.document);
      const group = contentGroups.get(content) ?? [];
      group.push(entry);
      contentGroups.set(content, group);
    }

    const duplicateGroups = [...contentGroups.values()].filter(
      group => group.length > 1
    );
    const sharedGroup = duplicateGroups.reduce<
      ThemedDocumentEntry[] | undefined
    >(
      (largest, group) =>
        !largest || group.length > largest.length ? group : largest,
      undefined
    );

    if (sharedGroup?.[0]) {
      shared.add(sharedGroup[0]);
    }

    for (const group of duplicateGroups) {
      for (const duplicate of group.slice(1)) {
        omitted.add(duplicate);
      }
    }
  }

  const result: Record<string, GeneratedDocument> = {};

  for (const entry of entries) {
    if (omitted.has(entry)) {
      continue;
    }

    if (shared.has(entry)) {
      result[entry.path] = {
        ...entry.document,
        path: entry.path
      };
      continue;
    }

    Object.assign(
      result,
      applyThemeToDocuments({ [entry.key]: entry.document }, entry.theme)
    );
  }

  return result;
}
