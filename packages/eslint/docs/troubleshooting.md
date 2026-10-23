---
title: Fix @razorwind/eslint failures
description: Point eslintPath at a file, not a directory.
documentType: recipe
---

# Fix @razorwind/eslint failures

`eslintPath` must be a filename. When that path is an existing directory, generate throws:

```text
eslintPath must be a filename, not an existing directory: "<path>". Set eslintPath to "<path>/index.mjs" instead.
```

An empty schema writes no file. Add tokens or components, then run generate again.
