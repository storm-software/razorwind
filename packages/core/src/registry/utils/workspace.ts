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

import { getWorkspaceRoot } from "@stryke/fs/get-workspace-root";
import { readJsonFile } from "@stryke/fs/json";
import { readFile } from "@stryke/fs/read-file";
import { isAbsolute } from "@stryke/path/is-type";
import { joinPaths } from "@stryke/path/join";
import type { PackageJson } from "@stryke/types/package-json";
import fg from "fast-glob";
import { existsSync } from "node:fs";
import path from "node:path";
import { getPackageInfo } from "./get-project-info";
import type {
  ImportResolutionEntry,
  ImportResolutionMatch
} from "./import-matcher";
import {
  getImportTargetEmitMode,
  resolveImportEntryMatch,
  resolveLocalPathTarget
} from "./import-matcher";

function parsePackageSpecifier(importPath: string) {
  if (
    importPath.startsWith("#") ||
    importPath.startsWith(".") ||
    isAbsolute(importPath)
  ) {
    return null;
  }

  const segments = importPath.split("/");

  if (importPath.startsWith("@")) {
    if (segments.length < 2) {
      return null;
    }

    return {
      packageName: `${segments[0]}/${segments[1]}`
    };
  }

  return {
    packageName: segments[0]
  };
}

interface WorkspacePackageInfo {
  packageName: string;
  packageRoot: string;
}

type WorkspacePackageExportEntry = ImportResolutionEntry;
export type WorkspacePackageExportMatch = ImportResolutionMatch;

const workspacePackageCache = new Map<
  string,
  Map<string, WorkspacePackageInfo>
>();
const workspaceExportEntriesCache = new Map<
  string,
  WorkspacePackageExportEntry[]
>();

export function parsePnpmWorkspacePackages(content: string) {
  const patterns: string[] = [];
  let inPackages = false;
  let packagesIndent = 0;

  for (const line of content.split("\n")) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const keyMatch = line.match(/^(\s*)([\w-]+)\s*:/);
    if (keyMatch) {
      packagesIndent = keyMatch[1]?.length ?? 0;
      inPackages = keyMatch[2] === "packages";
      continue;
    }

    if (!inPackages) {
      continue;
    }

    // eslint-disable-next-line regexp/no-super-linear-backtracking
    const itemMatch = line.match(/^(\s*)-\s*(.+?)\s*(?:#.*)?$/);
    if ((!itemMatch || itemMatch[1]?.length) ?? packagesIndent >= 0) {
      continue;
    }

    patterns.push(itemMatch[2]?.trim().replace(/^["']|["']$/g, "") ?? "");
  }

  return patterns;
}

export async function getWorkspacePatterns(cwd: string) {
  const patterns: string[] = [];

  // Read pnpm-workspace.yaml.
  const pnpmWorkspacePath = path.resolve(cwd, "pnpm-workspace.yaml");
  if (existsSync(pnpmWorkspacePath)) {
    const content = await readFile(pnpmWorkspacePath);
    patterns.push(...parsePnpmWorkspacePackages(content));
  }

  // Read package.json workspaces.
  const packageJsonPath = joinPaths(cwd, "package.json");
  if (existsSync(packageJsonPath)) {
    try {
      const packageJson = await readJsonFile<PackageJson>(packageJsonPath);
      const workspacesField = packageJson.workspaces;
      const workspaces = Array.isArray(workspacesField)
        ? workspacesField
        : workspacesField?.packages;
      if (Array.isArray(workspaces)) {
        // Filter out negation patterns.
        patterns.push(...workspaces.filter((w: string) => !w.startsWith("!")));
      }
    } catch {
      // Ignore parse errors.
    }
  }

  return Array.from(new Set(patterns));
}

async function loadWorkspacePackages(root: string) {
  const patterns = await getWorkspacePatterns(root);
  const packageMap = new Map<string, WorkspacePackageInfo>();

  if (!patterns.length) {
    return packageMap;
  }

  const packageJsonPaths = await fg(
    patterns.map(pattern =>
      path.posix.join(pattern.split(path.sep).join("/"), "package.json")
    ),
    {
      cwd: root,
      ignore: ["**/node_modules/**"]
    }
  );

  for (const packageJsonPath of packageJsonPaths) {
    const packageRoot = path.resolve(root, path.dirname(packageJsonPath));
    const packageInfo = await getPackageInfo(packageRoot);
    const name = packageInfo?.name;

    if (!name) {
      continue;
    }

    packageMap.set(name, {
      packageName: name,
      packageRoot
    });
  }

  return packageMap;
}

async function findWorkspacePackage(cwd: string, packageName: string) {
  const workspaceRoot = getWorkspaceRoot(cwd);

  if (!workspaceRoot) {
    return null;
  }

  const cachedPackages = workspacePackageCache.get(workspaceRoot);

  if (cachedPackages?.has(packageName)) {
    return cachedPackages.get(packageName) ?? null;
  }

  const workspacePackages = await loadWorkspacePackages(workspaceRoot);
  workspacePackageCache.set(workspaceRoot, workspacePackages);

  return workspacePackages.get(packageName) ?? null;
}

function getAliasBase(packageName: string, exportKey: string) {
  if (exportKey === ".") {
    return packageName;
  }

  const normalizedKey = exportKey.slice(2).replace(/\/\*$/, "");

  return normalizedKey ? `${packageName}/${normalizedKey}` : packageName;
}

async function getWorkspacePackageExportEntries(
  workspacePackage: WorkspacePackageInfo
) {
  const cacheKey = `${workspacePackage.packageRoot}:${workspacePackage.packageName}`;
  const cachedEntries = workspaceExportEntriesCache.get(cacheKey);

  if (cachedEntries) {
    return cachedEntries;
  }

  const packageInfo = await getPackageInfo(workspacePackage.packageRoot);
  const exportsField = packageInfo?.exports;

  if (
    !exportsField ||
    typeof exportsField !== "object" ||
    Array.isArray(exportsField)
  ) {
    workspaceExportEntriesCache.set(cacheKey, []);
    return [];
  }

  const entries: WorkspacePackageExportEntry[] = [];
  for (const [key, value] of Object.entries(exportsField)) {
    if (key !== "." && !key.startsWith("./")) {
      continue;
    }

    const target = resolveLocalPathTarget(value);
    if (!target) {
      continue;
    }

    const aliasBase = getAliasBase(workspacePackage.packageName, key);

    entries.push({
      key: key.includes("*") ? `${aliasBase}/*` : aliasBase,
      aliasBase,
      target,
      emitMode: getImportTargetEmitMode(target),
      hasWildcard: key.includes("*"),
      rootDir: workspacePackage.packageRoot
    });
  }

  workspaceExportEntriesCache.set(cacheKey, entries);
  return entries;
}

export async function resolveWorkspacePackageExport(
  importPath: string,
  cwd: string
) {
  const specifier = parsePackageSpecifier(importPath);
  if (!specifier?.packageName) {
    return null;
  }

  const workspacePackage = await findWorkspacePackage(
    cwd,
    specifier.packageName
  );

  if (!workspacePackage) {
    return null;
  }

  return resolveImportEntryMatch(
    importPath,
    await getWorkspacePackageExportEntries(workspacePackage)
  );
}
