---
title: Generate a Notepad++ theme
description: Register the plugin with mapTheme and run Razorwind generate.
documentType: tutorial
---

# Generate a Notepad++ theme

```ts
import { defineConfig } from "@razorwind/core";
import npp, { flattenTokens } from "@razorwind/notepad-plus-plus";

export default defineConfig({
  plugins: [
    npp({
      mapTheme: tokens => {
        const flat = flattenTokens(tokens);
        const color = (path: string) =>
          flat.find(t => t.path === path)?.cssValue ?? "#282a36";

        return {
          name: "my-theme",
          globalStyles: [
            {
              name: "Default Style",
              styleID: 32,
              fgColor: color("color.fg"),
              bgColor: color("color.bg")
            }
          ],
          lexerStyles: [
            {
              name: "xml",
              desc: "XML",
              wordsStyles: [
                {
                  name: "DEFAULT",
                  styleID: 0,
                  fgColor: color("color.fg"),
                  bgColor: color("color.bg")
                }
              ]
            }
          ]
        };
      }
    })
  ]
});
```

The default output directory is `notepad-plus-plus-themes`. Generate writes one Notepad++ theme file per mapped theme, plus `INSTALL.md`. Set `installGuide` to replace that install note.
