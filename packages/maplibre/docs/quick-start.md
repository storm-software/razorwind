---
title: Write a MapLibre style
description: Map tokens to a style specification and run generate.
documentType: tutorial
---

# Write a MapLibre style

```ts
import { defineConfig } from "@razorwind/core";
import maplibre from "@razorwind/maplibre";

export default defineConfig({
  tokensPath: "tokens.json",
  plugins: [
    maplibre({
      mapTheme: () => ({
        name: "acme",
        version: 8,
        sources: {},
        layers: []
      })
    })
  ]
});
```

Generate writes `maplibre-styles/<name>.json` for each style `mapTheme` returns. A style with only `sources` and `layers` is valid JSON. Add real sources before you load it in MapLibre.
