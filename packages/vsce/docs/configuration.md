---
title: Configure @razorwind/vsce
description: Pass mapTheme and any required package fields.
documentType: reference
---

# Configure @razorwind/vsce

Paths are relative to the Razorwind execution directory.

`includeTypes` limits helper rows passed into the mapper. It does not filter the token tree `mapTheme` receives.

### `VscePluginOptions`

Declared in `vsce/src/types.ts`.

| Option | Required | Type | Description |
| --- | --- | --- | --- |
| `outputPath` | No | `string` | Directory (relative to the execution cwd) for the generated extension package. Default: "vscode-extension" |
| `mapTheme` | Yes | `GenerateVsCodeTheme` | Map extracted tokens to VS Code theme JSON document(s). Required — without a mapping there is nothing to emit. |
| `name` | Yes | `string` | Unscoped Marketplace extension id (`contributes` / VSIX name). Must not include an npm scope. |
| `displayName` | No | `string` | See the type declaration. |
| `description` | No | `string` | See the type declaration. |
| `version` | No | `string` | Extension version (semver without prerelease tags — vsce rejects them). Default: "0.0.1" |
| `publisher` | Yes | `string` | See the type declaration. |
| `extensionName` | No | `string` | Unscoped name written into the VSIX shim when packaging. Defaults to name. |
| `license` | No | `string` | Default: "Apache-2.0" |
| `repository` | No | `object` | See the type declaration. |
| `homepage` | No | `string` | See the type declaration. |
| `bugs` | No | `object` | See the type declaration. |
| `author` | No | `VscePackageAuthor` | See the type declaration. |
| `icon` | No | `string` | Icon path relative to the extension root (e.g. `icon.png`). The file itself is not generated — place it beside the package. |
| `galleryBanner` | No | `object` | See the type declaration. |
| `categories` | No | `string[]` | Default: ["Themes"] |
| `keywords` | No | `string[]` | See the type declaration. |
| `engines` | No | `object` | Default: { vscode: "^1.85.0" } |
| `includeScripts` | No | `boolean` | Emit pierre-style `scripts/` helpers and `package.json` script entries for packaging / publishing. Default: true |
| `readme` | No | `string` | Marketplace README body. When omitted, a minimal install guide is generated from the contributed themes. |
| `includeTypes` | No | `TokenType[]` | Restrict flattened helper tokens to these DTCG `$type` values. Does not filter what mapTheme receives. |
| `packageJson` | No | `Record<string, unknown>` | Extra fields merged into the generated extension `package.json` (shallow merge; `contributes.themes` / `scripts` from the plugin win). |
| `installGuide` | No | `string` | Override body for generated `INSTALL.md`. When omitted, VS Code extension install steps are generated from contributed themes. |
