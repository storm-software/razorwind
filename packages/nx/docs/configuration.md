---
title: Configure @razorwind/nx
description: Set the target name and the source paths inferred into the target.
documentType: reference
---

# Configure @razorwind/nx

### `NxPluginOptions`

Declared in `nx/src/plugin/index.ts`.

| Option | Required | Type | Description |
| --- | --- | --- | --- |
| `targetName` | No | `string` | The name of the target to use. Default: "generate" |
| `componentsPath` | No | `string \| string[]` | The path to a directory containing component directories or files, or an array of paths. |
| `iconsPath` | No | `string \| string[]` | The path to a directory containing icon assets or icon directories, or an array of paths. |
| `fontsPath` | No | `string \| string[]` | The path to a directory containing font files or font directories, or an array of paths. |
| `guidelinesPath` | No | `string \| string[]` | The path to a directory containing guideline markdown files or guideline directories, or an array of paths. |
| `tokensPath` | No | `string \| string[]` | The path to the tokens.json file, or an array of paths. |
| `verboseOutput` | No | `boolean` | Whether to output verbose logs. Default: false |

Executor `@razorwind/nx:generate` requires `configFile` and `mode`. The inferred target sets `configFile` to the config path. `mode` is `production` or `development`. Optional executor fields are `componentsPath`, `iconsPath`, `fontsPath`, `guidelinesPath`, `tokensPath`, and `verbose` (default false).

The hidden generator `@razorwind/nx:sync` accepts `mode` (default `production`), `configFile`, `targetName` (default `generate`), and `outOfSyncMessage` (default `Razorwind generated files are out of sync. Run nx sync to regenerate.`).
