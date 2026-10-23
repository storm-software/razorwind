---
title: Generate Stylelint rules
description: Add the plugin and run Razorwind generate.
documentType: tutorial
---

# Generate Stylelint rules

```ts
import { defineConfig } from "@razorwind/core";
import stylelint from "@razorwind/stylelint";

export default defineConfig({
  plugins: [stylelint({ prefix: "acme" })]
});
```

The default output is `stylelint/design-system/index.mjs`, plus `INSTALL.md` in that directory.
