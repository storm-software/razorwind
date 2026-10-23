---
title: Fix @razorwind/color-variants failures
description: Put the plugin in extract order and pass known variant names.
documentType: recipe
---

# Fix @razorwind/color-variants failures

Generators that run before this plugin do not see the new sets. List `colorVariants()` earlier in `plugins`. An empty token tree is left unchanged.
