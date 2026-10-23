---
title: Configure @razorwind/json-render
description: Set the output directory, component map, and schema strictness.
documentType: reference
---

# Configure @razorwind/json-render

### `JsonRenderPluginOptions`

Declared in `json-render/src/types.ts`.

| Option | Required | Type | Description |
| --- | --- | --- | --- |
| `outputPath` | No | `string` | Output directory relative to the generation directory. Default: `json-render`. |
| `mapComponent` | No | `(component, key) => definition or false` | Change a component, or return `false` to omit it. |
| `actions` | No | `Record<string, JsonRenderActionDefinition>` | Actions exposed to generated specs. |
| `prompt` | No | `PromptOptions` | Options passed to `catalog.prompt()`. |
| `strict` | No | `boolean` | Reject unknown fixed-shape fields in the JSON Schema. Default: `true`. |
| `installGuide` | No | `string` | Replacement body for `INSTALL.md`. |
