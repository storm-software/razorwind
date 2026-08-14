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
import { join } from "node:path";
import { renderInstallMd, themeDisplayName } from "./install";
import type {
  ChromeColorInput,
  ChromePluginOptions,
  ChromeRgb,
  ChromeTheme
} from "./types";

const PLUGIN_META = { name: "razorwind-chrome" } as const;

function document(
  path: string,
  content: string,
  language?: string
): GeneratorFunctionResult<Schema, ChromePluginOptions>[string] {
  return createDocument<Schema, ChromePluginOptions>(
    path,
    content,
    PLUGIN_META,
    undefined,
    language
  );
}

function isChromeTheme(value: unknown): value is ChromeTheme {
  return (
    isObject(value) &&
    typeof value.name === "string" &&
    value.name.length > 0 &&
    isObject(value.colors) &&
    Object.keys(value.colors).length > 0
  );
}

/**
 * Normalize {@link ChromePluginOptions.mapTheme} results into a theme list.
 */
export function normalizeThemes(
  result: ChromeTheme | ChromeTheme[] | Record<string, ChromeTheme>
): ChromeTheme[] {
  if (Array.isArray(result)) {
    return result.map((theme, index) => {
      if (!isChromeTheme(theme)) {
        throw new TypeError(
          `@razorwind/chrome mapTheme()[${index}] must be a ChromeTheme with name and colors`
        );
      }
      return theme;
    });
  }

  if (isChromeTheme(result)) {
    return [result];
  }

  if (!isObject(result)) {
    throw new TypeError(
      "@razorwind/chrome mapTheme() must return a theme, theme array, or theme record"
    );
  }

  return Object.entries(result).map(([key, theme]) => {
    if (!isChromeTheme(theme)) {
      throw new TypeError(
        `@razorwind/chrome mapTheme()["${key}"] must be a ChromeTheme with name and colors`
      );
    }
    return {
      ...theme,
      name: theme.name || key
    };
  });
}

function assertOptions(
  options: ChromePluginOptions
): asserts options is ChromePluginOptions & {
  mapTheme: NonNullable<ChromePluginOptions["mapTheme"]>;
} {
  if (!options.mapTheme) {
    throw new Error("@razorwind/chrome requires options.mapTheme");
  }
}

function clampRgbChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

/**
 * Convert a CSS hex color or RGB tuple to Chrome's `[r, g, b]` manifest form.
 *
 * @see https://developer.chrome.com/docs/extensions/develop/ui/themes
 */
export function toChromeRgb(color: ChromeColorInput): ChromeRgb {
  if (Array.isArray(color)) {
    if (color.length !== 3) {
      throw new TypeError(
        `@razorwind/chrome RGB tuples must have exactly three channels`
      );
    }
    return [
      clampRgbChannel(color[0]),
      clampRgbChannel(color[1]),
      clampRgbChannel(color[2])
    ];
  }

  const trimmed = color.trim();
  const hex = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;
  if (!/^[0-9a-f]{6}$/i.test(hex)) {
    throw new TypeError(
      `@razorwind/chrome cannot convert color "${color}" to RGB — use #rrggbb or [r, g, b]`
    );
  }

  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16)
  ];
}

function normalizeColors(
  colors: ChromeTheme["colors"]
): Record<string, ChromeRgb> {
  return Object.fromEntries(
    Object.entries(colors).map(([key, value]) => [key, toChromeRgb(value)])
  );
}

/**
 * Serialize a Chrome extension theme `manifest.json`.
 *
 * @see https://developer.chrome.com/docs/extensions/develop/ui/themes
 * @see https://github.com/dracula/google-chrome/blob/master/manifest.json
 */
export function renderManifestJson(theme: ChromeTheme): string {
  const payload: Record<string, unknown> = {
    manifest_version: theme.manifestVersion ?? 3,
    name: themeDisplayName(theme),
    description:
      theme.description ?? `A browser color theme generated for ${theme.name}.`,
    version: theme.version ?? "1.0.0",
    theme: {
      colors: normalizeColors(theme.colors)
    }
  };

  if (theme.icons && Object.keys(theme.icons).length > 0) {
    payload.icons = theme.icons;
  }

  const themeBlock = payload.theme as Record<string, unknown>;

  if (theme.images && Object.keys(theme.images).length > 0) {
    themeBlock.images = theme.images;
  }
  if (theme.tints && Object.keys(theme.tints).length > 0) {
    themeBlock.tints = theme.tints;
  }
  if (theme.properties && Object.keys(theme.properties).length > 0) {
    themeBlock.properties = theme.properties;
  }

  return `${JSON.stringify(payload, null, 2)}\n`;
}

export { renderInstallMd };

/**
 * Generate Chrome extension theme folders (plus INSTALL.md) from a Razorwind schema.
 *
 * @see https://developer.chrome.com/docs/extensions/develop/ui/themes
 */
export function generateChromeTheme(
  spec: Schema,
  options: ChromePluginOptions
): GeneratorFunctionResult<Schema, ChromePluginOptions> {
  assertOptions(options);

  const outputPath = options.outputPath ?? "chrome-themes";
  const themes = normalizeThemes(options.mapTheme(spec.tokens));

  if (themes.length === 0) {
    throw new Error("@razorwind/chrome mapTheme() returned no themes");
  }

  const documents: GeneratorFunctionResult<Schema, ChromePluginOptions> = {};
  const usedSlugs = new Set<string>();
  const themeMeta: Array<{
    name: string;
    displayName: string;
    folderName: string;
    imagePaths?: string[];
    iconPaths?: string[];
  }> = [];

  for (const theme of themes) {
    let slug = slugifyThemeName(theme.name);
    if (!slug) {
      throw new TypeError(
        `@razorwind/chrome theme name "${theme.name}" slugifies to an empty string`
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

    const manifestPath = join(outputPath, slug, "manifest.json");
    documents[manifestPath] = document(
      manifestPath,
      renderManifestJson(theme),
      "json"
    );
    themeMeta.push({
      name: theme.name,
      displayName: themeDisplayName(theme),
      folderName: slug,
      imagePaths: theme.images ? Object.values(theme.images) : undefined,
      iconPaths: theme.icons ? Object.values(theme.icons) : undefined
    });
  }

  const installBody =
    options.installGuide ??
    renderInstallMd({
      themes: themeMeta,
      title: resolveSchemaIdentity(spec).title
    });
  const installPath = join(outputPath, "INSTALL.md");
  documents[installPath] = document(installPath, installBody, "markdown");

  return documents;
}
