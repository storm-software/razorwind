---
title: Install @razorwind/storybook
description: Add @razorwind/storybook to the project that runs Razorwind.
documentType: recipe
---

# Install @razorwind/storybook

This repository requires Node.js 26.3.0 or later and pnpm 11.1.2 or later to build. Individual package manifests do not set an `engines` field.

The repository README says these packages are still in early development and are not published to npm yet. The commands below are the package names from each manifest. A registry install works only after publication.

`@razorwind/storybook` is an ECMAScript module (`"type": "module"`) with CommonJS and import conditions.

Install it with pnpm:

```bash
pnpm add -D @razorwind/storybook
```

npm:

```bash
npm install -D @razorwind/storybook
```

yarn:

```bash
yarn add -D @razorwind/storybook
```


Peer dependencies:

| Package | Range |
| --- | --- |
| `storybook` | `>=8` |
| `@storybook/addon-docs` | `>=8` |
| `react` | `>=18` |

The package license is Apache-2.0. See the repository `LICENSE` file.
