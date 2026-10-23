---
title: Write a Tamagui config
description: Register the Tamagui plugin and run generate.
documentType: tutorial
---

# Write a Tamagui config

```ts
import { defineConfig } from "@razorwind/core";
import tamagui from "@razorwind/tamagui";

export default defineConfig({
  plugins: [tamagui()]
});
```

The default output is `tamagui.config.ts`. `useDefaultConfig` defaults to false, so the file is built from Razorwind tokens. Set it to true to spread `defaultConfig` from `@tamagui/config/v5` and merge tokens on top.

For a v3 app and its lint plugin:

```ts
import { defineConfig } from "@razorwind/core";
import tamagui from "@razorwind/tamagui";
import tamaguiEslint from "@razorwind/tamagui/eslint";

export default defineConfig({
  plugins: [tamagui({ target: "v3" }), tamaguiEslint({ target: "v3" })]
});
```
