---
title: Fix core generation failures
description: Check plugins, config lookup, and theme splitting when generate does nothing.
documentType: recipe
---

# Fix core generation failures

## No plugins

Prepare throws when `plugins` is missing or empty. Add a plugin factory call to the config.

## Empty config array

`defineConfig([])` throws during resolve. Provide one object, or export a single object.

## Config file not used

Set `configFile` to the file path. If `mode` is omitted, lookup uses the `undefined` segment before `razorwind.config.*`. Pass `mode: "production"` or `"development"` when you rely on `razorwind.<mode>.*`.

## Themes stay in one object

Set `splitThemes: true`. The loader does not turn that option on for you. You also need at least two theme file names that match the basename pattern in [Configuration](./configuration.md).

## Duplicate plugins

Nested plugin lists are flattened. If two plugins share a `name`, the first one runs.

## Contributor commands

From the repository root:

```bash
pnpm build
pnpm lint
pnpm typecheck
```

These scripts wrap the workspace build, lint, and typecheck tasks.
