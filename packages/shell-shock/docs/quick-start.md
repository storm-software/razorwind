---
title: Write a CLI theme and snapshot
description: Map a palette, generate, then point Shell Shock at the snapshot.
documentType: tutorial
---

# Write a CLI theme and snapshot

Razorwind config:

```ts
import { defineConfig } from "@razorwind/core";
import shellShock, { inferPalette } from "@razorwind/shell-shock";

export default defineConfig({
  tokensPath: "tokens.json",
  plugins: [
    shellShock({
      mapTheme: spec => ({
        ...inferPalette(spec),
        link: "#3fa6ff"
      })
    })
  ]
});
```

`snapshot` defaults to true, so generate also writes `shell-shock/design-system.json`.

Shell Shock config, from the plugin example:

```ts
import { defineConfig } from "@shell-shock/core/config";
import preset from "@shell-shock/preset-cli";
import razorwind from "@razorwind/shell-shock/plugin";

export default defineConfig({
  name: "acme",
  input: "src/commands",
  plugins: [
    preset(),
    razorwind({ specFile: "./shell-shock/design-system.json" })
  ]
});
```
