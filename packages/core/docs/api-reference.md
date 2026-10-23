---
title: Core API
description: Call defineConfig, resolve the config, and run the generator or a plugin hook.
documentType: reference
---

# Core API

## `defineConfig`

```ts
import { defineConfig } from "@razorwind/core";
```

Overloads accept `UserConfig`, `UserConfig[]`, a promise of either, or a function that returns either. The function is returned unchanged.

## `generator`

`generator` is a Power Plant generator. Its `input` hook calls `prepareGenerationRuns`. Its `generator` hook calls `generateAllPluginDocuments`. Its `output` hook writes the documents into the execution directory.

Import it from `@razorwind/core`.

## `resolveConfigs` and `resolveConfig`

```ts
import { resolveConfig, resolveConfigs } from "@razorwind/core";

const configs = await resolveConfigs(process.cwd(), {});
const first = await resolveConfig(process.cwd(), {});
```

`resolveConfigs(cwd, options)` returns one `Config` per array item. `resolveConfig` returns the first item.

`options` uses the `Options` fields in [Configuration](./configuration.md).

An empty config array throws: `Razorwind config array is empty. Provide at least one configuration object.`

## Prepare and generate

`prepareSpec` loads sources, runs every `extract` hook, then runs every `validate` hook when tokens are not empty. It throws when `plugins` is empty.

`generatePluginDocuments` runs `generate` hooks. Combined plugins run first, once. Split plugins then run per theme. `generateAllPluginDocuments` repeats that for each run and assigns documents in array order.

## `definePlugin`

Import it from `@razorwind/core` or `@razorwind/core/plugin`.

Pass a plugin object, or a factory `(options) => plugin`. An optional second argument is merged over the result. The factory form returns a function you call from `plugins`.

## Schema

`schema` from `@razorwind/core/schema` is a Zod object. A spec has optional identity fields, `tokens`, `components`, `icons`, `fonts`, and `guidelines`. `guidelines` defaults to an empty object so older specs still parse. `tokens` is one token tree or a record of trees.

## Utils

Import helpers from `@razorwind/core/utils`.

| Export | Use |
| --- | --- |
| `flattenTokens` | Walk a token tree into path, type, and CSS value rows. |
| `resolveTokenSets` | List theme sets in a token record. |
| `mergeTokenTrees` | Merge two token trees. |
| `toCssVar(path, prefix?)` | Build a custom property name. `toCssVar("color.primary", "ads")` returns `--ads-color-primary`. |
| `formatTokenValue` | Format a token for CSS output. |
| `createDocument` | Build one Power Plant document record. |
| `cssVarPrefixFromName` | Derive a prefix from a schema name. |
| `escapeMdx` | Escape text for MDX. |
| `slugifyThemeName`, `themeDisplayName`, `titleCase` | Format theme labels and file names. |

`createDocument` is for plugin authors. Pass the output path, file contents, and `{ name }`.
