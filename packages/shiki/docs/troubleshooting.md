---
title: Fix @razorwind/shiki failures
description: Call the plugin with the required options.
documentType: recipe
---

# Fix @razorwind/shiki failures

The generate hook throws `@razorwind/shiki requires options: { mapTheme }` when the required options are missing.
