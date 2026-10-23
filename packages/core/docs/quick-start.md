---
title: Generate files from tokens
description: Point a config file at tokens and one plugin, then run the generator.
documentType: tutorial
---

# Generate files from tokens

Add a token file and a config file in the project root.

`tokens.json`:

```json
{
  "color": {
    "primary": { "$type": "color", "$value": "#0066cc" }
  }
}
```

`razorwind.config.ts`:

```ts
import { defineConfig } from "@razorwind/core";
import css from "@razorwind/css/generate";

export default defineConfig({
  name: "acme",
  tokensPath: "tokens.json",
  plugins: [css({ outputPath: "src/styles.css" })]
});
```

Run the generator from the [CLI](../../cli/docs/quick-start.md), or call the Power Plant executor with `generator` from `@razorwind/core`.

The CSS plugin writes `src/styles.css`. The file contains CSS custom properties for the loaded tokens.

Add at least one plugin. With an empty `plugins` array, prepare throws:

```text
Razorwind will not generate any code - no plugins configured. Please add at least one plugin to the configuration.
```

Use an array when you want separate runs. Each item loads and generates on its own:

```ts
export default defineConfig([
  { name: "dark", tokensPath: "tokens/dark.json", plugins: [css()] },
  { name: "light", tokensPath: "tokens/light.json", plugins: [css()] }
]);
```

Later runs replace earlier documents when the output path is the same. Give each run its own output path.
