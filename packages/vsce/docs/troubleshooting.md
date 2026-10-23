---
title: Fix @razorwind/vsce failures
description: Call the plugin with the required options.
documentType: recipe
---

# Fix @razorwind/vsce failures

The generate hook throws `@razorwind/vsce requires options: { name, publisher, mapTheme }` when the required options are missing.
