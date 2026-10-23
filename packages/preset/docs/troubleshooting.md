---
title: Fix @razorwind/preset failures
description: Check mapTheme, the plugin list, and adapter names.
documentType: recipe
---

# Fix @razorwind/preset failures

Missing `mapTheme` or an empty `plugins` list throws before generation.

A factory that is not one of the supported names throws `has no adapter`. Pass the plugin's default export, not a local wrapper with a different `name`.

`mapTheme` must return a plain object. Arrays and other values throw `@razorwind/preset mapTheme() must return a theme record`.
