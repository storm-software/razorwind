/* -------------------------------------------------------------------

                    🗲 Storm Software - Razorwind

 This code was released as part of the Razorwind project. Razorwind
 is maintained by Storm Software under the Apache-2.0 license, and is
 free for commercial and private use. For more information, please visit
 our licensing page at https://stormsoftware.com/licenses/projects/razorwind.

    10| Website:                  https://stormsoftware.com
 Repository:               https://github.com/storm-software/razorwind
 Documentation:            https://docs.stormsoftware.com/projects/razorwind
 Contact:                  https://stormsoftware.com/contact

 SPDX-License-Identifier:  Apache-2.0

 ------------------------------------------------------------------- */

import { existsSync } from "@stryke/fs/exists";
import { readJsonFile } from "@stryke/fs/json";
import { joinPaths } from "@stryke/path/join";
import { isSetObject } from "@stryke/type-checks/is-set-object";
import { isSetString } from "@stryke/type-checks/is-set-string";
import { defu } from "defu";
import type { Schema } from "../../schema";
import type { UserConfig } from "../../types/config";
import { hasUrl, normalizeUrl } from "./normalize-url";
import { titleCase } from "@stryke/string-format/title-case";

/** Design-system identity fields mirrored on {@link Schema}. */
export type SchemaMeta = Pick<
  Schema,
  "name" | "title" | "repository" | "homepage" | "description" | "logo"
>;

function pickStringField(
  source: Record<string, unknown>,
  key: string
): string | undefined {
  const value = source[key];
  return isSetString(value) ? value : undefined;
}

/**
 * Map npm `package.json` fields (and optional `razorwind` object) into
 * design-system {@link SchemaMeta}.
 */
export function schemaMetaFromPackageJson(
  pkg: Record<string, unknown>
): SchemaMeta {
  const fromNpm: SchemaMeta = {};

  if (isSetString(pkg.name)) {
    fromNpm.name = pkg.name;
  }
  if (isSetString(pkg.description)) {
    fromNpm.description = pkg.description;
  }
  if (isSetString(pkg.homepage)) {
    fromNpm.homepage = pkg.homepage;
  }

  const repository = normalizeUrl(pkg.repository);
  if (repository) {
    fromNpm.repository = repository;
  }

  // Non-standard top-level `logo` accepted when present.
  if (isSetString(pkg.logo)) {
    fromNpm.logo = pkg.logo;
  }

  const razorwind = pkg.razorwind;
  const fromRazorwind: SchemaMeta = {};

  if (isSetObject(razorwind)) {
    const razorwindRecord = razorwind as Record<string, unknown>;
    const title = pickStringField(razorwindRecord, "title");
    const name = pickStringField(razorwindRecord, "name");
    const description = pickStringField(razorwindRecord, "description");
    const homepage = pickStringField(razorwindRecord, "homepage");
    const logo = pickStringField(razorwindRecord, "logo");
    const repositoryField = normalizeUrl(razorwindRecord.repository);

    if (name) {
      fromRazorwind.name = name;
    } else if (isSetString(pkg.name)) {
      fromRazorwind.name = pkg.name;
    }

    if (title) {
      fromRazorwind.title = title;
    } else if (isSetString(fromRazorwind.name)) {
      fromRazorwind.title = titleCase(fromRazorwind.name);
    }

    if (description) {
      fromRazorwind.description = description;
    } else if (isSetString(pkg.description)) {
      fromRazorwind.description = pkg.description;
    }

    if (homepage) {
      fromRazorwind.homepage = homepage;
    } else if (hasUrl(pkg.homepage)) {
      fromRazorwind.homepage = normalizeUrl(pkg.homepage);
    } else if (hasUrl(pkg.author)) {
      fromRazorwind.homepage = normalizeUrl(pkg.author);
    } else if (pkg.maintainers && Array.isArray(pkg.maintainers) && pkg.maintainers.length > 0 && hasUrl(pkg.maintainers[0])) {
      fromRazorwind.homepage = normalizeUrl(pkg.maintainers[0]);
    } else if (pkg.contributors && Array.isArray(pkg.contributors) && pkg.contributors.length > 0 && hasUrl(pkg.contributors[0])) {
      fromRazorwind.homepage = normalizeUrl(pkg.contributors[0]);
    } else if (hasUrl(pkg.bugs)) {
      fromRazorwind.homepage = normalizeUrl(pkg.bugs);
    }

    if (logo) {
      fromRazorwind.logo = logo;
    }

    if (repositoryField) {
      fromRazorwind.repository = repositoryField;
    } else if (hasUrl(pkg.repository)) {
      fromRazorwind.repository = normalizeUrl(pkg.repository);
    }
  }

  // `razorwind` overlays npm fields (defu: first argument wins).
  return defu(fromRazorwind, fromNpm);
}

/**
 * Copy identity fields from resolved {@link UserConfig} onto {@link SchemaMeta}.
 */
export function schemaMetaFromConfig(config: UserConfig): SchemaMeta {
  const meta: SchemaMeta = {};

  if (isSetString(config.name)) {
    meta.name = config.name;
  }
  if (isSetString(config.title)) {
    meta.title = config.title;
  }
  if (isSetString(config.description)) {
    meta.description = config.description;
  }
  if (isSetString(config.repository)) {
    meta.repository = config.repository;
  }
  if (isSetString(config.homepage)) {
    meta.homepage = config.homepage;
  }
  if (isSetString(config.logo)) {
    meta.logo = config.logo;
  }

  return meta;
}

/**
 * Load design-system metadata from the workspace root `package.json`.
 */
export async function loadSchemaMetaFromPackageJson(
  cwd: string
): Promise<SchemaMeta> {
  const packageJsonPath = joinPaths(cwd, "package.json");
  if (!existsSync(packageJsonPath)) {
    return {};
  }

  let pkg: Record<string, unknown>;
  try {
    pkg = await readJsonFile<Record<string, unknown>>(packageJsonPath);
  } catch {
    return {};
  }

  return schemaMetaFromPackageJson(pkg);
}

/**
 * Resolve Schema identity: UserConfig overlays workspace `package.json`.
 */
export async function resolveSchemaMeta(
  cwd: string,
  config: UserConfig
): Promise<SchemaMeta> {
  const fromPackage = await loadSchemaMetaFromPackageJson(cwd);
  const fromConfig = schemaMetaFromConfig(config);

  return defu(fromConfig, fromPackage);
}
