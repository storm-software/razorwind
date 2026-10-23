---
title: @razorwind/zed API
description: Import the default plugin factory and the theme helpers.
documentType: reference
---

# @razorwind/zed API

`zed(options)` is the default export. `generateZedExtension` builds the documents. The generated install note covers the extensions store and a copy to `~/.config/zed/themes`.

Omit the options object and generate throws `@razorwind/zed requires options: { id, mapTheme }`.
