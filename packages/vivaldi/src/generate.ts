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
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { renderInstallMd, themeDisplayName } from "./install";
import type { VivaldiPluginOptions, VivaldiTheme } from "./types";

const PLUGIN_META = { name: "razorwind-vivaldi" } as const;

function document(
  path: string,
  content: string,
  language?: string
): GeneratorFunctionResult<Schema, VivaldiPluginOptions>[string] {
  return createDocument<Schema, VivaldiPluginOptions>(
    path,
    content,
    PLUGIN_META,
    undefined,
    language
  );
}

function isVivaldiTheme(value: unknown): value is VivaldiTheme {
  return (
    isObject(value) &&
    typeof value.name === "string" &&
    value.name.length > 0 &&
    typeof value.colorBg === "string" &&
    typeof value.colorFg === "string"
  );
}

/**
 * Normalize {@link VivaldiPluginOptions.mapTheme} results into a theme list.
 */
export function normalizeThemes(
  result: VivaldiTheme | VivaldiTheme[] | Record<string, VivaldiTheme>
): VivaldiTheme[] {
  if (Array.isArray(result)) {
    return result.map((theme, index) => {
      if (!isVivaldiTheme(theme)) {
        throw new TypeError(
          `@razorwind/vivaldi mapTheme()[${index}] must be a VivaldiTheme with name, colorBg, and colorFg`
        );
      }
      return theme;
    });
  }

  if (isVivaldiTheme(result)) {
    return [result];
  }

  if (!isObject(result)) {
    throw new TypeError(
      "@razorwind/vivaldi mapTheme() must return a theme, theme array, or theme record"
    );
  }

  return Object.entries(result).map(([key, theme]) => {
    if (!isVivaldiTheme(theme)) {
      throw new TypeError(
        `@razorwind/vivaldi mapTheme()["${key}"] must be a VivaldiTheme with name, colorBg, and colorFg`
      );
    }
    return {
      ...theme,
      name: theme.name || key
    };
  });
}

function assertOptions(
  options: VivaldiPluginOptions
): asserts options is VivaldiPluginOptions & {
  mapTheme: NonNullable<VivaldiPluginOptions["mapTheme"]>;
} {
  if (!options.mapTheme) {
    throw new Error("@razorwind/vivaldi requires options.mapTheme");
  }
}

/**
 * Normalize a color for Vivaldi settings (`#rrggbb` preferred).
 */
export function toVivaldiColor(color: string): string {
  const trimmed = color.trim();
  if (trimmed.startsWith("#")) {
    return trimmed.toLowerCase();
  }
  if (/^[0-9a-f]{6}$/i.test(trimmed)) {
    return `#${trimmed.toLowerCase()}`;
  }
  return trimmed;
}

/**
 * Serialize a Vivaldi `settings.json` theme document.
 *
 * Format matches exported themes such as
 * [Dracula for Vivaldi](https://draculatheme.com/vivaldi).
 *
 * @see https://help.vivaldi.com/desktop/appearance-customization/shareable-vivaldi-themes/
 */
export function renderSettingsJson(theme: VivaldiTheme): string {
  const accentBg = toVivaldiColor(theme.colorAccentBg ?? theme.colorBg);
  const payload: Record<string, unknown> = {
    accentFromPage: theme.accentFromPage ?? false,
    accentOnWindow: theme.accentOnWindow ?? false,
    accentSaturationLimit: theme.accentSaturationLimit ?? 1,
    alpha: theme.alpha ?? 0.87,
    blur: theme.blur ?? 10,
    colorAccentBg: accentBg,
    colorBg: toVivaldiColor(theme.colorBg),
    colorFg: toVivaldiColor(theme.colorFg),
    colorHighlightBg: toVivaldiColor(
      theme.colorHighlightBg ?? theme.colorAccentBg ?? theme.colorBg
    ),
    colorWindowBg: toVivaldiColor(
      theme.colorWindowBg ?? theme.colorAccentBg ?? theme.colorBg
    ),
    contrast: theme.contrast ?? 5,
    dimBlurred: theme.dimBlurred ?? true,
    engineVersion: theme.engineVersion ?? 1,
    id: theme.id ?? randomUUID(),
    name: themeDisplayName(theme),
    preferSystemAccent: theme.preferSystemAccent ?? false,
    radius: theme.radius ?? 9,
    simpleScrollbar: theme.simpleScrollbar ?? false,
    transparencyTabBar: theme.transparencyTabBar ?? true,
    transparencyTabs: theme.transparencyTabs ?? false,
    version: theme.version ?? 3
  };

  if (theme.backgroundImage) {
    payload.backgroundImage = theme.backgroundImage;
    payload.backgroundPosition = theme.backgroundPosition ?? "stretch";
  }

  if (theme.url) {
    payload.url = theme.url;
  }

  return `${JSON.stringify(payload, null, 3)}\n`;
}

export { renderInstallMd };

/**
 * Generate Vivaldi theme folders (plus INSTALL.md) from a Razorwind schema.
 *
 * @see https://draculatheme.com/vivaldi
 */
export function generateVivaldiTheme(
  spec: Schema,
  options: VivaldiPluginOptions
): GeneratorFunctionResult<Schema, VivaldiPluginOptions> {
  assertOptions(options);

  const outputPath = options.outputPath ?? "vivaldi-themes";
  const themes = normalizeThemes(options.mapTheme(spec.tokens));

  if (themes.length === 0) {
    throw new Error("@razorwind/vivaldi mapTheme() returned no themes");
  }

  const documents: GeneratorFunctionResult<Schema, VivaldiPluginOptions> = {};
  const usedSlugs = new Set<string>();
  const themeMeta: Array<{
    name: string;
    displayName: string;
    folderName: string;
    backgroundImage?: string;
  }> = [];

  for (const theme of themes) {
    let slug = slugifyThemeName(theme.name);
    if (!slug) {
      throw new TypeError(
        `@razorwind/vivaldi theme name "${theme.name}" slugifies to an empty string`
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

    const settingsPath = join(outputPath, slug, "settings.json");
    documents[settingsPath] = document(
      settingsPath,
      renderSettingsJson(theme),
      "json"
    );
    themeMeta.push({
      name: theme.name,
      displayName: themeDisplayName(theme),
      folderName: slug,
      backgroundImage: theme.backgroundImage
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
