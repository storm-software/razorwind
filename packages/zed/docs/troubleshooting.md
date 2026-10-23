---
title: Fix @razorwind/zed failures
description: Call the plugin with the required options.
documentType: recipe
---

# Fix @razorwind/zed failures

The generate hook throws `@razorwind/zed requires options: { id, mapTheme }` when the required options are missing.
