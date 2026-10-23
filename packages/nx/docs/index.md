---
title: Nx plugin
description: Add a Razorwind generate target for every razorwind.config.ts file.
documentType: getting-started
---

# Nx plugin

`createNodesV2` watches `**/razorwind.config.ts`. For each file it finds a project `package.json` and adds a target. The default target name is `generate`. The executor is `@razorwind/nx:generate`. The target depends on `^generate` (or `^` plus your target name). Configurations are `production` and `development`.

## Pages

- [Installation](./installation.md)
- [Quick start](./quick-start.md)
- [Configuration](./configuration.md)
- [API reference](./api-reference.md)
- [Troubleshooting](./troubleshooting.md)
