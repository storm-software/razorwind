---
title: Write registry.json
description: Register the generate plugin and run Razorwind.
documentType: tutorial
---

# Write registry.json

```ts
import { defineConfig } from "@razorwind/core";
import shadcn from "@razorwind/shadcn/generate";

export default defineConfig({
  componentsPath: "src/components",
  plugins: [
    shadcn({
      configFile: "registry.json",
      name: "acme",
      homepage: "https://example.com"
    })
  ]
});
```

Read an existing registry:

```ts
import shadcn from "@razorwind/shadcn/extract";

export default defineConfig({
  plugins: [shadcn({ configFile: "registry.json" })]
});
```
