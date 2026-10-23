---
title: Fix @razorwind/tamagui failures
description: Use target v3 when you want the ESLint guardrails.
documentType: recipe
---

# Fix @razorwind/tamagui failures

The ESLint plugin writes rules only when `target` is `v3`. The default target is `v2`, and that path does not emit the guardrail file.
