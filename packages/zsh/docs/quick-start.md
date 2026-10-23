---
title: Generate an Oh My Zsh theme
description: Register the plugin with mapTheme and run Razorwind generate.
documentType: tutorial
---

# Generate an Oh My Zsh theme

```ts
import { defineConfig } from "@razorwind/core";
import zsh, { flattenTokens } from "@razorwind/zsh";

export default defineConfig({
  plugins: [
    zsh({
      mapTheme: tokens => {
        const flat = flattenTokens(tokens);
        const color = (path: string) =>
          flat.find(t => t.path === path)?.cssValue ?? "#50fa7b";

        return {
          name: "my-theme",
          colors: {
            success: color("color.success"),
            error: color("color.error"),
            directory: color("color.primary"),
            git: color("color.accent"),
            context: color("color.secondary")
          }
        };
      }
    })
  ]
});
```

The default output directory is `zsh-themes`. Generate writes one Oh My Zsh theme file per mapped theme, plus `INSTALL.md`. Set `installGuide` to replace that install note.
