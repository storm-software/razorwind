---
title: Configure @razorwind/docgen
description: Choose the output directory and which sections to skip.
documentType: reference
---

# Configure @razorwind/docgen

### `DocgenExtractPluginOptions`

This interface has no fields. It is declared in `docgen/src/types.ts`.

### `DocgenGeneratePluginOptions`

Declared in `docgen/src/types.ts`.

| Option | Required | Type | Description |
| --- | --- | --- | --- |
| `fontAssetsUrl` | No | `string` | See the type declaration. |
| `outputPath` | No | `string` | Directory (relative to the execution cwd) where generated docs are written. Default: "docs/design-system" |
| `title` | No | `string` | Title used on the generated documentation index page. Default: "Design System" |
| `cssVarPrefix` | No | `string` | CSS custom-property prefix used when emitting `var(--…)` references. Default: initials derived from the extracted spec name |
| `includeTypes` | No | `TokenType[]` | Restrict generated docs to these DTCG `$type` values. When omitted, all supported types are included. |
| `skipRegistry` | No | `boolean` | Skip generating component documentation pages. Default: false |
| `skipIcons` | No | `boolean` | Skip generating icon documentation pages. Default: false |
| `skipFonts` | No | `boolean` | Skip generating font documentation pages. Default: false |
| `skipGuidelines` | No | `boolean` | Skip generating guideline documentation pages. Default: false |
| `installGuide` | No | `string` | Override body for generated `INSTALL.md`. When omitted, doc site wiring steps are generated for the output directory. |
