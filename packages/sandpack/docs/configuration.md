---
title: Configure @razorwind/sandpack
description: Pass mapTheme and any required package fields.
documentType: reference
---

# Configure @razorwind/sandpack

Paths are relative to the Razorwind execution directory.

`includeTypes` limits helper rows passed into the mapper. It does not filter the token tree `mapTheme` receives.

### `SandpackPluginOptions`

Declared in `sandpack/src/types.ts`.

| Option | Required | Type | Description |
| --- | --- | --- | --- |
| `outputPath` | No | `string` | Directory (relative to the execution cwd) for generated theme and usage files. Default: "sandpack" |
| `mapTheme` | Yes | `GenerateSandpackTheme` | Map extracted tokens to Sandpack theme document(s). Required — without a mapping there is nothing to emit for themes. |
| `mapFiles` | No | `GenerateSandpackFiles` | Map extracted components to Sandpack usage demos (`files` prop payloads). When omitted and includeUsage is not `false`, demos are derived from `schema.components[].usage`. |
| `includeUsage` | No | `boolean` | Emit component usage demos under `usage/`. Default: true |
| `template` | No | `string` | Default Sandpack template for auto-built usage demos. Default: "react" |
| `installGuide` | No | `string` | Override body for generated `INSTALL.md`. When omitted, Sandpack install steps are written (import theme / files into `<Sandpack />`). |
| `includeTypes` | No | `TokenType[]` | Restrict flattened helper tokens to these DTCG `$type` values. Does not filter what mapTheme receives. |
