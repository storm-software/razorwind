---
title: Configure @razorwind/css
description: Set the CSS path, prefix, and font asset URL.
documentType: reference
---

# Configure @razorwind/css

### `CssGeneratePluginOptions`

Declared in `css/src/types.ts`.

| Option | Required | Type | Description |
| --- | --- | --- | --- |
| `fontAssetsUrl` | No | `string` | See the type declaration. |
| `prefix` | No | `string` | Prefix prepended to generated CSS custom-property names. Default: initials derived from the schema name |
| `outputPath` | No | `string` | Output file path (relative to the execution cwd). Default: "src/styles.css" |

### `CssExtractPluginOptions`

Declared in `css/src/types.ts`.

| Option | Required | Type | Description |
| --- | --- | --- | --- |
| `cssPath` | No | `string \| null` | Path to the CSS file to parse for custom-property tokens (relative to the execution cwd, or absolute). When omitted, common workspace CSS entry candidates are checked (`src/styles.css`, …). Default: "src/styles.css" |


Extract checks `src/styles.css` and other common CSS entries when `cssPath` is omitted. `prefix` defaults to initials from the schema name.
