---
title: Configure @razorwind/color-variants
description: Choose which color variants to create.
documentType: reference
---

# Configure @razorwind/color-variants

You can pass an options object or an array of variant names. The array form is shorthand for `{ variants }`.

### `ColorVariantsPluginOptions`

Declared in `color-variants/src/types.ts`.

| Option | Required | Type | Description |
| --- | --- | --- | --- |
| `variants` | No | `ColorVariant[]` | Color variants to generate from each extracted token set. Default: ["dimmed", "high-contrast"] |


Allowed names are `dimmed`, `high-contrast`, `protanopia`, `deuteranopia`, `tritanopia`, `achromatopsia`, and `monochromatic`.
