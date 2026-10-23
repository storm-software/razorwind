---
title: Configure @razorwind/zsh
description: Pass mapTheme and any required package fields.
documentType: reference
---

# Configure @razorwind/zsh

Paths are relative to the Razorwind execution directory.

`includeTypes` limits helper rows passed into the mapper. It does not filter the token tree `mapTheme` receives.

### `ZshPluginOptions`

Declared in `zsh/src/types.ts`.

| Option | Required | Type | Description |
| --- | --- | --- | --- |
| `outputPath` | No | `string` | Directory (relative to the execution cwd) for generated theme files. Default: "zsh-themes" |
| `mapTheme` | Yes | `GenerateZshTheme` | Map extracted tokens to Oh My Zsh theme document(s). Required — without a mapping there is nothing to emit. |
| `installGuide` | No | `string` | Override body for generated `INSTALL.md`. When omitted, Oh My Zsh install steps are written (copy into themes dir, set `ZSH_THEME`). |
| `includeTypes` | No | `TokenType[]` | Restrict flattened helper tokens to these DTCG `$type` values. Does not filter what mapTheme receives. |
