---
title: Write CSS custom properties
description: Point the generate plugin at a token file and an output path.
documentType: tutorial
---

# Write CSS custom properties

Import the generate plugin. The package root does not default-export it.

```ts
import { defineConfig } from "@razorwind/core";
import css from "@razorwind/css/generate";

export default defineConfig({
  tokensPath: "tokens.json",
  plugins: [css({ outputPath: "src/styles.css" })]
});
```

Generate writes `src/styles.css` when you omit `outputPath`. The file uses Style Dictionary `css/variables` with `outputReferences: true`. Local font files are prepended when the schema has fonts.

To read an existing file instead:

```ts
import css from "@razorwind/css/extract";

export default defineConfig({
  plugins: [css({ cssPath: "src/styles.css" })]
});
```
