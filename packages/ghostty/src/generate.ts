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
import { createDocument, isObject } from "@razorwind/core/utils";
import { join } from "node:path";
import { renderInstallMd, themeDisplayName } from "./install";
import type {
  GhosttyPalette,
  GhosttyPaletteIndex,
  GhosttyPluginOptions,
  GhosttyTheme
} from "./types";

const PLUGIN_META = { name: "razorwind-ghostty" } as const;

const PALETTE_INDICES: GhosttyPaletteIndex[] = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15
];

function document(
  path: string,
  content: string,
  language?: string
): GeneratorFunctionResult<Schema, GhosttyPluginOptions>[string] {
  return createDocument<Schema, GhosttyPluginOptions>(
    path,
    content,
    PLUGIN_META,
    language
  );
}

function slugifyThemeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");
}

function isGhosttyTheme(value: unknown): value is GhosttyTheme {
  return (
    isObject(value) && typeof value.name === "string" && value.name.length > 0
  );
}

/**
 * Normalize {@link GhosttyPluginOptions.mapTheme} results into a theme list.
 */
export function normalizeThemes(
  result: GhosttyTheme | GhosttyTheme[] | Record<string, GhosttyTheme>
): GhosttyTheme[] {
  if (Array.isArray(result)) {
    return result.map((theme, index) => {
      if (!isGhosttyTheme(theme)) {
        throw new TypeError(
          `@razorwind/ghostty mapTheme()[${index}] must be a GhosttyTheme with name`
        );
      }
      return theme;
    });
  }

  if (isGhosttyTheme(result)) {
    return [result];
  }

  if (!isObject(result)) {
    throw new TypeError(
      "@razorwind/ghostty mapTheme() must return a theme, theme array, or theme record"
    );
  }

  return Object.entries(result).map(([key, theme]) => {
    if (!isGhosttyTheme(theme)) {
      throw new TypeError(
        `@razorwind/ghostty mapTheme()["${key}"] must be a GhosttyTheme with name`
      );
    }
    return {
      ...theme,
      name: theme.name || key
    };
  });
}

function assertOptions(
  options: GhosttyPluginOptions
): asserts options is GhosttyPluginOptions & {
  mapTheme: NonNullable<GhosttyPluginOptions["mapTheme"]>;
} {
  if (!options.mapTheme) {
    throw new Error("@razorwind/ghostty requires options.mapTheme");
  }
}

/**
 * Normalize a color for Ghostty config (`#rrggbb` preferred).
 */
export function toGhosttyColor(color: string): string {
  const trimmed = color.trim();
  if (trimmed.startsWith("#")) {
    return trimmed.toLowerCase();
  }
  if (/^[0-9a-fA-F]{6}$/.test(trimmed)) {
    return `#${trimmed.toLowerCase()}`;
  }
  return trimmed;
}

function resolvePaletteEntries(
  palette?: GhosttyPalette
): Array<[GhosttyPaletteIndex, string]> {
  if (!palette) {
    return [];
  }

  if (Array.isArray(palette)) {
    return palette.flatMap((color, index) => {
      if (color === undefined || color === "") {
        return [];
      }
      if (index > 15) {
        return [];
      }
      return [[index as GhosttyPaletteIndex, toGhosttyColor(color)]];
    });
  }

  return PALETTE_INDICES.flatMap(index => {
    const color = palette[index];
    if (color === undefined || color === "") {
      return [];
    }
    return [[index, toGhosttyColor(color)]];
  });
}

function appendConfigLine(lines: string[], key: string, value: string): void {
  lines.push(`${key} = ${value}`);
}

function appendConfigEntries(
  lines: string[],
  config?: Record<string, string | string[]>
): void {
  if (!config) {
    return;
  }

  for (const [key, value] of Object.entries(config)) {
    if (key === "theme" || key === "config-file") {
      throw new TypeError(
        `@razorwind/ghostty theme config cannot set "${key}" — use GhosttyTheme.name / user config instead`
      );
    }

    if (Array.isArray(value)) {
      for (const entry of value) {
        appendConfigLine(lines, key, entry);
      }
      continue;
    }

    appendConfigLine(lines, key, value);
  }
}

/**
 * Serialize a Ghostty theme config file.
 *
 * Format matches [Dracula for Ghostty](https://draculatheme.com/ghostty) and
 * Ghostty's theme documentation (`palette`, `background`, `foreground`, …).
 *
 * @see https://ghostty.org/docs/features/theme
 */
export function renderGhosttyTheme(theme: GhosttyTheme): string {
  const label = themeDisplayName(theme);
  const lines: string[] = [
    `# ${label} — generated by @razorwind/ghostty`,
    "#",
    "# Ghostty theme. Install: https://draculatheme.com/ghostty",
    "# Docs: https://ghostty.org/docs/features/theme",
    "#"
  ];

  for (const [index, color] of resolvePaletteEntries(theme.palette)) {
    appendConfigLine(lines, "palette", `${index}=${color}`);
  }

  if (theme.background) {
    appendConfigLine(lines, "background", toGhosttyColor(theme.background));
  }
  if (theme.foreground) {
    appendConfigLine(lines, "foreground", toGhosttyColor(theme.foreground));
  }
  if (theme.cursorColor) {
    appendConfigLine(lines, "cursor-color", toGhosttyColor(theme.cursorColor));
  }
  if (theme.cursorText) {
    appendConfigLine(lines, "cursor-text", toGhosttyColor(theme.cursorText));
  }
  if (theme.selectionForeground) {
    appendConfigLine(
      lines,
      "selection-foreground",
      toGhosttyColor(theme.selectionForeground)
    );
  }
  if (theme.selectionBackground) {
    appendConfigLine(
      lines,
      "selection-background",
      toGhosttyColor(theme.selectionBackground)
    );
  }

  appendConfigEntries(lines, theme.config);

  return `${lines.join("\n")}\n`;
}

export { renderInstallMd };

/**
 * Generate Ghostty theme files (plus INSTALL.md) from a Razorwind schema.
 *
 * @see https://draculatheme.com/ghostty
 */
export function generateGhosttyTheme(
  spec: Schema,
  options: GhosttyPluginOptions
): GeneratorFunctionResult<Schema, GhosttyPluginOptions> {
  assertOptions(options);

  const outputPath = options.outputPath ?? "ghostty-themes";
  const themes = normalizeThemes(options.mapTheme(spec.tokens));

  if (themes.length === 0) {
    throw new Error("@razorwind/ghostty mapTheme() returned no themes");
  }

  const documents: GeneratorFunctionResult<Schema, GhosttyPluginOptions> = {};
  const usedSlugs = new Set<string>();
  const themeMeta: Array<{
    name: string;
    displayName: string;
    fileName: string;
  }> = [];

  for (const theme of themes) {
    let slug = slugifyThemeName(theme.name);
    if (!slug) {
      throw new TypeError(
        `@razorwind/ghostty theme name "${theme.name}" slugifies to an empty string`
      );
    }
    if (usedSlugs.has(slug)) {
      let suffix = 2;
      while (usedSlugs.has(`${slugifyThemeName(theme.name)}-${suffix}`)) {
        suffix += 1;
      }
      slug = `${slugifyThemeName(theme.name)}-${suffix}`;
    }
    usedSlugs.add(slug);

    const fileName = slug;
    const themePath = join(outputPath, fileName);
    documents[themePath] = document(
      themePath,
      renderGhosttyTheme({ ...theme, name: slug }),
      "ini"
    );
    themeMeta.push({
      name: slug,
      displayName: themeDisplayName(theme),
      fileName
    });
  }

  const installBody =
    options.installGuide ?? renderInstallMd({ themes: themeMeta });
  const installPath = join(outputPath, "INSTALL.md");
  documents[installPath] = document(installPath, installBody, "markdown");

  return documents;
}
