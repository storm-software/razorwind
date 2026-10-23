---
title: @razorwind/css API
description: Import generate or extract, not a root default.
documentType: reference
---

# @razorwind/css API

| Import | Export |
| --- | --- |
| `@razorwind/css` | `extract` and `generate` namespaces. |
| `@razorwind/css/generate` | Default generate plugin. `CssGeneratePluginOptions`. |
| `@razorwind/css/extract` | Default extract plugin. `parseCssTokens`, `extractCssTokens`, `CSS_PATH_CANDIDATES`. |

`parseCssTokens(contents)` returns a token tree from CSS text.
