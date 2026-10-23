---
title: Write Storybook token pages
description: Register the plugin and map colors with flattenTokens.
documentType: tutorial
---

# Write Storybook token pages

```ts
import { defineConfig } from "@razorwind/core";
import { flattenTokens } from "@razorwind/core/utils";
import storybook from "@razorwind/storybook";

export default defineConfig({
  tokensPath: "tokens.json",
  plugins: [
    storybook({
      mapTheme: tokens => {
        const flat = flattenTokens(tokens);
        const color = (path: string) =>
          flat.find(token => token.path === path)?.cssValue;
        return {
          base: "dark",
          colorPrimary: color("color.primary"),
          brandTitle: "Acme"
        };
      }
    })
  ]
});
```

You can omit `mapTheme` and still get the MDX token pages. The default sample sentence for type specimens is `The quick brown fox jumps over the lazy dog`.
