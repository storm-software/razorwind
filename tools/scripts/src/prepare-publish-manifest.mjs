#!/usr/bin/env zx
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

import { readPnpmWorkspaceFile } from "@storm-software/pnpm-tools";
import { existsSync } from "node:fs";
import {
  copyFile,
  cp,
  mkdir,
  readdir,
  readFile,
  writeFile
} from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { argv, chalk, echo } from "zx";

const DEP_FIELDS = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies"
];

function resolveWorkspaceRoot() {
  return join(dirname(fileURLToPath(import.meta.url)), "../../..");
}

function catalogRecord(catalog) {
  if (!catalog || typeof catalog !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(catalog).map(([name, version]) => [
      name,
      String(version).replaceAll('"', "").replaceAll("'", "")
    ])
  );
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function workspacePackageVersions(workspaceRoot) {
  const packagesDir = join(workspaceRoot, "packages");
  const entries = await readdir(packagesDir, { withFileTypes: true });
  const versions = {};
  const privatePackages = new Set();

  await Promise.all(
    entries
      .filter(entry => entry.isDirectory())
      .map(async entry => {
        const packageJsonPath = join(packagesDir, entry.name, "package.json");
        if (!existsSync(packageJsonPath)) {
          return;
        }

        const packageJson = await readJson(packageJsonPath);
        if (!packageJson?.name || !packageJson.version) {
          return;
        }

        if (packageJson.private === true) {
          privatePackages.add(packageJson.name);
          return;
        }

        versions[packageJson.name] = packageJson.version;
      })
  );

  return { versions, privatePackages };
}

function resolveDependencyVersion(
  dependencyName,
  specifier,
  catalog,
  workspaceVersions,
  privatePackages
) {
  if (specifier === "catalog:" || specifier === "catalog:default") {
    const version = catalog[dependencyName];
    if (!version) {
      throw new Error(
        `Dependency "${dependencyName}" uses \`catalog:\` but is not in pnpm-workspace.yaml`
      );
    }

    return version;
  }

  if (typeof specifier === "string" && specifier.startsWith("catalog:")) {
    throw new Error(
      `Named pnpm catalogs are not supported (dependency "${dependencyName}": "${specifier}")`
    );
  }

  if (typeof specifier === "string" && specifier.startsWith("workspace:")) {
    if (privatePackages.has(dependencyName)) {
      return undefined;
    }

    const version = workspaceVersions[dependencyName];
    if (!version) {
      throw new Error(
        `Workspace dependency "${dependencyName}" was not found among public workspace packages`
      );
    }

    return `^${version}`;
  }

  return specifier;
}

function resolveManifest(
  packageJson,
  catalog,
  workspaceVersions,
  privatePackages
) {
  for (const field of DEP_FIELDS) {
    const dependencies = packageJson[field];
    if (!dependencies || typeof dependencies !== "object") {
      continue;
    }

    for (const [dependencyName, specifier] of Object.entries(dependencies)) {
      const resolved = resolveDependencyVersion(
        dependencyName,
        specifier,
        catalog,
        workspaceVersions,
        privatePackages
      );

      if (resolved === undefined) {
        delete dependencies[dependencyName];
        continue;
      }

      dependencies[dependencyName] = resolved;
    }

    if (Object.keys(dependencies).length === 0) {
      delete packageJson[field];
    }
  }

  const unresolved = [];
  for (const field of DEP_FIELDS) {
    const dependencies = packageJson[field];
    if (!dependencies) {
      continue;
    }

    for (const [dependencyName, specifier] of Object.entries(dependencies)) {
      if (
        typeof specifier === "string" &&
        (specifier === "catalog:" ||
          specifier.startsWith("catalog:") ||
          specifier.startsWith("workspace:"))
      ) {
        unresolved.push(`${field}.${dependencyName}=${specifier}`);
      }
    }
  }

  if (unresolved.length > 0) {
    throw new Error(
      `Publish manifest still contains unresolved dependency protocols:\n- ${unresolved.join("\n- ")}`
    );
  }

  return packageJson;
}

async function copyPublishFiles(
  projectRoot,
  sourceDir,
  destDir,
  workspaceRoot
) {
  await mkdir(destDir, { recursive: true });

  const packageJsonPath = join(sourceDir, "package.json");
  if (!existsSync(packageJsonPath)) {
    throw new Error(`No package.json found at ${packageJsonPath}`);
  }

  await copyFile(packageJsonPath, join(destDir, "package.json"));

  const sourceEntries = await readdir(sourceDir);
  await Promise.all(
    sourceEntries
      .filter(entry => entry.endsWith(".md"))
      .map(entry => copyFile(join(sourceDir, entry), join(destDir, entry)))
  );

  const licenseCandidates = [
    join(sourceDir, "LICENSE"),
    join(workspaceRoot, "LICENSE")
  ];
  for (const licensePath of licenseCandidates) {
    if (existsSync(licensePath)) {
      await copyFile(licensePath, join(destDir, "LICENSE"));
      break;
    }
  }

  const sourceDist = join(sourceDir, "dist");
  if (existsSync(sourceDist)) {
    await cp(sourceDist, join(destDir, "dist"), { recursive: true });
  }

  echo`${chalk.whiteBright(
    `  Copied publish files for ${projectRoot} to ${relative(workspaceRoot, destDir)}`
  )}`;
}

try {
  const workspaceRoot = resolveWorkspaceRoot();
  const projectRoot = argv.projectRoot;
  if (!projectRoot || typeof projectRoot !== "string") {
    throw new Error(
      "Missing --projectRoot. Example: --projectRoot=packages/core"
    );
  }

  const sourceDir = join(workspaceRoot, projectRoot);
  const destDir = join(workspaceRoot, "dist", projectRoot);

  echo`${chalk.whiteBright(` 📦  Preparing publish manifest for ${projectRoot}`)}`;

  await copyPublishFiles(projectRoot, sourceDir, destDir, workspaceRoot);

  const workspaceFile = await readPnpmWorkspaceFile(workspaceRoot);
  const catalog = catalogRecord(workspaceFile?.catalog);
  const { versions, privatePackages } =
    await workspacePackageVersions(workspaceRoot);

  const packageJsonPath = join(destDir, "package.json");
  const packageJson = await readJson(packageJsonPath);
  const resolved = resolveManifest(
    packageJson,
    catalog,
    versions,
    privatePackages
  );

  await writeFile(
    packageJsonPath,
    `${JSON.stringify(resolved, null, 2)}\n`,
    "utf8"
  );

  echo`${chalk.green(
    ` ✔ Resolved catalog: and workspace:* versions for ${packageJson.name}`
  )}`;
} catch (error) {
  echo`${chalk.red(
    error?.message
      ? error.message
      : "A failure occurred while preparing the publish manifest"
  )}`;

  process.exit(1);
}
