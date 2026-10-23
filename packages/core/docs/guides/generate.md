---
title: Walk-through: Generate design-system files
description: Follow one Razorwind run from the config export to the files on disk.
audience: New contributor
perspective: under-the-hood
documentType: tutorial
---

# Walk-through: Generate design-system files

**Audience:** New contributor · **Perspective:** under the hood · **Time:** ~15 min

## What you will learn

A generate run starts at `defineConfig` and ends when plugin documents are files. You will see where plugins run, and why a second plugin with the same name does not run.

## Before you start

You can read TypeScript. Open these files:

- [`src/index.ts`](../../src/index.ts)
- [`src/lib/prepare.ts`](../../src/lib/prepare.ts)
- [`src/lib/generate.ts`](../../src/lib/generate.ts)
- [`src/lib/resolve-config.ts`](../../src/lib/resolve-config.ts)
- [`src/lib/write-documents.ts`](../../src/lib/write-documents.ts)

## The path at a glance

1. `defineConfig` returns the user config.
2. The generator `input` hook prepares one run per config item.
3. `resolveConfigs` loads and merges the config.
4. `prepareSpec` loads sources, then runs `extract` and `validate`.
5. The `generator` hook runs `generate` hooks, once per theme when needed.
6. The `output` hook writes document chunks to disk.

## Step 1 — The config export is not transformed

[`src/config.ts`](../../src/config.ts) line 63 — `defineConfig` returns its argument. The array form is the way to ask for more than one run. Each array item is independent. A function export is called later with `{ cwd, mode }`.

## Step 2 — Input prepares every run

[`src/index.ts`](../../src/index.ts) line 64 — the Power Plant `input` hook calls `prepareGenerationRuns`. It stores the runs on the execution context and returns the first spec. If the run list is empty it throws `Unable to resolve Razorwind configuration.`

The generator still needs every run. Step 5 reads `context.generationRuns`, not only the returned spec.

## Step 3 — Config layers merge

[`src/lib/resolve-config.ts`](../../src/lib/resolve-config.ts) line 233 — `resolveConfigs` finds one file, imports it, then merges execute options, the file, workspace layers, the environment config, and the home config. The first source wins.

`uniquePlugins` (line 46) flattens nested `plugins` arrays and keeps the first plugin for each `name`. A preset works because it puts real plugins on its own `plugins` array. Those children are flattened before generate.

`finalizeConfig` sets `componentsPath` to the working directory when the field is empty. It sets `plugins` to an empty array. `verbose` is true only when execute options or the user config set it to true.

## Step 4 — Sources load, then plugins extract

[`src/lib/prepare.ts`](../../src/lib/prepare.ts) line 39 — `prepareSpec` throws when `plugins` is empty. The message starts with `Razorwind will not generate any code`.

It uses inline `tokens` when that value is not empty. Otherwise it calls `loadTokens`. Components, icons, fonts, and guidelines are merged with `defu` so inline values override loaded files.

Then each plugin with `extract` runs, in order. Then each plugin with `validate` runs, and only when the token tree is not empty. Validate does not change the spec. Extract can.

## Step 5 — Generate splits themes unless a plugin opts out

[`src/index.ts`](../../src/index.ts) line 86 — the `generator` hook uses `context.generationRuns` when that list is set. It calls `generateAllPluginDocuments`.

[`src/lib/generate.ts`](../../src/lib/generate.ts) line 127 — plugins with `themeGeneration: "combined"` run once on the full token record. Other plugins run once per real theme. The shared `base` set is not a theme of its own. Its tokens are merged into each theme. Output paths for split runs gain `-<theme>` before the extension.

[`src/lib/generate.ts`](../../src/lib/generate.ts) line 181 — several config-array runs are assigned in order. The same output path in a later run replaces the earlier document.

## Step 6 — Output writes chunks

[`src/index.ts`](../../src/index.ts) line 78 — the `output` hook calls `writeGeneratedDocuments`. Razorwind writes files itself because the Power Plant unstorage output package is not always resolvable from this package.

[`src/lib/write-documents.ts`](../../src/lib/write-documents.ts) line 39 — each document uses `document.path` or the record key. Relative paths resolve from the execution directory. Chunk text is joined and written as UTF-8. The directory is created when it is missing.

Prettier is registered as `format` on the generator (line 80). Formatting runs in Power Plant before this write. This file does not format the text again.

## Recap

The config object is kept as written. Resolve merges layers and flattens plugins. Prepare loads the schema and lets extract plugins change it. Generate calls each `generate` hook, once per theme unless the plugin is combined. Output writes the returned documents.

## Where to go next

Add a plugin with `definePlugin` in [`src/plugin.ts`](../../src/plugin.ts). Give it a unique `name`. Return documents from `generate`. Run the [CLI generate guide](../../../cli/docs/guides/generate.md) against a sample config.

This pass did not execute a generate run. The steps above are the call chain in source.
