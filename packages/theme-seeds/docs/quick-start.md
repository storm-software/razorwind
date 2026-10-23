---
title: Seed a token tree
description: Pass numeric seeds to the extract plugin.
documentType: tutorial
---

# Seed a token tree

```ts
import { defineConfig } from "@razorwind/core";
import themeSeeds from "@razorwind/theme-seeds";

export default defineConfig({
  plugins: [
    themeSeeds({
      hue: 250,
      chroma: 0.12,
      warmth: 0,
      energy: 0.4,
      density: 1,
      appearance: "dark"
    })
  ]
});
```

Extract merges the generated tokens into the current token tree. On a multi-theme record, the merge is applied to every theme that does not start with `$`.
