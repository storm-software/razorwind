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

import { existsSync } from "@stryke/fs/exists";
import { isDirectory } from "@stryke/fs/is-file";
import { joinPaths } from "@stryke/path/join";
import { isSetString } from "@stryke/type-checks/is-set-string";
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
   * Explicit tokens file(s) or directory(ies) from config.
   */
  tokensPath?: string | string[];

  /**
   * Extra fallback paths (e.g. registry `tailwind.css`).
   */
  fallbackPaths?: Array<string | null | undefined>;
}

export interface ResolvedTokensSource {
  /**
   * Absolute path to the resolved file or directory (if any).
   *
   * When multiple `tokensPath` entries are provided, this is the first
   * resolved path (or the Style Dictionary config when that is the sole entry).
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

interface ResolvedSingleTokensPath {
  resolvedPath: string;
  source: string[];
  isStyleDictionaryConfig: boolean;
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

function normalizeTokensPaths(
  tokensPath: string | string[] | undefined
): string[] {
  if (Array.isArray(tokensPath)) {
    return tokensPath.filter(isSetString);
  }

  return isSetString(tokensPath) ? [tokensPath] : [];
}

const GLOB_METACHAR_PATTERN = /[*?[\]{}]/;

function isGlobPattern(target: string): boolean {
  return GLOB_METACHAR_PATTERN.test(target);
}

function globStaticPrefix(globPath: string): string | undefined {
  const index = globPath.search(/[*?[{]/);
  if (index <= 0) {
    return undefined;
  }

  const prefix = globPath.slice(0, index).replace(/[/\\]+$/, "");

  return prefix.length > 0 ? prefix : undefined;
}

function resolveSingleTokensPath(
  cwd: string,
  tokensPath: string
): ResolvedSingleTokensPath {
  const absolute = toAbsolute(cwd, tokensPath);

  if (isGlobPattern(tokensPath)) {
    const staticPrefix = globStaticPrefix(absolute);
    if (staticPrefix && !existsSync(staticPrefix)) {
      throw new Error(
        `tokensPath "${tokensPath}" does not exist (resolved: ${absolute}).`
      );
    }

    return {
      resolvedPath: absolute,
      source: [absolute],
      isStyleDictionaryConfig: false
    };
  }

  if (!existsSync(absolute)) {
    throw new Error(
      `tokensPath "${tokensPath}" does not exist (resolved: ${absolute}).`
    );
  }

  if (isDirectory(absolute)) {
    return {
      resolvedPath: absolute,
      source: [directorySourceGlob(absolute)],
      isStyleDictionaryConfig: false
    };
  }

  if (isStyleDictionaryConfig(absolute)) {
    return {
      resolvedPath: absolute,
      source: [],
      isStyleDictionaryConfig: true
    };
  }

  return {
    resolvedPath: absolute,
    source: [absolute],
    isStyleDictionaryConfig: false
  };
}

/**
 * Resolve Style Dictionary source globs from `tokensPath` or common defaults.
 *
 * When `tokensPath` is an array, each entry is resolved and the resulting
 * source globs are merged. A Style Dictionary config file may only be used as
 * the sole `tokensPath` entry.
 */
export function resolveTokensSource(
  options: ResolveTokensPathOptions
): ResolvedTokensSource {
  const { cwd, tokensPath, fallbackPaths = [] } = options;

  const paths = normalizeTokensPaths(tokensPath);
  if (paths.length > 0) {
    const resolved = paths.map(path => resolveSingleTokensPath(cwd, path));
    const styleDictionaryConfigs = resolved.filter(
      entry => entry.isStyleDictionaryConfig
    );

    if (styleDictionaryConfigs.length > 0) {
      if (resolved.length > 1) {
        throw new Error(
          "tokensPath cannot mix Style Dictionary config files with other token sources."
        );
      }

      return {
        resolvedPath: styleDictionaryConfigs[0]!.resolvedPath,
        source: [],
        origin: "tokensPath"
      };
    }

    return {
      resolvedPath: resolved[0]?.resolvedPath,
      source: resolved.flatMap(entry => entry.source),
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
