---
title: Agent benchmark
description: Score coding agents against design-system tasks.
documentType: getting-started
---

# Agent benchmark

The plugin runs a matrix of agent, model, context, and task cells. Built-in profiles are `smoke`, `small`, `medium`, and `full`. The default profile is `smoke`. Those profiles do not list agents. When you omit `agents`, generation detects `codex` and then `claude-code`, and it uses the first one that is installed. Set `agents` when you need a specific agent. Supported ids are `claude-code` and `codex`.

## Pages

- [Installation](./installation.md)
- [Quick start](./quick-start.md)
- [Configuration](./configuration.md)
- [API reference](./api-reference.md)
- [Troubleshooting](./troubleshooting.md)
