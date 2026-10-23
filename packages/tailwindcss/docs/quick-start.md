---
title: Write a Tailwind CSS file
description: Register the generate plugin and run Razorwind.
documentType: tutorial
---

# Write a Tailwind CSS file

```ts
import { defineConfig } from "@razorwind/core";
import tailwindcss from "@razorwind/tailwindcss/generate";

export default defineConfig({
  tokensPath: "tokens.json",
  plugins: [tailwindcss({ cssPath: "src/app.css" })]
});
```

When `cssPath` is omitted, the plugin uses the detected workspace CSS entry, or `src/app.css`. `includeImport` defaults to true, so the file starts with `@import "tailwindcss";`.

Extract the current file:

```ts
import tailwindcss from "@razorwind/tailwindcss/extract";

export default defineConfig({
  plugins: [tailwindcss()]
});
```
