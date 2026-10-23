---
title: Generate a Ghostty theme
description: Register the plugin with mapTheme and run Razorwind generate.
documentType: tutorial
---

# Generate a Ghostty theme

```ts
import { defineConfig } from "@razorwind/core";
import ghostty, { flattenTokens } from "@razorwind/ghostty";

export default defineConfig({
  plugins: [
    ghostty({
      mapTheme: tokens => {
        const flat = flattenTokens(tokens);
        const color = (path: string) =>
          flat.find(t => t.path === path)?.cssValue ?? "#282a36";

        return {
          name: "my-theme",
          background: color("color.bg"),
          foreground: color("color.fg"),
          cursorColor: color("color.fg"),
          cursorText: color("color.bg"),
          selectionBackground: color("color.selection"),
          selectionForeground: color("color.fg"),
          palette: {
            0: color("color.ansi.black"),
            1: color("color.ansi.red"),
            2: color("color.ansi.green")
          }
        };
      }
    })
  ]
});
```

The default output directory is `ghostty-themes`. Generate writes one Ghostty theme file per mapped theme, plus `INSTALL.md`. Set `installGuide` to replace that install note.
