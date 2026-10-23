---
title: @razorwind/design-md API
description: Call the generate or extract plugin.
documentType: reference
---

# @razorwind/design-md API

`@razorwind/design-md/generate` exports `generateDesignMd`, `renderDesignMd`, `mergeDesignMd`, and `extractDesignMd`. `@razorwind/design-md/extract` exports `parseDesignMdTokens` and `designMdToTokens`. Default front matter uses the name `Razorwind Design System` and version `alpha`.

`renderDesignMd` writes YAML front matter, then puts the generated sections between `<!-- razorwind configuration start -->` and `<!-- razorwind configuration end -->`. Pass the current file contents to `generateDesignMd` to replace that front matter and comment block and keep the other markdown. The generate plugin reads the output file and does this merge on each run.
