---
title: Write llms.txt
description: Register the plugin and set a title.
documentType: tutorial
---

# Write llms.txt

```ts
import { defineConfig } from "@razorwind/core";
import llms from "@razorwind/llms";

export default defineConfig({
  tokensPath: "tokens.json",
  plugins: [
    llms({
      outputPath: "docs",
      title: "Acme",
      summary: "Tokens, components, and guidelines for Acme."
    })
  ]
});
```

`title` overrides the schema title. `summary` overrides the schema description. `baseUrl` makes companion links absolute.
