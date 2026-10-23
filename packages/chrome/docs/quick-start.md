---
title: Generate a Chrome theme
description: Register the plugin with mapTheme and run Razorwind generate.
documentType: tutorial
---

# Generate a Chrome theme

```ts
import { defineConfig } from "@razorwind/core";
import chrome, { flattenTokens, toChromeRgb } from "@razorwind/chrome";

export default defineConfig({
  plugins: [
    chrome({
      mapTheme: tokens => {
        const flat = flattenTokens(tokens);
        const rgb = (path: string) =>
          toChromeRgb(
            flat.find(t => t.path === path)?.cssValue ?? "#000000"
          );

        return {
          name: "My Chrome Theme",
          colors: {
            frame: rgb("color.bg"),
            toolbar: rgb("color.accent"),
            tab_text: rgb("color.fg"),
            ntp_background: rgb("color.bg")
          }
        };
      }
    })
  ]
});
```

The default output directory is `chrome-themes`. Each theme folder contains a `manifest.json` whose `colors` use Chrome RGB arrays. Generate also writes `INSTALL.md`. Set `installGuide` to replace that note.
