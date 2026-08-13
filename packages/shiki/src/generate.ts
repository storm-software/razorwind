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
import type { Schema } from "@razorwind/core/schema";
import {
  createDocument,
  isObject,
  resolveSchemaIdentity,
  slugifyThemeName
} from "@razorwind/core/utils";
import { joinPaths } from "@stryke/path/join";
import { renderInstallMd, themeDisplayName } from "./install";
import type { ShikiPluginOptions, ShikiTheme } from "./types";

const PLUGIN_META = { name: "razorwind-shiki" } as const;

const getCreateDocument =
  (outputPath: string) =>
  (
    file: string,
    content: string,
    language?: string
  ): GeneratorFunctionResult<Schema, ShikiPluginOptions>[string] => {
    return createDocument<Schema, ShikiPluginOptions>(
      joinPaths(outputPath, file),
      content,
      PLUGIN_META,
      (_: string, theme: string) => {
        return joinPaths(outputPath, slugifyThemeName(theme), file);
      },
      language
    );
  };

function isShikiTheme(value: unknown): value is ShikiTheme {
  return (
    isObject(value) && typeof value.name === "string" && value.name.length > 0
  );
}

/**
 * Normalize {@link ShikiPluginOptions.mapTheme} results into a theme list.
 */
export function normalizeThemes(
  result: ShikiTheme | ShikiTheme[] | Record<string, ShikiTheme>
): ShikiTheme[] {
  if (Array.isArray(result)) {
    return result.map((theme, index) => {
      if (!isShikiTheme(theme)) {
        throw new TypeError(
          `@razorwind/shiki mapTheme()[${index}] must be a ShikiTheme with name`
        );
      }
      return theme;
    });
  }

  if (isShikiTheme(result)) {
    return [result];
  }

  if (!isObject(result)) {
    throw new TypeError(
      "@razorwind/shiki mapTheme() must return a theme, theme array, or theme record"
    );
  }

  return Object.entries(result).map(([key, theme]) => {
    if (!isShikiTheme(theme)) {
      throw new TypeError(
        `@razorwind/shiki mapTheme()["${key}"] must be a ShikiTheme with name`
      );
    }
    return {
      ...theme,
      name: theme.name || key
    };
  });
}

function assertOptions(
  options: ShikiPluginOptions
): asserts options is ShikiPluginOptions & {
  mapTheme: NonNullable<ShikiPluginOptions["mapTheme"]>;
} {
  if (!options.mapTheme) {
    throw new Error("@razorwind/shiki requires options.mapTheme");
  }
}

/**
 * Serialize a Shiki / TextMate theme document for `*.json`.
 *
 * @see https://shiki.style/guide/load-theme
 */
export function renderThemeJson(theme: ShikiTheme): string {
  const settings = theme.settings ?? theme.tokenColors ?? [];

  const payload: Record<string, unknown> = {
    name: theme.name,
    settings
  };

  if (theme.displayName) {
    payload.displayName = theme.displayName;
  }
  if (theme.type) {
    payload.type = theme.type;
  }
  if (theme.fg !== undefined) {
    payload.fg = theme.fg;
  }
  if (theme.bg !== undefined) {
    payload.bg = theme.bg;
  }
  if (theme.colors) {
    payload.colors = theme.colors;
  }
  // Preserve explicit tokenColors when caller set both (or only tokenColors).
  if (theme.tokenColors && theme.settings) {
    payload.tokenColors = theme.tokenColors;
  }
  if (theme.colorReplacements) {
    payload.colorReplacements = theme.colorReplacements;
  }
  if (theme.semanticHighlighting !== undefined) {
    payload.semanticHighlighting = theme.semanticHighlighting;
  }
  if (theme.semanticTokenColors) {
    payload.semanticTokenColors = theme.semanticTokenColors;
  }

  return `${JSON.stringify(payload, null, 2)}\n`;
}

export { renderInstallMd };

/**
 * Generate Shiki theme JSON files from a Razorwind schema.
 *
 * Output is loadable with `createHighlighter({ themes: [...] })` or
 * `highlighter.loadTheme(JSON.parse(...))`.
 *
 * @see https://shiki.style/guide/load-theme
 */
export function generateShikiTheme(
  spec: Schema,
  options: ShikiPluginOptions
): GeneratorFunctionResult<Schema, ShikiPluginOptions> {
  assertOptions(options);

  const outputPath = options.outputPath ?? "shiki-themes";
  const themes = normalizeThemes(options.mapTheme(spec.tokens));

  if (themes.length === 0) {
    throw new Error("@razorwind/shiki mapTheme() returned no themes");
  }

  const createDoc = getCreateDocument(outputPath);

  const documents: GeneratorFunctionResult<Schema, ShikiPluginOptions> = {};
  const usedSlugs = new Set<string>();
  const themeMeta: Array<{
    name: string;
    displayName: string;
    fileName: string;
  }> = [];

  for (const theme of themes) {
    let fileName = `${slugifyThemeName(theme.name)}.json`;
    if (usedSlugs.has(fileName)) {
      let suffix = 2;
      while (usedSlugs.has(`${slugifyThemeName(theme.name)}-${suffix}.json`)) {
        suffix += 1;
      }
      fileName = `${slugifyThemeName(theme.name)}-${suffix}.json`;
    }
    usedSlugs.add(fileName);

    documents[joinPaths(outputPath, fileName)] = createDoc(
      fileName,
      renderThemeJson(theme),
      "json"
    );
    themeMeta.push({
      name: theme.name,
      displayName: themeDisplayName(theme),
      fileName
    });
  }

  const installPath = "INSTALL.md";
  documents[joinPaths(outputPath, installPath)] = createDoc(
    installPath,
    options.installGuide ??
      renderInstallMd({
        themes: themeMeta,
        title: resolveSchemaIdentity(spec).title
      }),
    "markdown"
  );

  return documents;
}
