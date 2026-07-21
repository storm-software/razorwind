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

import { getWorkspaceRoot } from "@stryke/fs/get-workspace-root";
import type { TsConfigJson } from "@stryke/types/tsconfig";
import type { ConfigLoaderSuccessResult } from "tsconfig-paths";
import { createMatchPath } from "tsconfig-paths";
import type { ImportEmitMode } from "./import-matcher";
import { getPatternWildcardValue } from "./import-matcher";
import { resolvePackageImport } from "./package-imports";
import { resolveWorkspacePackageExport } from "./workspace";

export interface ResolvedImport {
  path: string;
  source: "tsconfig_paths" | "package_imports" | "workspace_package_exports";
  matchedAlias: string;
  matchedTarget: string;
  emitMode: ImportEmitMode;
}

type ResolveImportConfig = Pick<
  NonNullable<TsConfigJson["compilerOptions"]>,
  "baseUrl" | "paths"
> & {
  cwd?: string;
};

export async function resolveImportWithMetadata(
  importPath: string,
  config: ResolveImportConfig
) {
  const cwd = config.cwd ?? config.baseUrl ?? getWorkspaceRoot();
  if (importPath.startsWith("#")) {
    const resolved = await resolvePackageImport(importPath, cwd);
    if (resolved) {
      return {
        path: resolved.path,
        source: "package_imports",
        matchedAlias: resolved.matchedAlias,
        matchedTarget: resolved.matchedTarget,
        emitMode: resolved.emitMode
      } satisfies ResolvedImport;
    }
  }

  const workspaceResolved = await resolveWorkspacePackageExport(
    importPath,
    cwd
  );

  if (workspaceResolved) {
    return {
      path: workspaceResolved.path,
      source: "workspace_package_exports",
      matchedAlias: workspaceResolved.matchedAlias,
      matchedTarget: workspaceResolved.matchedTarget,
      emitMode: workspaceResolved.emitMode
    } satisfies ResolvedImport;
  }

  return resolveFromTsconfigPaths(importPath, config);
}

export async function resolveImport(
  importPath: string,
  config: ResolveImportConfig
) {
  return (await resolveImportWithMetadata(importPath, config))?.path ?? null;
}

export function isLocalAliasImport(
  moduleSpecifier: string,
  aliasPrefix: string | null
) {
  // Workspace package exports such as `@workspace/ui/...` are already the final
  // import specifiers we want to keep, so they are intentionally excluded here.
  if (moduleSpecifier.startsWith("#")) {
    return true;
  }

  if (!aliasPrefix) {
    return false;
  }

  return moduleSpecifier.startsWith(`${aliasPrefix}/`);
}

function isScopedPackageSpecifier(importPath: string) {
  return /^@[^/]+\/[^/]+(?:\/.*)?$/.test(importPath);
}

function resolveFromTsconfigPaths(
  importPath: string,
  config: ResolveImportConfig
) {
  const matchedPath = createMatchPath(
    config.baseUrl || config.cwd || getWorkspaceRoot(),
    config.paths ?? {}
  )(importPath, undefined, () => true, [".ts", ".tsx", ".jsx", ".js", ".css"]);

  if (!matchedPath) {
    return null;
  }

  const matchedPattern = findMatchingTsPathPattern(
    importPath,
    config.paths ?? {}
  );

  if (!matchedPattern && isScopedPackageSpecifier(importPath)) {
    return null;
  }

  return {
    path: matchedPath,
    source: "tsconfig_paths",
    matchedAlias: matchedPattern?.key ?? importPath,
    matchedTarget: matchedPattern?.target ?? matchedPath,
    emitMode: "strip_extension"
  };
}

function findMatchingTsPathPattern(
  importPath: string,
  paths: ConfigLoaderSuccessResult["paths"]
) {
  for (const [key, targets] of Object.entries(paths)) {
    const targetList = Array.isArray(targets) ? targets : [targets];
    const wildcardValue = getPatternWildcardValue(importPath, key);

    if (wildcardValue === null) {
      continue;
    }

    return {
      key,
      target:
        targetList[0]?.includes("*") && wildcardValue !== null
          ? targetList[0].replace(/\*/g, wildcardValue)
          : targetList[0]
    };
  }

  return null;
}
