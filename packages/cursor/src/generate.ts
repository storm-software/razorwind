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
  slugifyThemeName,
  titleCase,
  type SchemaIdentity
} from "@razorwind/core/utils";
import { join } from "node:path";
import {
  renderBuildCursorPackageScript,
  renderInstallMd,
  renderPackageReadme,
  renderVsCodeIgnore,
  renderVsixPackageShim
} from "./scripts";
import type { CursorPluginOptions, CursorTheme } from "./types";

const PLUGIN_META = { name: "razorwind-cursor" } as const;

const DEFAULT_ENGINES = { vscode: "^1.85.0" } as const;

type UiTheme = "vs" | "vs-dark" | "hc-black" | "hc-light";

function document(
  path: string,
  content: string,
  language?: string
): GeneratorFunctionResult<Schema, CursorPluginOptions>[string] {
  return createDocument<Schema, CursorPluginOptions>(
    path,
    content,
    PLUGIN_META,
    language
  );
}

function toUiTheme(type: CursorTheme["type"]): UiTheme {
  switch (type) {
    case "light":
      return "vs";
    case "hc":
      return "hc-black";
    case "hcLight":
      return "hc-light";
    case "dark":
      return "vs-dark";
    default:
      return "vs-dark";
  }
}

function isCursorTheme(value: unknown): value is CursorTheme {
  return (
    isObject(value) &&
    typeof value.name === "string" &&
    (value.type === "light" ||
      value.type === "dark" ||
      value.type === "hc" ||
      value.type === "hcLight")
  );
}

/**
 * Normalize {@link CursorPluginOptions.mapTheme} results into a theme list.
 */
export function normalizeThemes(
  result: CursorTheme | CursorTheme[] | Record<string, CursorTheme>
): CursorTheme[] {
  if (Array.isArray(result)) {
    return result.map((theme, index) => {
      if (!isCursorTheme(theme)) {
        throw new TypeError(
          `@razorwind/cursor mapTheme()[${index}] must be a CursorTheme with name + type`
        );
      }
      return theme;
    });
  }

  if (isCursorTheme(result)) {
    return [result];
  }

  if (!isObject(result)) {
    throw new TypeError(
      "@razorwind/cursor mapTheme() must return a theme, theme array, or theme record"
    );
  }

  return Object.entries(result).map(([key, theme]) => {
    if (!isCursorTheme(theme)) {
      throw new TypeError(
        `@razorwind/cursor mapTheme()["${key}"] must be a CursorTheme with name + type`
      );
    }
    return {
      ...theme,
      name: theme.name || key
    };
  });
}

function repositoryUrl(
  repository: CursorPluginOptions["repository"]
): string | undefined {
  if (typeof repository === "string") {
    return repository;
  }
  if (repository && typeof repository.url === "string") {
    return repository.url;
  }
  return undefined;
}

function assertOptions(
  options: CursorPluginOptions
): asserts options is CursorPluginOptions & {
  mapTheme: NonNullable<CursorPluginOptions["mapTheme"]>;
  name: string;
  publisher: string;
} {
  if (!options.mapTheme) {
    throw new Error("@razorwind/cursor requires options.mapTheme");
  }
  if (!options.name || options.name.includes("/")) {
    throw new Error(
      "@razorwind/cursor requires options.name (unscoped extension id)"
    );
  }
  if (!options.publisher) {
    throw new Error("@razorwind/cursor requires options.publisher");
  }
}

/**
 * Serialize a Cursor / VS Code theme document for `themes/*.json`.
 */
function toThemeJsonType(type: CursorTheme["type"]): "light" | "dark" {
  return type === "light" || type === "hcLight" ? "light" : "dark";
}

export function renderThemeJson(theme: CursorTheme): string {
  const payload: Record<string, unknown> = {
    name: theme.name,
    type: toThemeJsonType(theme.type),
    colors: theme.colors ?? {}
  };

  if (theme.displayName) {
    payload.displayName = theme.displayName;
  }
  if (theme.tokenColors) {
    payload.tokenColors = theme.tokenColors;
  }
  if (theme.semanticHighlighting !== undefined) {
    payload.semanticHighlighting = theme.semanticHighlighting;
  }
  if (theme.semanticTokenColors) {
    payload.semanticTokenColors = theme.semanticTokenColors;
  }

  return `${JSON.stringify(payload, null, 2)}\n`;
}

/**
 * Build the extension `package.json` manifest (themes + optional scripts).
 *
 * When {@link themePaths} is provided, those relative paths are used for
 * `contributes.themes[].path` (must match emitted theme files).
 *
 * When {@link spec} is provided, Schema identity fills missing display
 * name / description / repository / homepage / icon.
 */
export function renderPackageJson(
  options: CursorPluginOptions,
  themes: CursorTheme[],
  themePaths?: string[],
  spec: SchemaIdentity = {}
): string {
  const includeScripts = options.includeScripts !== false;
  const identity = resolveSchemaIdentity(spec, {
    displayName: options.displayName,
    description: options.description,
    homepage: options.homepage,
    icon: options.icon,
    repository:
      typeof options.repository === "string" ? options.repository : undefined
  });
  const displayName = identity.title ?? titleCase(options.name);
  const description =
    identity.description ??
    `${displayName} — Cursor themes generated by Razorwind`;
  const repository = options.repository ?? identity.repository;
  const homepage = options.homepage ?? identity.homepage;
  const icon = options.icon ?? identity.logo;

  const contributes = {
    themes: themes.map((theme, index) => ({
      label: theme.displayName ?? theme.name,
      uiTheme: toUiTheme(theme.type),
      path:
        themePaths?.[index] ??
        `./themes/${slugifyThemeName(theme.name)}.json`
    }))
  };

  const scripts = includeScripts
    ? {
        "package-vsix": "node --import tsx scripts/buildCursorPackage.ts"
      }
    : undefined;

  const manifest: Record<string, unknown> = {
    name: options.name,
    displayName,
    description,
    version: options.version ?? "0.0.1",
    publisher: options.publisher,
    license: options.license ?? "Apache-2.0",
    categories: options.categories ?? ["Themes"],
    engines: options.engines ?? { ...DEFAULT_ENGINES },
    contributes,
    ...(options.keywords ? { keywords: options.keywords } : {}),
    ...(repository ? { repository } : {}),
    ...(homepage ? { homepage } : {}),
    ...(options.bugs ? { bugs: options.bugs } : {}),
    ...(options.author ? { author: options.author } : {}),
    ...(icon ? { icon } : {}),
    ...(options.galleryBanner ? { galleryBanner: options.galleryBanner } : {}),
    ...(scripts ? { scripts } : {}),
    ...(options.packageJson ?? {})
  };

  // Plugin-owned fields always win over packageJson merges.
  manifest.name = options.name;
  manifest.publisher = options.publisher;
  manifest.contributes = contributes;
  if (scripts) {
    const mergedScripts =
      isObject(manifest.scripts) && !Array.isArray(manifest.scripts)
        ? { ...(manifest.scripts as Record<string, string>), ...scripts }
        : scripts;
    manifest.scripts = mergedScripts;
  }

  return `${JSON.stringify(manifest, null, 2)}\n`;
}

export { renderInstallMd };

/**
 * Generate a Cursor-installable theme extension package from a Razorwind schema.
 *
 * Emits theme JSON, `package.json`, packaging scripts, `README.md`, and
 * `INSTALL.md` (VSIX install steps for Cursor).
 *
 * @see https://draculatheme.com/cursor
 */
export function generateCursorExtension(
  spec: Schema,
  options: CursorPluginOptions
): GeneratorFunctionResult<Schema, CursorPluginOptions> {
  assertOptions(options);

  const outputPath = options.outputPath ?? "cursor-extension";
  const includeScripts = options.includeScripts !== false;
  const extensionName = options.extensionName ?? options.name;
  const identity = resolveSchemaIdentity(spec, {
    displayName: options.displayName,
    description: options.description,
    homepage: options.homepage,
    icon: options.icon,
    repository:
      typeof options.repository === "string" ? options.repository : undefined
  });
  const displayName = identity.title ?? titleCase(options.name);
  const description =
    identity.description ??
    `${displayName} — Cursor themes generated by Razorwind`;
  const resolvedRepository = options.repository ?? identity.repository;

  const themes = normalizeThemes(options.mapTheme(spec.tokens));
  if (themes.length === 0) {
    throw new Error("@razorwind/cursor mapTheme() returned no themes");
  }

  const documents: GeneratorFunctionResult<Schema, CursorPluginOptions> = {};
  const usedSlugs = new Set<string>();
  const themeMeta: Array<{ label: string; path: string; slug: string }> = [];

  for (const theme of themes) {
    let slug = slugifyThemeName(theme.name);
    if (usedSlugs.has(slug)) {
      let suffix = 2;
      while (usedSlugs.has(`${slugifyThemeName(theme.name)}-${suffix}`)) {
        suffix += 1;
      }
      slug = `${slugifyThemeName(theme.name)}-${suffix}`;
    }
    usedSlugs.add(slug);

    const fileName = `${slug}.json`;
    const themePath = join(outputPath, "themes", fileName);
    documents[themePath] = document(themePath, renderThemeJson(theme), "json");
    themeMeta.push({
      label: theme.displayName ?? theme.name,
      path: `themes/${fileName}`,
      slug
    });
  }

  const packageJsonPath = join(outputPath, "package.json");
  documents[packageJsonPath] = document(
    packageJsonPath,
    renderPackageJson(
      options,
      themes,
      themeMeta.map(theme => `./${theme.path}`),
      spec
    ),
    "json"
  );

  const vscodeIgnorePath = join(outputPath, ".vscodeignore");
  documents[vscodeIgnorePath] = document(
    vscodeIgnorePath,
    renderVsCodeIgnore(),
    "ignore"
  );

  const themeLabels = themeMeta.map(theme => ({ label: theme.label }));
  const readmeBody =
    options.readme ??
    renderPackageReadme({
      displayName,
      description,
      themes: themeLabels,
      repositoryUrl: repositoryUrl(resolvedRepository)
    });

  const readmePath = join(outputPath, "README.md");
  documents[readmePath] = document(readmePath, readmeBody, "markdown");

  const installBody =
    options.installGuide ??
    renderInstallMd({
      displayName,
      extensionName,
      themes: themeMeta.map(theme => ({
        label: theme.label,
        path: theme.path
      }))
    });

  const installPath = join(outputPath, "INSTALL.md");
  documents[installPath] = document(installPath, installBody, "markdown");

  if (includeScripts) {
    const shimPath = join(outputPath, "scripts", "vsixPackageShim.ts");
    documents[shimPath] = document(
      shimPath,
      renderVsixPackageShim(extensionName),
      "typescript"
    );

    const packagePath = join(outputPath, "scripts", "buildCursorPackage.ts");
    documents[packagePath] = document(
      packagePath,
      renderBuildCursorPackageScript(extensionName),
      "typescript"
    );

    const packageReadmePath = join(outputPath, "scripts", "README.package.md");
    documents[packageReadmePath] = document(
      packageReadmePath,
      renderPackageReadme({
        displayName,
        description,
        themes: themeLabels,
        repositoryUrl: repositoryUrl(resolvedRepository)
      }),
      "markdown"
    );
  }

  return documents;
}
