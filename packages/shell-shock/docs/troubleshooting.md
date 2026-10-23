---
title: Fix @razorwind/shell-shock failures
description: Pass mapTheme, then point specFile at the snapshot.
documentType: recipe
---

# Fix @razorwind/shell-shock failures

The Razorwind plugin throws when `mapTheme` is missing. The Shell Shock plugin reads `specFile` from the project root. Generate the snapshot before you build the CLI that consumes it.
