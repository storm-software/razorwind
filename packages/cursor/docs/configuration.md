---
title: Configure @razorwind/cursor
description: Pass mapTheme and any required package fields.
documentType: reference
---

# Configure @razorwind/cursor

Paths are relative to the Razorwind execution directory.

`includeTypes` limits helper rows passed into the mapper. It does not filter the token tree `mapTheme` receives.

### `CursorPluginOptions`

Declared in `cursor/src/types.ts`.

| Option | Required | Type | Description |
| --- | --- | --- | --- |
| `outputPath` | No | `string` | Directory (relative to the execution cwd) for the generated extension package. Default: "cursor-extension" |
| `mapTheme` | Yes | `GenerateCursorTheme` | Map extracted tokens to Cursor theme JSON document(s). Required — without a mapping there is nothing to emit. |
| `name` | Yes | `string` | Unscoped extension id (`contributes` / VSIX name). Must not include an npm scope. |
| `displayName` | No | `string` | See the type declaration. |
| `description` | No | `string` | See the type declaration. |
| `version` | No | `string` | Extension version (semver without prerelease tags — vsce rejects them). Default: "0.0.1" |
| `publisher` | Yes | `string` | See the type declaration. |
| `extensionName` | No | `string` | Unscoped name written into the VSIX shim when packaging. Defaults to name. |
| `license` | No | `string` | Default: "Apache-2.0" |
| `repository` | No | `object` | See the type declaration. |
| `homepage` | No | `string` | See the type declaration. |
| `bugs` | No | `object` | See the type declaration. |
| `author` | No | `CursorPackageAuthor` | See the type declaration. |
| `icon` | No | `string` | Icon path relative to the extension root (e.g. `icon.png`). The file itself is not generated — place it beside the package. |
| `galleryBanner` | No | `object` | See the type declaration. |
| `categories` | No | `string[]` | Default: ["Themes"] |
| `keywords` | No | `string[]` | See the type declaration. |
| `engines` | No | `object` | Cursor loads VS Code–compatible extensions; `engines.vscode` is required. Default: { vscode: "^1.85.0" } |
| `includeScripts` | No | `boolean` | Emit packaging helpers and `package.json` script entries for building a VSIX under `dist/` (Cursor install path). Default: true |
| `readme` | No | `string` | Extension README body. When omitted, a minimal overview is generated from the contributed themes. |
| `installGuide` | No | `string` | Override body for generated `INSTALL.md`. When omitted, Cursor VSIX install steps are written (Command Palette → Install from VSIX). |
| `includeTypes` | No | `TokenType[]` | Restrict flattened helper tokens to these DTCG `$type` values. Does not filter what mapTheme receives. |
| `packageJson` | No | `Record<string, unknown>` | Extra fields merged into the generated extension `package.json` (shallow merge; `contributes.themes` / `scripts` from the plugin win). |
