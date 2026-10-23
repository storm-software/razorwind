---
title: Configure @razorwind/storybook
description: Set the output directory, title prefix, and theme mapper.
documentType: reference
---

# Configure @razorwind/storybook

### `StorybookPluginOptions`

Declared in `storybook/src/types.ts`.

| Option | Required | Type | Description |
| --- | --- | --- | --- |
| `fontAssetsUrl` | No | `string` | See the type declaration. |
| `outputPath` | No | `string` | Directory (relative to the execution cwd) where generated docs are written. Default: "storybook/tokens" |
| `titlePrefix` | No | `string` | Storybook sidebar title prefix for generated MDX pages. Default: "Design Tokens" |
| `cssVarPrefix` | No | `string` | CSS custom-property prefix used when emitting `var(--…)` references. Default: initials derived from the extracted spec name |
| `sampleText` | No | `string` | Sample text rendered by the typography Typeset doc block. Default: "The quick brown fox jumps over the lazy dog" |
| `includeTypes` | No | `TokenType[]` | Restrict generated docs to these DTCG `$type` values. When omitted, all supported types are included. |
| `colorGroupBy` | No | `number` | Depth used when grouping color tokens into `ColorItem` entries. Default: 2 |
| `mapTheme` | No | `GenerateStorybookTheme` | Map extracted token values to a Storybook UI theme. When provided, all mapped themes are written to a single `{outputPath}/theme.ts`. One theme becomes `export default create({…})`; multiple themes become a record keyed by theme name (`{ light: create({…}), dark: create({…}) }`). |
| `skipIcons` | No | `boolean` | Skip generating icon documentation pages. Default: false |
| `skipFonts` | No | `boolean` | Skip generating font documentation pages. Default: false |
| `skipGuidelines` | No | `boolean` | Skip generating guideline documentation pages. Default: false |
| `installGuide` | No | `string` | Override body for generated `INSTALL.md`. When omitted, Storybook wiring steps are generated for the output directory. |


`colorGroupBy` defaults to 2. `skipIcons`, `skipFonts`, and `skipGuidelines` default to false.
