---
title: Generate a Sandpack theme
description: Register the plugin with mapTheme and run Razorwind generate.
documentType: tutorial
---

# Generate a Sandpack theme

```ts
import { defineConfig } from "@razorwind/core";
import sandpack, { flattenTokens } from "@razorwind/sandpack";

export default defineConfig({
  plugins: [
    sandpack({
      mapTheme: tokens => {
        const flat = flattenTokens(tokens);
        const color = (path: string) =>
          flat.find(t => t.path === path)?.cssValue ?? "#000000";

        return {
          name: "my-theme",
          colors: {
            surface1: color("color.bg"),
            base: color("color.fg"),
            accent: color("color.accent")
          },
          syntax: {
            plain: color("color.fg"),
            comment: color("color.muted"),
            string: color("color.accent")
          }
        };
      }
    })
  ]
});
```

The default output directory is `sandpack`. Generate writes theme JSON, usage JSON when usage is enabled, and `INSTALL.md`. Set `installGuide` to replace that install note.
