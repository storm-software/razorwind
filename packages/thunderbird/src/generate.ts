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
  ThunderbirdColorInput,
  ThunderbirdPluginOptions,
  ThunderbirdRgb,
  ThunderbirdTheme
} from "./types";

const PLUGIN_META = { name: "razorwind-thunderbird" } as const;

function document(
  path: string,
  content: string,
  language?: string
): GeneratorFunctionResult<Schema, ThunderbirdPluginOptions>[string] {
  return createDocument<Schema, ThunderbirdPluginOptions>(
    path,
    content,
    PLUGIN_META,
    undefined,
    language
  );
}

function isThunderbirdTheme(value: unknown): value is ThunderbirdTheme {
  return (
    isObject(value) &&
    typeof value.name === "string" &&
    value.name.length > 0 &&
    isObject(value.gecko) &&
    typeof value.gecko.id === "string" &&
    value.gecko.id.length > 0 &&
    isObject(value.colors) &&
    Object.keys(value.colors).length > 0
  );
}

/**
 * Normalize {@link ThunderbirdPluginOptions.mapTheme} results into a theme list.
 */
export function normalizeThemes(
  result:
    ThunderbirdTheme | ThunderbirdTheme[] | Record<string, ThunderbirdTheme>
): ThunderbirdTheme[] {
  if (Array.isArray(result)) {
    return result.map((theme, index) => {
      if (!isThunderbirdTheme(theme)) {
        throw new TypeError(
          `@razorwind/thunderbird mapTheme()[${index}] must be a ThunderbirdTheme with name, gecko.id, and colors`
        );
      }
      return theme;
    });
  }

  if (isThunderbirdTheme(result)) {
    return [result];
  }

  if (!isObject(result)) {
    throw new TypeError(
      "@razorwind/thunderbird mapTheme() must return a theme, theme array, or theme record"
    );
  }

  return Object.entries(result).map(([key, theme]) => {
    if (!isThunderbirdTheme(theme)) {
      throw new TypeError(
        `@razorwind/thunderbird mapTheme()["${key}"] must be a ThunderbirdTheme with name, gecko.id, and colors`
      );
    }
    return {
      ...theme,
      name: theme.name || key
    };
  });
}

function assertOptions(
  options: ThunderbirdPluginOptions
): asserts options is ThunderbirdPluginOptions & {
  mapTheme: NonNullable<ThunderbirdPluginOptions["mapTheme"]>;
} {
  if (!options.mapTheme) {
    throw new Error("@razorwind/thunderbird requires options.mapTheme");
  }
}

function clampRgbChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function parseRgbString(color: string): ThunderbirdRgb | undefined {
  const match = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i.exec(
    color.trim()
  );
  if (!match) {
    return undefined;
  }
  return [
    clampRgbChannel(Number.parseInt(match[1]!, 10)),
    clampRgbChannel(Number.parseInt(match[2]!, 10)),
    clampRgbChannel(Number.parseInt(match[3]!, 10))
  ];
}

/**
 * Convert a CSS hex color or RGB tuple to Thunderbird's `[r, g, b]` tuple form.
 */
export function toThunderbirdRgb(color: ThunderbirdColorInput): ThunderbirdRgb {
  if (Array.isArray(color)) {
    if (color.length !== 3) {
      throw new TypeError(
        `@razorwind/thunderbird RGB tuples must have exactly three channels`
      );
    }
    return [
      clampRgbChannel(color[0]),
      clampRgbChannel(color[1]),
      clampRgbChannel(color[2])
    ];
  }

  const parsedRgb = parseRgbString(color);
  if (parsedRgb) {
    return parsedRgb;
  }

  const trimmed = color.trim();
  const hex = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;
  if (!/^[0-9a-f]{6}$/i.test(hex)) {
    throw new TypeError(
      `@razorwind/thunderbird cannot convert color "${color}" to RGB — use #rrggbb, rgb(r, g, b), or [r, g, b]`
    );
  }

  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16)
  ];
}

/**
 * Format an RGB tuple as a Thunderbird theme color string (`rgb(r, g, b)`).
 *
 * @see https://github.com/dracula/thunderbird/blob/master/manifest.json
 */
export function toThunderbirdRgbString(color: ThunderbirdColorInput): string {
  const [r, g, b] = toThunderbirdRgb(color);

  return `rgb(${r}, ${g}, ${b})`;
}

function normalizeColors(
  colors: ThunderbirdTheme["colors"]
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(colors).map(([key, value]) => [
      key,
      toThunderbirdRgbString(value)
    ])
  );
}

/**
 * Serialize a Thunderbird extension theme `manifest.json`.
 *
 * @see https://github.com/dracula/thunderbird/blob/master/manifest.json
 */
export function renderManifestJson(theme: ThunderbirdTheme): string {
  const payload: Record<string, unknown> = {
    manifest_version: theme.manifestVersion ?? 2,
    name: theme.displayName ?? themeDisplayName(theme),
    description:
      theme.description ??
      `A Thunderbird color theme generated for ${theme.name}.`,
    version: theme.version ?? "1.0.0",
    applications: {
      gecko: {
        id: theme.gecko.id,
        strict_min_version: theme.gecko.strictMinVersion ?? "60.0"
      }
    },
    theme: {
      colors: normalizeColors(theme.colors)
    }
  };

  if (theme.icons && Object.keys(theme.icons).length > 0) {
    payload.icons = theme.icons;
  }

  return `${JSON.stringify(payload, null, 2)}\n`;
}

export { renderInstallMd };

/**
 * Generate Thunderbird extension theme folders (plus INSTALL.md) from a Razorwind schema.
 *
 * @see https://draculatheme.com/thunderbird
 */
export function generateThunderbirdTheme(
  spec: Schema,
  options: ThunderbirdPluginOptions
): GeneratorFunctionResult<Schema, ThunderbirdPluginOptions> {
  assertOptions(options);

  const outputPath = options.outputPath ?? "thunderbird-themes";
  const themes = normalizeThemes(options.mapTheme(spec.tokens));

  if (themes.length === 0) {
    throw new Error("@razorwind/thunderbird mapTheme() returned no themes");
  }

  const documents: GeneratorFunctionResult<Schema, ThunderbirdPluginOptions> =
    {};
  const usedSlugs = new Set<string>();
  const themeMeta: Array<{
    name: string;
    displayName: string;
    folderName: string;
    iconPaths?: string[];
  }> = [];

  for (const theme of themes) {
    let slug = slugifyThemeName(theme.name);
    if (!slug) {
      throw new TypeError(
        `@razorwind/thunderbird theme name "${theme.name}" slugifies to an empty string`
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
