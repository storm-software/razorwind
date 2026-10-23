---
title: Build CSS variables with Style Dictionary
description: Declare one platform and run generate.
documentType: tutorial
---

# Build CSS variables with Style Dictionary

```ts
import { defineConfig } from "@razorwind/core";
import styleDictionary from "@razorwind/style-dictionary";

export default defineConfig({
  plugins: [
    styleDictionary({
      platforms: {
        css: {
          transformGroup: "css",
          buildPath: "build/css/",
          files: [
            {
              destination: "variables.css",
              format: "css/variables"
            }
          ]
        }
      }
    })
  ]
});
```

That config writes `build/css/variables.css`. Add a platform or the plugin has no files to emit.
