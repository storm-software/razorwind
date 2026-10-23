---
title: Install the Razorwind CLI
description: Build the CLI in this repository and run the razorwind binary.
documentType: recipe
---

# Install the Razorwind CLI

This repository requires Node.js 26.3.0 or later and pnpm 11.1.2 or later to build. Individual package manifests do not set an `engines` field.

The repository README says these packages are still in early development and are not published to npm yet. The commands below are the package names from each manifest. A registry install works only after publication.

`@razorwind/cli` sets `"private": true`. It also sets `publishConfig.access` to `public`. This checkout does not establish a registry install. Build the package in this repository, then run the binary.

```bash
pnpm build
pnpm exec razorwind help
```

The package is an ECMAScript module. It depends on `@razorwind/core`, `@power-plant/core`, and `@shell-shock/preset-cli`.

Node.js 26.3.0 or later and pnpm 11.1.2 or later match the repository `engines` field.
