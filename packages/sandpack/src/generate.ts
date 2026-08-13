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
import {
  fontFamilyName,
  MONO_ROLES,
  pickFontByRole,
  SANS_ROLES
} from "@razorwind/core/lib/fonts";
import type { Fonts, Schema } from "@razorwind/core/schema";
import { createDocument, isObject } from "@razorwind/core/utils";
import { join } from "node:path";
import { renderInstallMd, themeDisplayName } from "./install";
import type {
  SandpackPluginOptions,
  SandpackTheme,
  SandpackUsage
} from "./types";
import { buildUsageFromComponents, usageDisplayName } from "./usage";

const PLUGIN_META = { name: "razorwind-sandpack" } as const;

function document(
  path: string,
  content: string,
  language?: string
): GeneratorFunctionResult<Schema, SandpackPluginOptions>[string] {
  return createDocument<Schema, SandpackPluginOptions>(
    path,
    content,
    PLUGIN_META,
    language
  );
}

function slugifyName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");
}

function allocateSlug(base: string, used: Set<string>): string {
  let slug = slugifyName(base);
  if (!slug) {
    throw new TypeError(
      `@razorwind/sandpack name "${base}" slugifies to an empty string`
    );
  }
  if (used.has(slug)) {
    let suffix = 2;
    while (used.has(`${slugifyName(base)}-${suffix}`)) {
      suffix += 1;
    }
    slug = `${slugifyName(base)}-${suffix}`;
  }
  used.add(slug);
  return slug;
}

function isSandpackTheme(value: unknown): value is SandpackTheme {
  return (
    isObject(value) && typeof value.name === "string" && value.name.length > 0
  );
}

function isSandpackUsage(value: unknown): value is SandpackUsage {
  return (
    isObject(value) &&
    typeof value.name === "string" &&
    value.name.length > 0 &&
    isObject(value.files)
  );
}

/**
 * Normalize {@link SandpackPluginOptions.mapTheme} results into a theme list.
 */
export function normalizeThemes(
  result: SandpackTheme | SandpackTheme[] | Record<string, SandpackTheme>
): SandpackTheme[] {
  if (Array.isArray(result)) {
    return result.map((theme, index) => {
      if (!isSandpackTheme(theme)) {
        throw new TypeError(
          `@razorwind/sandpack mapTheme()[${index}] must be a SandpackTheme with name`
        );
      }
      return theme;
    });
  }

  if (isSandpackTheme(result)) {
    return [result];
  }

  if (!isObject(result)) {
    throw new TypeError(
      "@razorwind/sandpack mapTheme() must return a theme, theme array, or theme record"
    );
  }

  return Object.entries(result).map(([key, theme]) => {
    if (!isSandpackTheme(theme)) {
      throw new TypeError(
        `@razorwind/sandpack mapTheme()["${key}"] must be a SandpackTheme with name`
      );
    }
    return {
      ...theme,
      name: theme.name || key
    };
  });
}

/**
 * Normalize {@link SandpackPluginOptions.mapFiles} results into a usage list.
 */
export function normalizeUsages(
  result: SandpackUsage | SandpackUsage[] | Record<string, SandpackUsage>
): SandpackUsage[] {
  if (Array.isArray(result)) {
    return result.map((usage, index) => {
      if (!isSandpackUsage(usage)) {
        throw new TypeError(
          `@razorwind/sandpack mapFiles()[${index}] must be a SandpackUsage with name + files`
        );
      }
      return usage;
    });
  }

  if (isSandpackUsage(result)) {
    return [result];
  }

  if (!isObject(result)) {
    throw new TypeError(
      "@razorwind/sandpack mapFiles() must return a usage, usage array, or usage record"
    );
  }

  return Object.entries(result).map(([key, usage]) => {
    if (!isSandpackUsage(usage)) {
      throw new TypeError(
        `@razorwind/sandpack mapFiles()["${key}"] must be a SandpackUsage with name + files`
      );
    }
    return {
      ...usage,
      name: usage.name || key
    };
  });
}

function assertOptions(
  options: SandpackPluginOptions
): asserts options is SandpackPluginOptions & {
  mapTheme: NonNullable<SandpackPluginOptions["mapTheme"]>;
} {
  if (!options.mapTheme) {
    throw new Error("@razorwind/sandpack requires options.mapTheme");
  }
}

function applyFontDefaults(
  theme: SandpackTheme,
  fonts: Fonts | undefined
): SandpackTheme {
  if (!fonts || Object.keys(fonts).length === 0) {
    return theme;
  }

  const sans = pickFontByRole(fonts, SANS_ROLES);
  const mono = pickFontByRole(fonts, MONO_ROLES);
  const body = theme.font?.body ?? (sans ? fontFamilyName(sans) : undefined);
  const monoFamily =
    theme.font?.mono ?? (mono ? fontFamilyName(mono) : undefined);

  if (!body && !monoFamily && !theme.font) {
    return theme;
  }

  return {
    ...theme,
    font: {
      ...theme.font,
      ...(body ? { body } : {}),
      ...(monoFamily ? { mono: monoFamily } : {})
    }
  };
}

/**
 * Serialize a Sandpack theme document for `themes/*.json`.
 *
 * Emits only Sandpack `theme` prop fields (`colors`, `syntax`, `font`).
 *
 * @see https://sandpack.codesandbox.io/docs/getting-started/themes#custom-theme
 */
export function renderThemeJson(theme: SandpackTheme): string {
  const payload: Record<string, unknown> = {};

  if (theme.colors) {
    payload.colors = theme.colors;
  }
  if (theme.syntax) {
    payload.syntax = theme.syntax;
  }
  if (theme.font) {
    payload.font = theme.font;
  }

  return `${JSON.stringify(payload, null, 2)}\n`;
}

/**
 * Serialize a Sandpack usage demo for `usage/*.json`.
 *
 * Shape is ready to feed `<Sandpack files={...} template={...} />`.
 *
 * @see https://sandpack.codesandbox.io/docs/getting-started/usage#files
 */
export function renderUsageJson(usage: SandpackUsage): string {
  const payload: Record<string, unknown> = {
    name: usage.name,
    template: usage.template ?? "react",
    files: usage.files
  };

  if (usage.displayName) {
    payload.displayName = usage.displayName;
  }
  if (usage.component) {
    payload.component = usage.component;
  }
  if (usage.title) {
    payload.title = usage.title;
  }
  if (usage.description) {
    payload.description = usage.description;
  }
  if (usage.theme !== undefined) {
    payload.theme = usage.theme;
  }
  if (usage.dependencies) {
    payload.dependencies = usage.dependencies;
  }
  if (usage.entry) {
    payload.entry = usage.entry;
  }

  return `${JSON.stringify(payload, null, 2)}\n`;
}

export { renderInstallMd };

/**
 * Generate Sandpack theme JSON and component usage demos from a Razorwind
 * schema.
 *
 * @see https://sandpack.codesandbox.io/docs/getting-started/themes#custom-theme
 * @see https://sandpack.codesandbox.io/docs/getting-started/usage#files
 */
export function generateSandpackTheme(
  spec: Schema,
  options: SandpackPluginOptions
): GeneratorFunctionResult<Schema, SandpackPluginOptions> {
  assertOptions(options);

  const outputPath = options.outputPath ?? "sandpack";
  const themes = normalizeThemes(options.mapTheme(spec.tokens)).map(theme =>
    applyFontDefaults(theme, spec.fonts)
  );

  if (themes.length === 0) {
    throw new Error("@razorwind/sandpack mapTheme() returned no themes");
  }

  const includeUsage = options.includeUsage !== false;
  let usages: SandpackUsage[] = [];
  if (includeUsage) {
    const mapped = options.mapFiles
      ? options.mapFiles(spec.components, spec.tokens)
      : buildUsageFromComponents(spec.components, {
          template: options.template
        });
    usages = normalizeUsages(mapped);
  }

  const documents: GeneratorFunctionResult<Schema, SandpackPluginOptions> = {};
  const usedThemeSlugs = new Set<string>();
  const usedUsageSlugs = new Set<string>();
  const themeMeta: Array<{
    name: string;
    displayName: string;
    fileName: string;
  }> = [];
  const usageMeta: Array<{
    name: string;
    displayName: string;
    fileName: string;
    component?: string;
  }> = [];

  for (const theme of themes) {
    const slug = allocateSlug(theme.name, usedThemeSlugs);
    const fileName = `${slug}.json`;
    const themePath = join(outputPath, "themes", fileName);
    documents[themePath] = document(
      themePath,
      renderThemeJson(theme),
      "json"
    );
    themeMeta.push({
      name: slug,
      displayName: themeDisplayName(theme),
      fileName
    });
  }

  for (const usage of usages) {
    const slug = allocateSlug(usage.name, usedUsageSlugs);
    const componentSlug = usage.component
      ? slugifyName(usage.component)
      : undefined;
    const relativeName = componentSlug
      ? join(componentSlug, `${slug}.json`)
      : `${slug}.json`;
    const usagePath = join(outputPath, "usage", relativeName);
    documents[usagePath] = document(
      usagePath,
      renderUsageJson({ ...usage, name: slug }),
      "json"
    );
    usageMeta.push({
      name: slug,
      displayName: usageDisplayName(usage),
      fileName: relativeName.replaceAll("\\", "/"),
      component: usage.component
    });
  }

  const installBody =
    options.installGuide ??
    renderInstallMd({ themes: themeMeta, usages: usageMeta });
  const installPath = join(outputPath, "INSTALL.md");
  documents[installPath] = document(installPath, installBody, "markdown");

  return documents;
}
