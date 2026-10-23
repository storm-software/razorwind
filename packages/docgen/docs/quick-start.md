---
title: Write design-system MDX
description: Point docgen at a token file and an output directory.
documentType: tutorial
---

# Write design-system MDX

```ts
import { defineConfig } from "@razorwind/core";
import docgen from "@razorwind/docgen/generate";

export default defineConfig({
  tokensPath: "tokens.json",
  plugins: [
    docgen({
      outputPath: "docs/design-system",
      title: "Acme"
    })
  ]
});
```

Generate writes an index page and one page per token group. The default title is `Design System`. The default directory is `docs/design-system`.
