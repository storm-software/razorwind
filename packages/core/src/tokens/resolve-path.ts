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

import { existsSync } from "@stryke/fs/exists";
import { isDirectory } from "@stryke/fs/is-file";
import { joinPaths } from "@stryke/path/join";
import { isAbsolute, resolve } from "node:path";
import {
  DEFAULT_TOKEN_PATH_CANDIDATES,
  THEME_BASENAME_PATTERN,
  TOKEN_DIRECTORY_GLOB,
  TOKEN_FILE_EXTENSIONS
} from "./constants";

export interface ResolveTokensPathOptions {
  /**
   * Working directory used to resolve relative paths.
   */
  cwd: string;

  /**
   * Explicit tokens file or directory from config.
   */
  tokensPath?: string;

  /**
   * Extra fallback paths (e.g. registry `tailwind.css`).
   */
  fallbackPaths?: Array<string | null | undefined>;
}

export interface ResolvedTokensSource {
  /**
   * Absolute path to the resolved file or directory (if any).
   */
  resolvedPath?: string;

  /**
   * Style Dictionary `source` globs.
   */
  source: string[];

  /**
   * How the path was discovered.
   */
  origin: "tokensPath" | "default" | "fallback" | "none";
}

function toAbsolute(cwd: string, target: string): string {
  return isAbsolute(target) ? target : resolve(cwd, target);
}

function extensionOf(filePath: string): string {
  const match = /\.([^.]+)$/.exec(filePath);

  return match?.[1]?.toLowerCase() ?? "";
}

function isTokenFile(filePath: string): boolean {
  return (TOKEN_FILE_EXTENSIONS as readonly string[]).includes(
    extensionOf(filePath)
  );
}

function isStyleDictionaryConfig(filePath: string): boolean {
  const base = filePath.split(/[/\\]/).pop()?.toLowerCase() ?? "";

  return (
    base.startsWith("style-dictionary.config.") || base.startsWith("sd.config.")
  );
}

function directorySourceGlob(dirPath: string): string {
  return joinPaths(dirPath, TOKEN_DIRECTORY_GLOB);
}

/**
 * Resolve Style Dictionary source globs from `tokensPath` or common defaults.
 */
export function resolveTokensSource(
  options: ResolveTokensPathOptions
): ResolvedTokensSource {
  const { cwd, tokensPath, fallbackPaths = [] } = options;

  if (tokensPath) {
    const absolute = toAbsolute(cwd, tokensPath);

    if (!existsSync(absolute)) {
      throw new Error(
        `tokensPath "${tokensPath}" does not exist (resolved: ${absolute}).`
      );
    }

    if (isDirectory(absolute)) {
      return {
        resolvedPath: absolute,
        source: [directorySourceGlob(absolute)],
        origin: "tokensPath"
      };
    }

    if (isStyleDictionaryConfig(absolute)) {
      return {
        resolvedPath: absolute,
        source: [],
        origin: "tokensPath"
      };
    }

    return {
      resolvedPath: absolute,
      source: [absolute],
      origin: "tokensPath"
    };
  }

  for (const candidate of DEFAULT_TOKEN_PATH_CANDIDATES) {
    const absolute = toAbsolute(cwd, candidate);
    if (!existsSync(absolute)) {
      continue;
    }

    if (isDirectory(absolute)) {
      return {
        resolvedPath: absolute,
        source: [directorySourceGlob(absolute)],
        origin: "default"
      };
    }

    if (isStyleDictionaryConfig(absolute)) {
      return {
        resolvedPath: absolute,
        source: [],
        origin: "default"
      };
    }

    if (isTokenFile(absolute)) {
      return {
        resolvedPath: absolute,
        source: [absolute],
        origin: "default"
      };
    }
  }

  for (const fallback of fallbackPaths) {
    if (!fallback) {
      continue;
    }
    const absolute = toAbsolute(cwd, fallback);
    if (!existsSync(absolute) || isDirectory(absolute)) {
      continue;
    }
    if (isTokenFile(absolute) || extensionOf(absolute) === "css") {
      return {
        resolvedPath: absolute,
        source: [absolute],
        origin: "fallback"
      };
    }
  }

  return { source: [], origin: "none" };
}

/**
 * Detect theme-like basenames for splitting multi-file token sets.
 */
export function themeKeyFromPath(filePath: string): string | undefined {
  const base = filePath.split(/[/\\]/).pop() ?? "";
  const withoutExt = base.replace(/\.[^.]+$/, "");
  const match = withoutExt.match(THEME_BASENAME_PATTERN);

  return match?.[1]?.toLowerCase();
}
