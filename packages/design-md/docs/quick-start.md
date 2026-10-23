---
title: Write DESIGN.md
description: Register the generate plugin and run Razorwind.
documentType: tutorial
---

# Write DESIGN.md

```ts
import { defineConfig } from "@razorwind/core"
import designMd from "@razorwind/design-md/generate"

export default defineConfig({
  tokensPath: "tokens.json",
  plugins: [
    designMd({
      outputPath: "DESIGN.md",
      name: "Acme",
      description: "Acme design system"
    })
  ]
})
```

The file has YAML front matter and an overview section. When `overview` is omitted, the plugin summarizes the tokens.

Razorwind writes the generated sections between `<!-- razorwind configuration start -->` and `<!-- razorwind configuration end -->`. The YAML front matter stays above that block. Markdown outside the comments stays in the file on the next run.

Read a file back:

```ts
import designMd from "@razorwind/design-md/extract"

export default defineConfig({
  plugins: [designMd({ path: "DESIGN.md" })]
})
```
