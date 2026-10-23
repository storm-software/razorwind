---
title: Generate a Thunderbird theme
description: Register the plugin with mapTheme and run Razorwind generate.
documentType: tutorial
---

# Generate a Thunderbird theme

```ts
import { defineConfig } from "@razorwind/core";
import thunderbird, {
  flattenTokens,
  toThunderbirdRgbString
} from "@razorwind/thunderbird";

export default defineConfig({
  plugins: [
    thunderbird({
      mapTheme: tokens => {
        const flat = flattenTokens(tokens);
        const color = (path: string) =>
          toThunderbirdRgbString(
            flat.find(t => t.path === path)?.cssValue ?? "#282a36"
          );

        return {
          name: "My Thunderbird Theme",
          gecko: { id: "my-theme@example.com" },
          colors: {
            frame: color("color.bg"),
            toolbar: color("color.accent"),
            tab_text: color("color.fg"),
            sidebar: color("color.bg"),
            toolbar_field: color("color.bg")
          }
        };
      }
    })
  ]
});
```

The default output directory is `thunderbird-themes`. Each theme folder contains a `manifest.json`. Generate also writes `INSTALL.md`. Set `installGuide` to replace that note.
