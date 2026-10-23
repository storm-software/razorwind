---
title: Configure @razorwind/maplibre
description: Set the output directory and the required style mapping.
documentType: reference
---

# Configure @razorwind/maplibre

`mapTheme` receives the token tree and an optional theme id such as `darkDimmed` when Razorwind splits themes.

### `MapLibrePluginOptions`

Declared in `maplibre/src/types.ts`.

| Option | Required | Type | Description |
| --- | --- | --- | --- |
| `outputPath` | No | `string` | See the type declaration. |
| `mapTheme` | Yes | `GenerateMapLibreStyle` | See the type declaration. |
| `installGuide` | No | `string` | See the type declaration. |
