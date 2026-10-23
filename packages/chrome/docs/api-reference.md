---
title: @razorwind/chrome API
description: Import the default plugin factory and the theme helpers.
documentType: reference
---

# @razorwind/chrome API

Call `chrome(options)` from `@razorwind/chrome`. `mapTheme` is required. `toChromeRgb` converts a CSS color to the RGB array Chrome expects. `generateChromeTheme` writes the documents when you call it yourself.

Omit the options object and generate throws `@razorwind/chrome requires options: { mapTheme }`.
