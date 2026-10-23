---
title: Fix @razorwind/stylelint failures
description: Point stylelintPath at a file, not a directory.
documentType: recipe
---

# Fix @razorwind/stylelint failures

When `stylelintPath` is an existing directory, generate throws:

```text
stylelintPath must be a filename, not an existing directory: "<path>". Set stylelintPath to "<path>/index.mjs" instead.
```
