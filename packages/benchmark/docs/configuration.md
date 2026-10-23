---
title: Configure @razorwind/benchmark
description: Choose a profile, agents, and output path.
documentType: reference
---

# Configure @razorwind/benchmark

### `JudgeOptions`

Declared in `benchmark/src/types.ts`.

| Option | Required | Type | Description |
| --- | --- | --- | --- |
| `agent` | Yes | `AgentId` | See the type declaration. |
| `model` | Yes | `string` | See the type declaration. |
| `samples` | No | `number` | See the type declaration. |
| `timeoutMs` | No | `number` | See the type declaration. |

### `BenchmarkOptions`

Declared in `benchmark/src/types.ts`.

| Option | Required | Type | Description |
| --- | --- | --- | --- |
| `profile` | No | `"smoke" \| "small" \| "medium" \| "full" \| BenchmarkProfile` | See the type declaration. |
| `agents` | No | `AgentId[]` | See the type declaration. |
| `models` | No | `Partial<Record<AgentId, string[]>>` | See the type declaration. |
| `contexts` | No | `ContextLevel[]` | See the type declaration. |
| `context` | No | `{ agentsMd?: string[]; skillDirs?: string[] }` | See the type declaration. |
| `tasks` | No | `"bundled" \| BenchmarkTask[]` | See the type declaration. |
| `packageName` | No | `string` | See the type declaration. |
| `outputPath` | No | `string` | See the type declaration. |
| `repetitions` | No | `number` | See the type declaration. |
| `concurrency` | No | `number` | See the type declaration. |
| `timeoutMs` | No | `number` | See the type declaration. |
| `retainWorkspaces` | No | `boolean` | See the type declaration. |
| `judge` | No | `JudgeOptions` | See the type declaration. |

Defaults from `resolveBenchmarkOptions`: profile `smoke`, contexts `bare` and `agents-md` when the profile does not replace them, tasks `bundled`, repetitions `1`, concurrency `1`, timeout 1800000 ms, `outputPath` `benchmark`.

`outputPath` must be a relative path inside the project. Absolute paths and `..` segments are rejected.

Built-in profiles set contexts, task ids, and repetitions. They do not set agents. When `agents` is omitted, `runBenchmark` selects the first installed agent, trying `codex` and then `claude-code`. `smoke` runs the task `confirm-account-deletion` once in `bare` and `agents-md` contexts.
