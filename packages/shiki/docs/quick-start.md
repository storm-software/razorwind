---
title: Generate a Shiki theme
description: Register the plugin with mapTheme and run Razorwind generate.
documentType: tutorial
---

# Generate a Shiki theme

```ts
import { defineConfig } from "@razorwind/core";
import shiki, { flattenTokens } from "@razorwind/shiki";

export default defineConfig({
  plugins: [
    shiki({
      mapTheme: spec => {
        const flat = flattenTokens(spec.tokens);
        const color = (path: string) =>
          flat.find(t => t.path === path)?.cssValue ?? "#000000";

        return {
          name: "my-theme",
          type: "dark",
          bg: color("color.bg"),
          fg: color("color.fg"),
          settings: [
            {
              scope: ["comment"],
              settings: { foreground: color("color.muted") }
            },
            {
              scope: ["string"],
              settings: { foreground: color("color.accent") }
            }
          ]
        };
      }
    })
  ]
});
```

The default output directory is `shiki-themes`. Generate writes one Shiki theme JSON file per mapped theme, plus `INSTALL.md`. Set `installGuide` to replace that install note.
