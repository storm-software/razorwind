---
title: Generate a VS Code theme
description: Register the plugin with mapTheme and run Razorwind generate.
documentType: tutorial
---

# Generate a VS Code theme

```ts
import { defineConfig } from "@razorwind/core";
import vsce, { flattenTokens } from "@razorwind/vsce";

export default defineConfig({
  plugins: [
    vsce({
      name: "my-theme",
      publisher: "acme",
      displayName: "My Theme",
      mapTheme: tokens => {
        const flat = flattenTokens(tokens);
        const color = (path: string) =>
          flat.find(t => t.path === path)?.cssValue ?? "#000000";

        return [
          {
            name: "my-theme-dark",
            displayName: "My Theme Dark",
            type: "dark",
            colors: {
              "editor.background": color("color.bg"),
              "editor.foreground": color("color.fg")
            }
          },
          {
            name: "my-theme-light",
            displayName: "My Theme Light",
            type: "light",
            colors: {
              "editor.background": color("color.bg"),
              "editor.foreground": color("color.fg")
            }
          }
        ];
      }
    })
  ]
});
```

The default output directory is `vscode-extension`. Generate writes theme JSON, `package.json`, a readme, and `INSTALL.md`.
