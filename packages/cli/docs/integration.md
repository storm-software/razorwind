---
title: How the CLI fits together
description: See how generate calls core and how Shell Shock builds the binary.
documentType: concept
---

# How the CLI fits together

`razorwind generate` is a thin command. It sets the working directory and calls the core `generator`. Plugins, token paths, and output files come from the Razorwind config. Read the [generation pipeline](../../core/docs/index.md).

`packages/cli/shell-shock.config.ts` points Shell Shock at `src/commands` and adds `@shell-shock/preset-cli`. That preset contributes help, update, changelog, and completions. Local command modules contribute generate, clean, gc, and test.

`clean` uses the Shell Shock engine. `gc` uses `resolveConfig` from core, then deletes environment directories. `test` does not read the Razorwind config. It loads HTML with jsdom and runs axe-core.

In an Nx workspace, [`@razorwind/nx`](../../nx/docs/index.md) can add a `generate` target that runs the same generator through the `@razorwind/nx:generate` executor.
