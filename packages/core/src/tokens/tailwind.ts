/* -------------------------------------------------------------------

                       🗲 Storm Software - Windie

 This code was released as part of the Windie project. Windie
 is maintained by Storm Software under the Apache-2.0 license, and is
 free for commercial and private use. For more information, please visit
 our licensing page at https://stormsoftware.com/licenses/projects/windie.

 Website:                  https://stormsoftware.com
 Repository:               https://github.com/storm-software/windie
 Documentation:            https://docs.stormsoftware.com/projects/windie
 Contact:                  https://stormsoftware.com/contact

 SPDX-License-Identifier:  Apache-2.0

 ------------------------------------------------------------------- */

import type { Tokens } from "@power-plant/dtcg-schema";
import { existsSync } from "@stryke/fs/exists";
import { readFile } from "@stryke/fs/read-file";
import { isSetString } from "@stryke/type-checks/is-set-string";
import { dirname, isAbsolute, resolve } from "node:path";
import type { ProjectInfo } from "../registry/utils/get-project-info";
import {
  getProjectInfo,
  getTailwindCssFile,
  getTailwindVersion
} from "../registry/utils/get-project-info";
import { nestFlatTokens } from "./infer";

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

export interface ExtractTailwindTokensOptions {
  /**
   * Working directory used to detect Tailwind and resolve relative CSS paths.
   */
  cwd: string;

  /**
   * Optional CSS entry override (registry `tailwind.css` / explicit path).
   */
  cssPath?: string | null;

  /**
   * When true, skip entries that carry only the DEFAULT theme option bit.
   *
   * @defaultValue false
   */
  omitDefaults?: boolean;
}

export interface TailwindWorkspaceInfo {
  configured: boolean;
  version: ProjectInfo["tailwindVersion"];
  cssFile: string | null;
  configFile: string | null;
}

/** ThemeOptions.DEFAULT mirrored from Tailwind (const enum not runtime-importable). */
const THEME_OPTION_DEFAULT = 4;

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

/**
 * Detect whether the workspace has Tailwind CSS configured.
 */
export async function detectTailwindWorkspace(
  cwd: string,
  cssPathHint?: string | null
): Promise<TailwindWorkspaceInfo> {
  const projectInfo = await getProjectInfo(cwd, {
    configCssFile: cssPathHint ?? undefined
  });

  if (projectInfo?.tailwindVersion) {
    return {
      configured: Boolean(projectInfo.tailwindCssFile),
      version: projectInfo.tailwindVersion,
      cssFile: projectInfo.tailwindCssFile,
      configFile: projectInfo.tailwindConfigFile
    };
  }

  // Lightweight fallback when full project scan finds nothing.
  const [version, cssFile] = await Promise.all([
    getTailwindVersion(cwd),
    getTailwindCssFile(cwd, cssPathHint ?? undefined)
  ]);

  return {
    configured: Boolean(version && cssFile),
    version,
    cssFile,
    configFile: null
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
  options: ExtractTailwindTokensOptions
): Promise<Tokens | null> {
  const { cwd, cssPath, omitDefaults = false } = options;

  const workspace = await detectTailwindWorkspace(cwd, cssPath);
  if (!workspace.configured || workspace.version !== "v4") {
    return null;
  }

  const entry = resolveTailwindCssEntry(cwd, [cssPath, workspace.cssFile]);
  if (!entry) {
    return null;
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
    return null;
  }

  return nestFlatTokens(flat) as Tokens;
}
