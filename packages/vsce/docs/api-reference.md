---
title: @razorwind/vsce API
description: Import the default plugin factory and the theme helpers.
documentType: reference
---

# @razorwind/vsce API

`vsce(options)` is the default export of `@razorwind/vsce`. `generateVsceExtension` builds the documents. Defaults match the Cursor package: version `0.0.1`, license `Apache-2.0`, and `engines.vscode` `^1.85.0`.

Omit the options object and generate throws `@razorwind/vsce requires options: { name, publisher, mapTheme }`.
