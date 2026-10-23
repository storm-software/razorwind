---
title: Configure @razorwind/zed
description: Pass mapTheme and any required package fields.
documentType: reference
---

# Configure @razorwind/zed

Paths are relative to the Razorwind execution directory.

`includeTypes` limits helper rows passed into the mapper. It does not filter the token tree `mapTheme` receives.

### `ZedPluginOptions`

Declared in `zed/src/types.ts`.

| Option | Required | Type | Description |
| --- | --- | --- | --- |
| `outputPath` | No | `string` | Directory (relative to the execution cwd) for the generated extension package. Default: "zed-extension" |
| `mapTheme` | Yes | `GenerateZedTheme` | Map extracted tokens to Zed theme collection JSON document(s). Required — without a mapping there is nothing to emit. |
| `id` | Yes | `string` | Extension id written to `extension.toml`. Must be a lowercase slug (no scopes). |
| `name` | No | `string` | Human-readable extension name. Defaults to a title-cased id. |
| `version` | No | `string` | Extension version (semver). Default: "0.0.1" |
| `schemaVersion` | No | `number` | `extension.toml` schema version. Default: 1 |
| `authors` | No | `string[]` | Extension authors for `extension.toml`. |
| `description` | No | `string` | See the type declaration. |
| `repository` | No | `string` | See the type declaration. |
| `themeSchema` | No | `string` | Default `$schema` for emitted theme JSON when ZedTheme.$schema is omitted. Default: "https://zed.dev/schema/themes/v0.2.0.json" |
| `readme` | No | `string` | Extension README body. When omitted, a minimal overview is generated from contributed themes. |
| `installGuide` | No | `string` | Override body for generated `INSTALL.md`. When omitted, Zed install steps are written (extensions store + manual copy to `~/.config/zed/themes`). |
| `includeTypes` | No | `TokenType[]` | Restrict flattened helper tokens to these DTCG `$type` values. Does not filter what mapTheme receives. |
