---
title: @razorwind/nx API
description: Use createNodesV2, the generate executor, and the sync generator.
documentType: reference
---

# @razorwind/nx API

`createNodesV2` is exported from the package root. The build input for that entry is `src/plugin/index.ts`.

| Public name | Role |
| --- | --- |
| `@razorwind/nx:generate` | Executor that runs Razorwind generate. |
| `@razorwind/nx:sync` | Hidden generator that checks generated files. Alias `generate-sync`. |

If the cache directory cannot be resolved, the plugin throws `The cache directory could not be determined.` A config file with no project `package.json` is skipped.
