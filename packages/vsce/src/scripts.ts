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

/**
 * Templates for pierre-style VS Code packaging / publishing scripts.
 *
 * @see https://github.com/pierrecomputer/pierre/tree/main/packages/theme/scripts
 */

export function renderVsixPackageShim(extensionName: string): string {
  return `import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

interface PackageJson {
  name?: unknown;
  [key: string]: unknown;
}

const scriptDir = dirname(fileURLToPath(import.meta.url));
export const packageRoot = join(scriptDir, "..");
const packageJsonPath = join(packageRoot, "package.json");
const readmePath = join(packageRoot, "README.md");
const vsceReadmePath = join(scriptDir, "README.package.md");
const readmeBackupPath = join(packageRoot, "README.md.bak");

/**
 * Temporarily rewrite package.json / README for VSIX tooling.
 *
 * VSIX packaging reads package.json and README.md from the extension root,
 * while an npm-scoped package may keep a different name and README.
 */
export function withVsixPackageShim(action: () => void): void {
  const originalPackageJson = readFileSync(packageJsonPath, "utf8");
  const packageJson = JSON.parse(originalPackageJson) as PackageJson;

  if (typeof packageJson.name !== "string") {
    throw new TypeError("package.json must define a string name");
  }

  const originalName = packageJson.name;
  const extensionName = ${JSON.stringify(extensionName)};
  packageJson.name = extensionName;
  delete packageJson.files;

  console.log(
    \`Temporarily renaming package: \${originalName} -> \${extensionName}\\n\`
  );

  const hadReadme = existsSync(readmePath);

  try {
    writeFileSync(packageJsonPath, \`\${JSON.stringify(packageJson, null, 2)}\\n\`);

    if (hadReadme) {
      renameSync(readmePath, readmeBackupPath);
    }
    if (existsSync(vsceReadmePath)) {
      renameSync(vsceReadmePath, readmePath);
    }

    action();
  } finally {
    if (existsSync(readmePath) && existsSync(vsceReadmePath) === false) {
      renameSync(readmePath, vsceReadmePath);
    }
    if (hadReadme && existsSync(readmeBackupPath)) {
      renameSync(readmeBackupPath, readmePath);
    }

    writeFileSync(packageJsonPath, originalPackageJson);
    console.log(\`\\nRestored package name: \${originalName}\`);
  }
}
`;
}

export function renderBuildVsCodePackageScript(): string {
  return `import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { packageRoot, withVsixPackageShim } from "./vsixPackageShim.ts";

mkdirSync(join(packageRoot, "artifacts", "vsix"), { recursive: true });

withVsixPackageShim(() => {
  execFileSync(
    "pnpm",
    [
      "exec",
      "vsce",
      "package",
      "--no-dependencies",
      "--out",
      "artifacts/vsix"
    ],
    {
      cwd: packageRoot,
      stdio: "inherit"
    }
  );
});
`;
}

export function renderPublishVsceScript(): string {
  return `import { execFileSync } from "node:child_process";
import { packageRoot, withVsixPackageShim } from "./vsixPackageShim.ts";

// Manual VS Marketplace publish. Requires VSCE_PAT in the environment.
const vscePat = process.env.VSCE_PAT;

if (vscePat === undefined || vscePat.length === 0) {
  throw new Error("VSCE_PAT must be set to publish the VS Code extension");
}

withVsixPackageShim(() => {
  execFileSync("pnpm", ["exec", "vsce", "publish", "--no-dependencies"], {
    cwd: packageRoot,
    env: { ...process.env, VSCE_PAT: vscePat },
    stdio: "inherit"
  });
});
`;
}

export function renderPublishOvsxScript(): string {
  return `import { execFileSync } from "node:child_process";
import { packageRoot, withVsixPackageShim } from "./vsixPackageShim.ts";

// Manual Open VSX publish. Requires OVSX_PAT in the environment.
const ovsxPat = process.env.OVSX_PAT;

if (ovsxPat === undefined || ovsxPat.length === 0) {
  throw new Error("OVSX_PAT must be set to publish the Open VSX extension");
}

withVsixPackageShim(() => {
  execFileSync("pnpm", ["exec", "ovsx", "publish", "--no-dependencies"], {
    cwd: packageRoot,
    env: { ...process.env, OVSX_PAT: ovsxPat },
    stdio: "inherit"
  });
});
`;
}

export function renderPackageReadme(options: {
  displayName: string;
  description: string;
  themes: Array<{ label: string }>;
  repositoryUrl?: string;
}): string {
  const themeList = options.themes.map(theme => `- ${theme.label}`).join("\n");

  const links = options.repositoryUrl
    ? `\n## Links\n\n- [GitHub](${options.repositoryUrl})\n`
    : "";

  return `# ${options.displayName}

${options.description}

## Installation

1. Open the Extensions view (\`Cmd+Shift+X\` / \`Ctrl+Shift+X\`)
2. Search for **${options.displayName}**
3. Click **Install**
4. Open the Command Palette (\`Cmd+Shift+P\` / \`Ctrl+Shift+P\`) → **Color Theme** → select a theme

## Themes

${themeList || "- (generated themes)"}
${links}`;
}

export function renderVsCodeIgnore(): string {
  return `node_modules/**
src/**
scripts/**
test/**
tests/**
.github/**
.vscode/**

.gitignore
*.tsbuildinfo
*.vsix
artifacts/**
README.md.bak
.DS_Store
`;
}
