---
title: Add color variants
description: Register the extract plugin before generators that read tokens.
documentType: tutorial
---

# Add color variants

```ts
import { defineConfig } from "@razorwind/core";
import colorVariants from "@razorwind/color-variants";

export default defineConfig({
  plugins: [
    colorVariants(),
    // or: colorVariants(["dimmed", "high-contrast", "protanopia"])
    // or: colorVariants({ variants: ["dimmed"] })
  ]
});
```

Place this plugin before CSS or theme generators so they see the extra sets. Calling it with no arguments uses `dimmed` and `high-contrast`.
