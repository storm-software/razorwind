---
title: CLI commands
description: Run generate, clean, gc, and test, and see the preset commands.
documentType: reference
---

# CLI commands

Run commands with `razorwind <command>`. The package exports each built file under `@razorwind/cli/<name>`, including `./generate`, `./clean`, `./gc`, and `./test`.

## `generate`

```bash
razorwind generate
```

Creates a Power Plant execute function with `cwd` set to `root` or `process.cwd()`. It then runs `generator` from `@razorwind/core`.

Exit status is unchanged by this handler when generation succeeds. A missing plugin list throws the core error in [core troubleshooting](../../core/docs/troubleshooting.md).

## `clean`

```bash
razorwind clean
```

Creates a Shell Shock engine for `root` and calls `engine.clean({ command: "clean" })`. This handler does not print a summary.

## `gc`

```bash
razorwind gc all
```

Resolves the Razorwind config in the current working directory, then deletes the selected environment directories. `all` deletes data, cache, log, and temp. The handler does not print a summary. The delete is not reversible from this command.

## `test`

```bash
razorwind test ./dist wcag2aa
```

Pass tags with the `tags` option. The example above shows the command shape from the generated synopsis. Confirm the tags flag with `razorwind help test`, because the generated option table in this checkout is empty.

The handler throws `No targets provided. Pass one or more HTML files, directories, or URLs to test.` when the target list is empty.

It throws `No HTML files found in: ...` when a directory contains no HTML files.

Each result line is `✔` or `✖`, the target, and the violation count. The process exit code is set to 1 when the total is greater than zero.

jsdom does not lay out the page and does not run page scripts. Color-contrast results can come back incomplete. A client-rendered page is tested before that render.

## Preset commands

These synopses come from the generated reference pages:

| Command | Synopsis |
| --- | --- |
| `help` | `razorwind help <commands...>` |
| `update` | `razorwind update` |
| `changelog` | `razorwind changelog` |
| `completions bash script` | `razorwind completions bash script <path>` |
| `completions bash config` | `razorwind completions bash config <path>` |
| `completions fish script` | `razorwind completions fish script <path>` |
| `completions fish config` | `razorwind completions fish config <path>` |
| `completions zsh script` | `razorwind completions zsh script <path>` |
| `completions zsh config` | `razorwind completions zsh config <path>` |
| `completions powershell script` | `razorwind completions powershell script <path>` |
| `completions powershell config` | `razorwind completions powershell config <path>` |

The same `script` and `config` pair exists for each shell listed above.
