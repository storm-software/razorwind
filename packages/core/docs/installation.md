---
title: Install Razorwind core
description: Add @razorwind/core and confirm the package entry points.
documentType: recipe
---

# Install Razorwind core

This repository requires Node.js 26.3.0 or later and pnpm 11.1.2 or later to build. Individual package manifests do not set an `engines` field.

The repository README says these packages are still in early development and are not published to npm yet. The commands below are the package names from each manifest. A registry install works only after publication.

`@razorwind/core` is an ECMAScript module (`"type": "module"`) with CommonJS and import export conditions.

Install it with pnpm:

```bash
pnpm add -D @razorwind/core
```

npm:

```bash
npm install -D @razorwind/core
```

yarn:

```bash
yarn add -D @razorwind/core
```

The package license is Apache-2.0. See the repository `LICENSE` file.

## Entry points

| Import | Contents |
| --- | --- |
| `@razorwind/core` | `defineConfig`, `definePlugin`, `generator`, `resolveConfig`, and `resolveConfigs`. |
| `@razorwind/core/plugin` | `definePlugin` and the `Plugin` type. |
| `@razorwind/core/schema` | The Zod schema for a design-system spec. |
| `@razorwind/core/utils` | Token flatten, merge, and CSS helpers. |
| `@razorwind/core/lib/tokens` | Token loaders and parser names. |
| `@razorwind/core/lib/fonts` | Font load and CSS helpers. |

Runtime dependencies include `@power-plant/core`, Style Dictionary, Zod, and `c12`. Install those through this package. Do not import them unless your own code calls them.
