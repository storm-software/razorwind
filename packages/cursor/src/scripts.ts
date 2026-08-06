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
 * Templates for Cursor theme packaging scripts.
 *
 * Cursor installs themes via VSIX (`Extensions: Install from VSIX...`),
 * matching the Dracula Cursor workflow.
 *
 * @see https://draculatheme.com/cursor
 * @see https://github.com/dracula/cursor
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

/**
 * Package a VSIX into `dist/<extensionName>.vsix` for Cursor install.
 *
 * @see https://draculatheme.com/cursor
 */
export function renderBuildCursorPackageScript(extensionName: string): string {
  const vsixOut = `dist/${extensionName}.vsix`;

  return `import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { packageRoot, withVsixPackageShim } from "./vsixPackageShim.ts";

mkdirSync(join(packageRoot, "dist"), { recursive: true });

withVsixPackageShim(() => {
  execFileSync(
    "pnpm",
    [
      "exec",
      "vsce",
      "package",
      "--no-dependencies",
      "--out",
      ${JSON.stringify(vsixOut)}
    ],
    {
      cwd: packageRoot,
      stdio: "inherit"
    }
  );
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

See **INSTALL.md** for Cursor VSIX install steps (\`Extensions: Install from VSIX...\`).

## Themes

${themeList || "- (generated themes)"}
${links}`;
}

/**
 * Cursor-specific install guide (VSIX via Command Palette).
 *
 * @see https://draculatheme.com/cursor
 */
export function renderInstallMd(options: {
  displayName: string;
  extensionName: string;
  themes: Array<{ label: string; path: string }>;
}): string {
  const themeFiles = options.themes
    .map(theme => `- \`${theme.path}\` — ${theme.label}`)
    .join("\n");
  const themeLabels = options.themes
    .map(theme => `- **${theme.label}**`)
    .join("\n");
  const vsixPath = `./dist/${options.extensionName}.vsix`;

  return `# Installing ${options.displayName}

Generated by \`@razorwind/cursor\`.

Cursor is a VS Code fork and loads VS Code–compatible theme extensions via VSIX.

## Files

- \`package.json\` — extension manifest (\`contributes.themes\`)
- \`themes/*.json\` — color theme documents
${themeFiles}

## Package VSIX

From the generated extension directory:

\`\`\`bash
pnpm package-vsix
\`\`\`

This writes \`${vsixPath}\`.

## Install in Cursor

1. Open the Command Palette (\`Ctrl+Shift+P\` / \`Cmd+Shift+P\`)
2. Run **Extensions: Install from VSIX...**
3. Select \`${vsixPath}\`
4. Open **Preferences: Color Theme** and pick one of:

${themeLabels}

## Select theme

\`Preferences → Color Theme\` (or Command Palette → **Color Theme**) → choose a contributed label above.
`;
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
dist/**
artifacts/**
README.md.bak
INSTALL.md
.DS_Store
`;
}
