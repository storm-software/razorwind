---
title: @razorwind/maplibre API
description: Call the default plugin or generateMapLibreStyle.
documentType: reference
---

# @razorwind/maplibre API

The default export is `definePlugin` for options `MapLibrePluginOptions`. The plugin name is `maplibre`. It throws `@razorwind/maplibre requires options: { mapTheme }` when you omit options.

`generateMapLibreStyle(spec, options)` returns the Power Plant documents. `renderStyleJson` serializes one style.
