---
title: @razorwind/shiki API
description: Import the default plugin factory and the theme helpers.
documentType: reference
---

# @razorwind/shiki API

`shiki(options)` is the default export. `GenerateShikiTheme` receives the Razorwind schema, so the example reads `spec.tokens`. `generateShikiTheme` builds the documents.

Omit the options object and generate throws `@razorwind/shiki requires options: { mapTheme }`.
