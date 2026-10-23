---
title: Generate ESLint rules
description: Add the plugin and set a rule prefix.
documentType: tutorial
---

# Generate ESLint rules

```ts
import { defineConfig } from "@razorwind/core";
import eslint from "@razorwind/eslint";

export default defineConfig({
  plugins: [eslint({ prefix: "acme" })]
});
```

Generate writes the plugin module and an `INSTALL.md` beside it. Wire that module into `eslint.config.*` with the steps in the install file. The default rule prefix is `design-system`.
