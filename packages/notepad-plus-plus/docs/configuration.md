---
title: Configure @razorwind/notepad-plus-plus
description: Pass mapTheme and any required package fields.
documentType: reference
---

# Configure @razorwind/notepad-plus-plus

Paths are relative to the Razorwind execution directory.

`includeTypes` limits helper rows passed into the mapper. It does not filter the token tree `mapTheme` receives.

### `NotepadPlusPlusPluginOptions`

Declared in `notepad-plus-plus/src/types.ts`.

| Option | Required | Type | Description |
| --- | --- | --- | --- |
| `outputPath` | No | `string` | Directory (relative to the execution cwd) for generated theme files. Default: "notepad-plus-plus-themes" |
| `mapTheme` | Yes | `GenerateNotepadPlusPlusTheme` | Map extracted tokens to Notepad++ theme document(s). Required — without a mapping there is nothing to emit. |
| `installGuide` | No | `string` | Override body for generated `INSTALL.md`. When omitted, Notepad++ install steps are written (copy into `%AppData%\\Notepad++\\themes`, activate). |
| `includeTypes` | No | `TokenType[]` | Restrict flattened helper tokens to these DTCG `$type` values. Does not filter what mapTheme receives. |
