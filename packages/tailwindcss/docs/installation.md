---
title: Install @razorwind/tailwindcss
description: Add @razorwind/tailwindcss to the project that runs Razorwind.
documentType: recipe
---

# Install @razorwind/tailwindcss

This repository requires Node.js 26.3.0 or later and pnpm 11.1.2 or later to build. Individual package manifests do not set an `engines` field.

The repository README says these packages are still in early development and are not published to npm yet. The commands below are the package names from each manifest. A registry install works only after publication.

`@razorwind/tailwindcss` is an ECMAScript module (`"type": "module"`) with CommonJS and import conditions.

Install it with pnpm:

```bash
pnpm add -D @razorwind/tailwindcss
```

npm:

```bash
npm install -D @razorwind/tailwindcss
```

yarn:

```bash
yarn add -D @razorwind/tailwindcss
```


Peer dependencies:

| Package | Range |
| --- | --- |
| `stylelint` | `^16.8.2 || ^17.0.0` |

The package license is Apache-2.0. See the repository `LICENSE` file.
