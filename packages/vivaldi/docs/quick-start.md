---
title: Generate a Vivaldi theme
description: Register the plugin with mapTheme and run Razorwind generate.
documentType: tutorial
---

# Generate a Vivaldi theme

```ts
import { defineConfig } from "@razorwind/core";
import vivaldi, { flattenTokens } from "@razorwind/vivaldi";

export default defineConfig({
  plugins: [
    vivaldi({
      mapTheme: tokens => {
        const flat = flattenTokens(tokens);
        const color = (path: string) =>
          flat.find(t => t.path === path)?.cssValue ?? "#000000";

        return {
          name: "My Theme",
          colorBg: color("color.bg"),
          colorFg: color("color.fg"),
          colorAccentBg: color("color.accent"),
          colorHighlightBg: color("color.highlight"),
          colorWindowBg: color("color.window"),
          backgroundImage: "background.png"
        };
      }
    })
  ]
});
```

The default output directory is `vivaldi-themes`. Generate writes a Vivaldi `settings.json` for each theme, plus `INSTALL.md`. Set `installGuide` to replace that install note.
