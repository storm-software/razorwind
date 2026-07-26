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

import type { Tokens } from "@power-plant/dtcg-schema";
import { nestFlatTokens } from "@razorwind/core/tokens";
import { existsSync } from "@stryke/fs/exists";
import { readFile } from "@stryke/fs/read-file";
import { isSetString } from "@stryke/type-checks/is-set-string";
import fg from "fast-glob";
import { dirname, isAbsolute, resolve } from "node:path";
import type { TailwindPluginOptions } from "./types";
import { getPackageInfo } from "./workspace";

/** Loosely-typed surface of `@tailwindcss/node` unstable extract API. */
interface TailwindNodeModule {
  // eslint-disable-next-line ts/naming-convention
  __unstable__loadDesignSystem: (
    css: string,
    opts: { base: string }
  ) => Promise<{
    theme: {
      size: number;
      entries: () => Iterable<[string, { value: string; options: number }]>;
    };
  }>;
}

export interface TailwindWorkspaceInfo {
  configured: boolean;
  version: "v3" | "v4" | null;
  cssFile: string | null;
  configFile: string | null;
}

/** ThemeOptions.DEFAULT mirrored from Tailwind (const enum not runtime-importable). */
const THEME_OPTION_DEFAULT = 4;

const PROJECT_SHARED_IGNORE = [
  "**/node_modules/**",
  "**/.git/**",
  "**/dist/**",
  "**/build/**",
  "**/.next/**",
  "**/.nuxt/**",
  "**/.turbo/**",
  "**/coverage/**"
];

async function importTailwindNode(): Promise<TailwindNodeModule> {
  try {
    return await import("@tailwindcss/node");
  } catch (cause) {
    throw new Error(
      "Cannot load '@tailwindcss/node'. Install tailwindcss v4 / @tailwindcss/node to extract workspace theme tokens.",
      { cause }
    );
  }
}

function toAbsolute(cwd: string, target: string): string {
  return isAbsolute(target) ? target : resolve(cwd, target);
}

export async function getTailwindVersion(
  cwd: string
): Promise<TailwindWorkspaceInfo["version"]> {
  const packageInfo = await getPackageInfo(cwd);

  if (
    !packageInfo?.dependencies?.tailwindcss &&
    !packageInfo?.devDependencies?.tailwindcss
  ) {
    return null;
  }

  if (
    /^(?:\^|~)?3(?:\.\d+)*(?:-.*)?$/.test(
      packageInfo?.dependencies?.tailwindcss ||
        packageInfo?.devDependencies?.tailwindcss ||
        ""
    )
  ) {
    return "v3";
  }

  return "v4";
}

export async function getTailwindCssFile(
  cwd: string,
  configCssFile?: string
): Promise<string | null> {
  if (configCssFile) {
    const resolvedPath = resolve(cwd, configCssFile);
    if (existsSync(resolvedPath)) {
      return configCssFile;
    }
  }

  const files = await fg.glob(["**/*.css", "**/*.scss"], {
    cwd,
    deep: 5,
    ignore: PROJECT_SHARED_IGNORE
  });

  if (!files.length) {
    return null;
  }

  for (const file of files) {
    const contents = await readFile(resolve(cwd, file));
    if (
      contents.includes(`@import "tailwindcss"`) ||
      contents.includes(`@import 'tailwindcss'`) ||
      contents.includes(`@tailwind base`)
    ) {
      return file;
    }
  }

  return null;
}

export async function getTailwindConfigFile(
  cwd: string
): Promise<string | null> {
  const files = await fg.glob("tailwind.config.*", {
    cwd,
    deep: 3,
    ignore: PROJECT_SHARED_IGNORE
  });

  return files[0] ?? null;
}

/**
 * Detect whether the workspace has Tailwind CSS configured.
 */
export async function detectTailwindWorkspace(
  cwd: string,
  cssPathHint?: string | null
): Promise<TailwindWorkspaceInfo> {
  const [version, cssFile, configFile] = await Promise.all([
    getTailwindVersion(cwd),
    getTailwindCssFile(cwd, cssPathHint ?? undefined),
    getTailwindConfigFile(cwd)
  ]);

  return {
    configured: Boolean(version && cssFile),
    version,
    cssFile,
    configFile
  };
}

/**
 * Resolve the absolute CSS entry used for Tailwind theme extraction.
 */
export function resolveTailwindCssEntry(
  cwd: string,
  candidates: Array<string | null | undefined>
): string | null {
  for (const candidate of candidates) {
    if (!isSetString(candidate)) {
      continue;
    }
    const absolute = toAbsolute(cwd, candidate);
    if (existsSync(absolute)) {
      return absolute;
    }
  }
  return null;
}

/**
 * Extract design tokens from a Tailwind v4 CSS entry via `@tailwindcss/node`.
 *
 * Uses `__unstable__loadDesignSystem` so `@import` graphs resolve and theme
 * namespaces merge the same way the Tailwind engine does.
 */
export async function extractTailwindTokens(
  options: TailwindPluginOptions & { cwd: string }
): Promise<Tokens | undefined> {
  const { cwd, cssPath, omitDefaults = false } = options;

  const workspace = await detectTailwindWorkspace(cwd, cssPath);
  if (!workspace.configured || workspace.version !== "v4") {
    return undefined;
  }

  const entry = resolveTailwindCssEntry(cwd, [cssPath, workspace.cssFile]);
  if (!entry) {
    return undefined;
  }

  const css = await readFile(entry);
  const tw = await importTailwindNode();
  const designSystem = await tw.__unstable__loadDesignSystem(css, {
    base: dirname(entry)
  });

  const flat: Record<string, string> = {};
  for (const [cssVar, meta] of designSystem.theme.entries()) {
    if (
      omitDefaults &&
      (meta.options & THEME_OPTION_DEFAULT) === THEME_OPTION_DEFAULT
    ) {
      continue;
    }
    if (!cssVar.startsWith("--") || !meta.value) {
      continue;
    }
    flat[cssVar] = meta.value;
  }

  if (Object.keys(flat).length === 0) {
    return undefined;
  }

  return nestFlatTokens(flat) as Tokens;
}
