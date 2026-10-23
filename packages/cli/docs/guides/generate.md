---
title: Walk-through: Run razorwind generate
description: Create a config file, run the generate command, and see which files the plugins write.
audience: Integrator
perspective: hands-on
documentType: tutorial
---

# Walk-through: Run razorwind generate

**Audience:** Integrator · **Perspective:** hands-on · **Time:** ~10 min

## What you will learn

You start with a token file and end with the files a plugin writes. The command does not choose the output format. The plugins in `razorwind.config.ts` do.

## Before you start

Node.js 26.3.0 or later and pnpm 11.1.2 or later match this repository. Build the CLI from the repository root with `pnpm build`. The package manifest sets `private` to true, so this checkout does not show a registry install.

You need one token file and one plugin. The [core quick start](../../../core/docs/quick-start.md) shows a CSS example.

## The path at a glance

1. Put tokens and `razorwind.config.ts` in the project.
2. Run `razorwind generate`.
3. The command sets the working directory and calls the core generator.
4. Read the files the plugin declared.

## Step 1 — Write the config

Create `razorwind.config.ts` next to the project you want to generate. Export `defineConfig` from `@razorwind/core`. Set `tokensPath` and at least one plugin.

Leave `mode` unset unless you have a `razorwind.<mode>.*` file. When `mode` is omitted, lookup also checks the name `razorwind.undefined.*` before `razorwind.config.*`. A normal `razorwind.config.ts` still wins when the `undefined` file is absent.

## Step 2 — Run generate

From the project directory:

```bash
razorwind generate
```

Pass a different directory with the `root` option when the config is not in the current directory. Confirm the flag spelling with `razorwind help generate`. The handler uses `root` as the Power Plant working directory and uses the current directory when `root` is omitted.

The handler does not print a success line. A thrown error is the failure signal.

## Step 3 — What the command calls

[`src/commands/generate/command.ts`](../../src/commands/generate/command.ts) line 40 — the handler forwards every field except `root` to the core `generator`. Token paths and plugins still come from the config file. Do not rely on extra CLI flags for those fields. The generated option table in this checkout does not list them.

The core run is the [generation walk-through](../../../core/docs/guides/generate.md).

## Step 4 — Check the output

Open the path in the plugin options. The CSS generate plugin writes `src/styles.css` when `outputPath` is omitted. Other plugins use the defaults in their configuration pages.

If generate throws `Razorwind will not generate any code`, the config has no plugins.

If two plugins share a `name`, only the first one runs.

## Recap

You point `razorwind generate` at a directory. Core loads `razorwind.config.ts`, runs the plugins, and writes their documents. The command's only declared option is `root`.

## Where to go next

Change `outputPath` on the plugin and run `razorwind generate` again. The new file should appear, and the old file is left in place. This command does not delete previous output. Use `razorwind clean` when you want the Shell Shock clean step.

This pass did not run the binary. The command text and the thrown error are from the handler and from core.
