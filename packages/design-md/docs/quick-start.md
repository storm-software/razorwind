---
title: Write DESIGN.md
description: Register the generate plugin and run Razorwind.
documentType: tutorial
---

# Write DESIGN.md

```ts
import { defineConfig } from "@razorwind/core";
import designMd from "@razorwind/design-md/generate";

export default defineConfig({
  tokensPath: "tokens.json",
  plugins: [
    designMd({
      outputPath: "DESIGN.md",
      name: "Acme",
      description: "Acme design system"
    })
  ]
});
```

The file has YAML front matter and an overview section. When `overview` is omitted, the plugin summarizes the tokens.

Read a file back:

```ts
import designMd from "@razorwind/design-md/extract";

export default defineConfig({
  plugins: [designMd({ path: "DESIGN.md" })]
});
```
