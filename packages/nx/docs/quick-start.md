---
title: Register the Nx plugin
description: Add the plugin to nx.json and run the generate target.
documentType: tutorial
---

# Register the Nx plugin

This repository does not register the plugin in a checked-in `nx.json`. The plugin entry exports `createNodesV2`. Register it in the workspace that should infer targets:

```json
{
  "plugins": [
    {
      "plugin": "@razorwind/nx",
      "options": {
        "targetName": "generate",
        "tokensPath": "tokens.json"
      }
    }
  ]
}
```

A project that contains `razorwind.config.ts` and `package.json` then has a `generate` target. Run it with Nx:

```bash
pnpm exec nx run <project>:generate
```

`mode` defaults to `production` on the executor. The `development` configuration sets `mode` to `development`.
