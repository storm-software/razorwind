---
title: Configure @razorwind/ghostty
description: Pass mapTheme and any required package fields.
documentType: reference
---

# Configure @razorwind/ghostty

Paths are relative to the Razorwind execution directory.

`includeTypes` limits helper rows passed into the mapper. It does not filter the token tree `mapTheme` receives.

### `GhosttyPluginOptions`

Declared in `ghostty/src/types.ts`.

| Option | Required | Type | Description |
| --- | --- | --- | --- |
| `outputPath` | No | `string` | Directory (relative to the execution cwd) for generated theme files. Default: "ghostty-themes" |
| `mapTheme` | Yes | `GenerateGhosttyTheme` | Map extracted tokens to Ghostty theme document(s). Required — without a mapping there is nothing to emit. |
| `installGuide` | No | `string` | Override body for generated `INSTALL.md`. When omitted, Ghostty install steps are written (copy into `~/.config/ghostty/themes/`, set `theme`). |
| `includeTypes` | No | `TokenType[]` | Restrict flattened helper tokens to these DTCG `$type` values. Does not filter what mapTheme receives. |
