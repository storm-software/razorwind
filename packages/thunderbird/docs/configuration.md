---
title: Configure @razorwind/thunderbird
description: Pass mapTheme and any required package fields.
documentType: reference
---

# Configure @razorwind/thunderbird

Paths are relative to the Razorwind execution directory.

`includeTypes` limits helper rows passed into the mapper. It does not filter the token tree `mapTheme` receives.

### `ThunderbirdPluginOptions`

Declared in `thunderbird/src/types.ts`.

| Option | Required | Type | Description |
| --- | --- | --- | --- |
| `outputPath` | No | `string` | Directory (relative to the execution cwd) for generated theme folders. Default: "thunderbird-themes" |
| `mapTheme` | Yes | `GenerateThunderbirdTheme` | Map extracted tokens to Thunderbird `manifest.json` document(s). Required — without a mapping there is nothing to emit. |
| `includeTypes` | No | `TokenType[]` | Restrict flattened helper tokens to these DTCG `$type` values. Does not filter what mapTheme receives. |
| `installGuide` | No | `string` | Override body for generated `INSTALL.md`. When omitted, Thunderbird install steps are generated from contributed themes. |
