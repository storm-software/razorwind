---
title: Configure @razorwind/shiki
description: Pass mapTheme and any required package fields.
documentType: reference
---

# Configure @razorwind/shiki

Paths are relative to the Razorwind execution directory.

`includeTypes` limits helper rows passed into the mapper. It does not filter the token tree `mapTheme` receives.

### `ShikiPluginOptions`

Declared in `shiki/src/types.ts`.

| Option | Required | Type | Description |
| --- | --- | --- | --- |
| `outputPath` | No | `string` | Directory (relative to the execution cwd) for generated theme JSON files. Default: "shiki-themes" |
| `fileName` | No | `string \| ((theme: ShikiTheme, spec: Schema) => string)` | File name for each generated theme JSON document. Pass a string for a fixed name (e.g. `"theme.json"` when `splitThemes` already writes each theme to its own folder), or a function to derive it per theme. Default: "<slugified theme name>.json" |
| `mapTheme` | Yes | `GenerateShikiTheme` | Map extracted tokens to Shiki theme JSON document(s). Required — without a mapping there is nothing to emit. |
| `includeTypes` | No | `TokenType[]` | Restrict flattened helper tokens to these DTCG `$type` values. Does not filter what mapTheme receives. |
| `installGuide` | No | `string` | Override body for generated `INSTALL.md`. When omitted, Shiki load-theme steps are generated from contributed themes. |
