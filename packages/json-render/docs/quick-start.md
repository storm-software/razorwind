---
title: Write a json-render catalog
description: Point the plugin at components in the schema.
documentType: tutorial
---

# Write a json-render catalog

```ts
import { defineConfig } from "@razorwind/core";
import jsonRender from "@razorwind/json-render";

export default defineConfig({
  tokensPath: "tokens.json",
  componentsPath: "src/components",
  plugins: [jsonRender({ outputPath: "json-render" })]
});
```

Use `mapComponent` to change a component or return `false` to omit it. `actions` adds catalog actions. `prompt` is passed to `catalog.prompt()`.
