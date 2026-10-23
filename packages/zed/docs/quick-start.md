---
title: Generate a Zed theme
description: Register the plugin with mapTheme and run Razorwind generate.
documentType: tutorial
---

# Generate a Zed theme

```ts
import { defineConfig } from "@razorwind/core";
import zed, { flattenTokens } from "@razorwind/zed";

export default defineConfig({
  plugins: [
    zed({
      id: "my-theme",
      name: "My Theme",
      authors: ["Acme <themes@acme.com>"],
      mapTheme: tokens => {
        const flat = flattenTokens(tokens);
        const color = (path: string) =>
          flat.find(t => t.path === path)?.cssValue ?? "#000000";

        return {
          name: "My Theme",
          themes: [
            {
              name: "My Theme Dark",
              appearance: "dark",
              style: {
                "editor.background": color("color.bg"),
                "editor.foreground": color("color.fg"),
                syntax: {
                  comment: { color: color("color.muted") }
                }
              }
            }
          ]
        };
      }
    })
  ]
});
```

The default output directory is `zed-extension`. Generate writes `extension.toml`, theme JSON, and `INSTALL.md`.
