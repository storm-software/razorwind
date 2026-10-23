---
title: Fix @razorwind/maplibre failures
description: Supply mapTheme before generate.
documentType: recipe
---

# Fix @razorwind/maplibre failures

Generate throws when the plugin is called with no options. Return at least one style object that includes `name`.

`mapTheme` that returns no styles throws `@razorwind/maplibre mapTheme() returned no styles`.
