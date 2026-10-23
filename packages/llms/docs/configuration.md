---
title: Configure @razorwind/llms
description: Set the directory, title, and summary.
documentType: reference
---

# Configure @razorwind/llms

### `LlmsPluginOptions`

Declared in `llms/src/types.ts`.

| Option | Required | Type | Description |
| --- | --- | --- | --- |
| `fontAssetsUrl` | No | `string` | See the type declaration. |
| `outputPath` | No | `string` | See the type declaration. |
| `title` | No | `string` | See the type declaration. |
| `summary` | No | `string` | See the type declaration. |
| `details` | No | `string` | See the type declaration. |
| `baseUrl` | No | `string` | See the type declaration. |

### `LlmsRenderOptions`

Declared in `llms/src/types.ts`.

| Option | Required | Type | Description |
| --- | --- | --- | --- |
| `fontAssetsUrl` | No | `string` | See the type declaration. |
| `rootDir` | No | `string` | Absolute directory the documents are written to. Absolute schema file paths are rendered relative to it. |
