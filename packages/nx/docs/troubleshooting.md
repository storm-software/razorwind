---
title: Fix @razorwind/nx failures
description: Keep razorwind.config.ts next to a package.json.
documentType: recipe
---

# Fix @razorwind/nx failures

The plugin logs an error and skips a file when `package.json` is missing or the project root cannot be resolved.

`verboseOutput: true` prints those skip reasons. The executor option `verbose` is separate. It turns on Style Dictionary verbose logs.
