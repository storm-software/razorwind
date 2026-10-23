---
title: @razorwind/tailwindcss API
description: Import the subpath that matches the task.
documentType: reference
---

# @razorwind/tailwindcss API

| Import | Role |
| --- | --- |
| `@razorwind/tailwindcss/generate` | Default plugin that writes CSS. |
| `@razorwind/tailwindcss/extract` | Default plugin that reads CSS. |
| `@razorwind/tailwindcss/eslint` | Default plugin that writes an ESLint guardrail module. |
| `@razorwind/tailwindcss/stylelint` | Default plugin that writes a Stylelint guardrail module. |

The package root exports those four names as namespaces. `renderTailwindCss` and `generateTailwindCss` live on the generate module.
