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

import path from "node:path";
import { getPackageInfo } from "./get-project-info";
import type { ImportEmitMode } from "./import-matcher";
import {
  getImportTargetEmitMode,
  resolveImportEntryMatch,
  resolveLocalPathTarget
} from "./import-matcher";

export interface PackageImportEntry {
  key: string;
  aliasBase: string;
  target: string;
  emitMode: ImportEmitMode;
  hasWildcard: boolean;
  rootDir: string;
}
const packageImportEntriesCache = new Map<string, PackageImportEntry[]>();

export async function getPackageImportEntries(
  cwd: string
): Promise<PackageImportEntry[]> {
  const cacheKey = path.resolve(cwd);
  const cachedEntries = packageImportEntriesCache.get(cacheKey);

  if (cachedEntries) {
    return cachedEntries;
  }

  const packageInfo = await getPackageInfo(cwd);
  const imports = packageInfo?.imports;

  if (!imports || typeof imports !== "object" || Array.isArray(imports)) {
    packageImportEntriesCache.set(cacheKey, []);
    return [];
  }

  const entries: PackageImportEntry[] = [];

  for (const [key, value] of Object.entries(imports)) {
    if (!key.startsWith("#")) {
      continue;
    }

    const target = resolveLocalPathTarget(value);
    if (!target) {
      continue;
    }

    entries.push({
      key,
      aliasBase:
        key === "#*" ? "#" : key.endsWith("/*") ? key.slice(0, -2) : key,
      target,
      emitMode: getImportTargetEmitMode(target),
      hasWildcard: key.includes("*"),
      rootDir: cacheKey
    });
  }

  packageImportEntriesCache.set(cacheKey, entries);
  return entries;
}

export async function getPackageImportPrefix(cwd: string) {
  const aliases = (await getPackageImportEntries(cwd)).map(
    entry => entry.aliasBase
  );

  if (!aliases.length) {
    return null;
  }

  return getSharedPackageImportPrefix(aliases);
}

export async function resolvePackageImport(importPath: string, cwd: string) {
  return resolveImportEntryMatch(
    importPath,
    await getPackageImportEntries(cwd)
  );
}

export async function getPackageImportAliases(cwd: string) {
  const entries = await getPackageImportEntries(cwd);
  const rootWildcardDefaults = entries.some(entry => entry.key === "#*")
    ? {
        components: "#components",
        ui: "#components/ui",
        lib: "#lib",
        hooks: "#hooks",
        utils: "#lib/utils"
      }
    : null;

  return {
    components:
      findBestAlias(entries, "components") ?? rootWildcardDefaults?.components,
    ui: findBestAlias(entries, "ui") ?? rootWildcardDefaults?.ui,
    lib: findBestAlias(entries, "lib") ?? rootWildcardDefaults?.lib,
    hooks: findBestAlias(entries, "hooks") ?? rootWildcardDefaults?.hooks,
    utils: findBestAlias(entries, "utils") ?? rootWildcardDefaults?.utils
  };
}

function findBestAlias(
  entries: PackageImportEntry[],
  kind: "components" | "ui" | "lib" | "hooks" | "utils"
) {
  const matches = entries
    .map(entry => ({
      entry,
      score: getAliasScore(entry, kind)
    }))
    .filter(match => match.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || b.entry.aliasBase.length - a.entry.aliasBase.length
    );

  return matches[0]?.entry.aliasBase;
}

function getAliasScore(
  entry: PackageImportEntry,
  kind: "components" | "ui" | "lib" | "hooks" | "utils"
) {
  const aliasBase = entry.aliasBase.toLowerCase();
  const normalizedTarget = normalizeTarget(entry.target).toLowerCase();

  switch (kind) {
    case "components":
      if (
        aliasBase.endsWith("/ui") ||
        normalizedTarget.includes("/components/ui")
      ) {
        return 0;
      }
      if (includesPathSegment(aliasBase, "components")) return 4;
      if (includesPathSegment(normalizedTarget, "components")) return 3;
      return 0;
    case "ui":
      if (aliasBase.endsWith("/ui") || aliasBase === "#ui") return 5;
      if (normalizedTarget.includes("/components/ui")) return 4;
      if (normalizedTarget.endsWith("/ui")) return 3;
      return 0;
    case "lib":
      if (aliasBase === "#lib" || aliasBase.endsWith("/lib")) return 5;
      if (normalizedTarget.endsWith("/lib")) return 4;
      if (includesPathSegment(normalizedTarget, "lib")) return 3;
      return 0;
    case "hooks":
      if (aliasBase === "#hooks" || aliasBase.endsWith("/hooks")) return 5;
      if (normalizedTarget.endsWith("/hooks")) return 4;
      if (includesPathSegment(normalizedTarget, "hooks")) return 3;
      return 0;
    case "utils":
      if (aliasBase === "#utils" || aliasBase.endsWith("/utils")) return 5;
      if (normalizedTarget.endsWith("/lib/utils")) return 4;
      if (normalizedTarget.endsWith("/utils")) return 3;
      return 0;
  }
}

function normalizeTarget(target: string) {
  return target
    .replace(/\/\*$/, "")
    .replace(/\*$/, "")
    .replace(/\/index\.[^/]+$/, "");
}

function includesPathSegment(value: string, segment: string) {
  return (
    value === segment ||
    value.includes(`/${segment}`) ||
    value.includes(`${segment}/`)
  );
}

function getSharedPackageImportPrefix(aliasBases: string[]) {
  const sharedSegments = aliasBases
    .map(aliasBase => aliasBase.slice(1).split("/").filter(Boolean))
    .reduce<string[]>((shared, segments, index) => {
      if (!index) {
        return segments;
      }

      return shared.filter((segment, segmentIndex) => {
        return segments[segmentIndex] === segment;
      });
    }, []);

  return sharedSegments.length ? `#${sharedSegments.join("/")}` : "#";
}
