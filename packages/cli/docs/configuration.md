---
title: CLI configuration
description: Set the working directory, garbage-collection type, and test tags.
documentType: reference
---

# CLI configuration

Generation settings belong in `razorwind.config.*`. See [Configure Razorwind](../../core/docs/configuration.md). `generate` forwards every field except `root` to the generator. Put tokens, plugins, and `mode` in the config file unless you call the handler yourself.

The Shell Shock config for this package is `packages/cli/shell-shock.config.ts`. It reads commands from `src/commands`, names the CLI `razorwind`, and applies `@shell-shock/preset-cli`.

Global option flags for preset commands are not listed in the generated reference pages in this checkout. Use `razorwind help <command>` for the flag list on your build.

## `generate` and `clean`

| Option | Required | Default | Description |
| --- | --- | --- | --- |
| `root` | No | Current working directory | Project directory. `generate` passes it as the Power Plant `cwd`. `clean` passes it to the Shell Shock engine. |

## `gc`

Synopsis from the generated reference: `razorwind gc <type>`.

| Option | Required | Default | Values |
| --- | --- | --- | --- |
| `type` | No | `all` | `data`, `cache`, `logs`, `temp`, `all` |

The handler reads `options.type` first, then the positional argument.

`data`, `cache`, `logs`, and `temp` map to `config.envPaths.data`, `.cache`, `.log`, and `.temp`. The log key on the path object is `log`, not `logs`. Paths come from `getEnvPaths` with organization `storm-software` and app `razorwind`.

## `test`

Synopsis: `razorwind test <targets...>`.

| Option | Required | Description |
| --- | --- | --- |
| `tags` | No | axe-core tags such as `wcag2a`, `wcag2aa`, or `best-practice`. Omit it to run all rules. |

Each target is an `http` or `https` URL, an HTML file, or a directory. Directories are scanned for `.html` files. Paths inside `node_modules` are skipped.
