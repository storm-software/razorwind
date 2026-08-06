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
import { renderInstallMd } from "./install";
import {
  renderBuildVsCodePackageScript,
  renderPackageReadme,
  renderPublishOvsxScript,
  renderPublishVsceScript,
  renderVsCodeIgnore,
  renderVsixPackageShim
} from "./scripts";
import type { VscePluginOptions, VsCodeTheme } from "./types";

const PLUGIN_META = { name: "razorwind-vsce" } as const;

const DEFAULT_ENGINES = { vscode: "^1.85.0" } as const;

type UiTheme = "vs" | "vs-dark" | "hc-black" | "hc-light";

function document(
  path: string,
  content: string,
  language?: string
): GeneratorFunctionResult<Schema, VscePluginOptions>[string] {
  return createDocument<Schema, VscePluginOptions>(
    path,
    content,
    PLUGIN_META,
    language
  );
}

function titleCase(value: string): string {
  return value
    .split(/[-_.\s]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function slugifyThemeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");
}

function toUiTheme(type: VsCodeTheme["type"]): UiTheme {
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

function isVsCodeTheme(value: unknown): value is VsCodeTheme {
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
 * Normalize {@link VscePluginOptions.mapTheme} results into a theme list.
 */
export function normalizeThemes(
  result: VsCodeTheme | VsCodeTheme[] | Record<string, VsCodeTheme>
): VsCodeTheme[] {
  if (Array.isArray(result)) {
    return result.map((theme, index) => {
      if (!isVsCodeTheme(theme)) {
        throw new TypeError(
          `@razorwind/vsce mapTheme()[${index}] must be a VsCodeTheme with name + type`
        );
      }
      return theme;
    });
  }

  if (isVsCodeTheme(result)) {
    return [result];
  }

  if (!isObject(result)) {
    throw new TypeError(
      "@razorwind/vsce mapTheme() must return a theme, theme array, or theme record"
    );
  }

  return Object.entries(result).map(([key, theme]) => {
    if (!isVsCodeTheme(theme)) {
      throw new TypeError(
        `@razorwind/vsce mapTheme()["${key}"] must be a VsCodeTheme with name + type`
      );
    }
    return {
      ...theme,
      name: theme.name || key
    };
  });
}

function repositoryUrl(
  repository: VscePluginOptions["repository"]
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
  options: VscePluginOptions
): asserts options is VscePluginOptions & {
  mapTheme: NonNullable<VscePluginOptions["mapTheme"]>;
  name: string;
  publisher: string;
} {
  if (!options.mapTheme) {
    throw new Error("@razorwind/vsce requires options.mapTheme");
  }
  if (!options.name || options.name.includes("/")) {
    throw new Error(
      "@razorwind/vsce requires options.name (unscoped Marketplace id)"
    );
  }
  if (!options.publisher) {
    throw new Error("@razorwind/vsce requires options.publisher");
  }
}

/**
 * Serialize a VS Code theme document for `themes/*.json`.
 */
function toThemeJsonType(type: VsCodeTheme["type"]): "light" | "dark" {
  return type === "light" || type === "hcLight" ? "light" : "dark";
}

export function renderThemeJson(theme: VsCodeTheme): string {
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
 */
export function renderPackageJson(
  options: VscePluginOptions,
  themes: VsCodeTheme[]
): string {
  const includeScripts = options.includeScripts !== false;
  const displayName = options.displayName ?? titleCase(options.name);
  const description =
    options.description ??
    `${displayName} — VS Code themes generated by Razorwind`;

  const contributes = {
    themes: themes.map(theme => ({
      label: theme.displayName ?? theme.name,
      uiTheme: toUiTheme(theme.type),
      path: `./themes/${slugifyThemeName(theme.name)}.json`
    }))
  };

  const scripts = includeScripts
    ? {
        "package-vsix": "node --import tsx scripts/buildVsCodePackage.ts",
        "publish-vsce": "node --import tsx scripts/publishVsce.ts",
        "publish-ovsx": "node --import tsx scripts/publishOvsx.ts"
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
    ...(options.repository ? { repository: options.repository } : {}),
    ...(options.homepage ? { homepage: options.homepage } : {}),
    ...(options.bugs ? { bugs: options.bugs } : {}),
    ...(options.author ? { author: options.author } : {}),
    ...(options.icon ? { icon: options.icon } : {}),
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
 * Generate a publishable VS Code theme extension package from a Razorwind schema.
 */
export function generateVsceExtension(
  spec: Schema,
  options: VscePluginOptions
): GeneratorFunctionResult<Schema, VscePluginOptions> {
  assertOptions(options);

  const outputPath = options.outputPath ?? "vscode-extension";
  const includeScripts = options.includeScripts !== false;
  const extensionName = options.extensionName ?? options.name;
  const displayName = options.displayName ?? titleCase(options.name);
  const description =
    options.description ??
    `${displayName} — VS Code themes generated by Razorwind`;

  const themes = normalizeThemes(options.mapTheme(spec.tokens));
  if (themes.length === 0) {
    throw new Error("@razorwind/vsce mapTheme() returned no themes");
  }

  const documents: GeneratorFunctionResult<Schema, VscePluginOptions> = {};

  for (const theme of themes) {
    const fileName = `${slugifyThemeName(theme.name)}.json`;
    const themePath = join(outputPath, "themes", fileName);
    documents[themePath] = document(themePath, renderThemeJson(theme), "json");
  }

  const packageJsonPath = join(outputPath, "package.json");
  documents[packageJsonPath] = document(
    packageJsonPath,
    renderPackageJson(options, themes),
    "json"
  );

  const vscodeIgnorePath = join(outputPath, ".vscodeignore");
  documents[vscodeIgnorePath] = document(
    vscodeIgnorePath,
    renderVsCodeIgnore(),
    "ignore"
  );

  const themeLabels = themes.map(theme => ({
    label: theme.displayName ?? theme.name,
    path: `./themes/${slugifyThemeName(theme.name)}.json`
  }));
  const readmeBody =
    options.readme ??
    renderPackageReadme({
      displayName,
      description,
      themes: themeLabels,
      repositoryUrl: repositoryUrl(options.repository)
    });

  const readmePath = join(outputPath, "README.md");
  documents[readmePath] = document(readmePath, readmeBody, "markdown");

  const installBody =
    options.installGuide ??
    renderInstallMd({
      displayName,
      extensionName,
      themes: themeLabels,
      includeScripts
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

    const packagePath = join(outputPath, "scripts", "buildVsCodePackage.ts");
    documents[packagePath] = document(
      packagePath,
      renderBuildVsCodePackageScript(),
      "typescript"
    );

    const publishVscePath = join(outputPath, "scripts", "publishVsce.ts");
    documents[publishVscePath] = document(
      publishVscePath,
      renderPublishVsceScript(),
      "typescript"
    );

    const publishOvsxPath = join(outputPath, "scripts", "publishOvsx.ts");
    documents[publishOvsxPath] = document(
      publishOvsxPath,
      renderPublishOvsxScript(),
      "typescript"
    );

    const packageReadmePath = join(outputPath, "scripts", "README.package.md");
    documents[packageReadmePath] = document(
      packageReadmePath,
      renderPackageReadme({
        displayName,
        description,
        themes: themeLabels,
        repositoryUrl: repositoryUrl(options.repository)
      }),
      "markdown"
    );
  }

  return documents;
}
