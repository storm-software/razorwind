---
title: @razorwind/eslint API
description: Call the default plugin or generateEslintPlugin.
documentType: reference
---

# @razorwind/eslint API

The default export is the Razorwind plugin named `eslint`. `generateEslintPlugin(spec, options, cwd)` returns the documents.

`renderEslintPlugin` returns the module source. `@razorwind/eslint/runtime` is the default `runtimeImport`. The generated file imports `createDesignSystemPlugin` from that module.

If the schema has no tokens, components, or icons, generate returns an empty document map.
