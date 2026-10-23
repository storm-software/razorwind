---
title: Razorwind CLI
description: Run the Razorwind generator and the clean, test, and garbage-collection commands.
documentType: getting-started
---

# Razorwind CLI

The `razorwind` command runs a design-system generator and a small set of project commands. `generate` loads `@razorwind/core` and writes the files your plugins declare.

Shell Shock supplies `help`, `update`, `changelog`, and shell completions. Those commands are not implemented under `packages/cli/src/commands`. Their generated pages live in [docs/reference](./reference/cli/help.md). This pass does not edit those generated pages.

## Pages

- [Installation](./installation.md)
- [Quick start](./quick-start.md)
- [Generate walk-through](./guides/generate.md)
- [Configuration](./configuration.md)
- [API reference](./api-reference.md)
- [Integration](./integration.md)
- [Troubleshooting](./troubleshooting.md)
- [Contributing](./contributing.md)
- [License](./license.md)

## Commands

| Command | Source in this package | Result |
| --- | --- | --- |
| `generate` | `src/commands/generate` | Runs the core generator. |
| `clean` | `src/commands/clean` | Asks the Shell Shock engine to clean build output. |
| `gc` | `src/commands/gc` | Deletes Razorwind data, cache, log, or temp directories. |
| `test` | `src/commands/test` | Runs axe-core on HTML files or URLs. |
| `help` | Shell Shock preset | Prints command help. |
| `update` | Shell Shock preset | Preset update command. |
| `changelog` | Shell Shock preset | Preset changelog command. |
| `completions` | Shell Shock preset | Writes bash, fish, PowerShell, or zsh completion files. |

The binary name in the manifest is `razorwind`. It points at `./dist/bin.mjs`.
