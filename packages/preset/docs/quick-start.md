---
title: Share one theme map
description: Pass mapTheme and the plugins that should consume it.
documentType: tutorial
---

# Share one theme map

```ts
import { defineConfig } from "@razorwind/core";
import { flattenTokens } from "@razorwind/core/utils";
import preset, { presetPlugin } from "@razorwind/preset";
import shiki from "@razorwind/shiki";
import zed from "@razorwind/zed";

export default defineConfig({
  tokensPath: "tokens.json",
  plugins: [
    preset({
      mapTheme: tokens => {
        const flat = flattenTokens(tokens);
        const color = (path: string) =>
          flat.find(token => token.path === path)?.cssValue ?? "#000000";
        return {
          name: "acme",
          appearance: "dark",
          primary: color("color.primary")
        };
      },
      plugins: [
        shiki,
        presetPlugin(zed, { id: "acme", authors: ["Acme <themes@acme.example>"] })
      ]
    })
  ]
});
```

`shiki` only needs `mapTheme`, so you can pass the factory. `zed` also needs `id`. Wrap it with `presetPlugin`.
