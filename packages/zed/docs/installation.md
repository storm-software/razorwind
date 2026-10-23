---
title: Install @razorwind/zed
description: Add @razorwind/zed to the project that runs Razorwind.
documentType: recipe
---

# Install @razorwind/zed

This repository requires Node.js 26.3.0 or later and pnpm 11.1.2 or later to build. Individual package manifests do not set an `engines` field.

The repository README says these packages are still in early development and are not published to npm yet. The commands below are the package names from each manifest. A registry install works only after publication.

`@razorwind/zed` is an ECMAScript module (`"type": "module"`) with CommonJS and import conditions.

Install it with pnpm:

```bash
pnpm add -D @razorwind/zed
```

npm:

```bash
npm install -D @razorwind/zed
```

yarn:

```bash
yarn add -D @razorwind/zed
```

The package license is Apache-2.0. See the repository `LICENSE` file.
