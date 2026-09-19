<!-- START header -->
<!-- END header -->

# Razorwind Benchmark

`@razorwind/benchmark` is a Razorwind plugin for measuring how effectively AI
coding agents use a design system. It provisions an isolated TypeScript
fixture for each matrix cell, runs Claude Code or Codex, applies deterministic
mechanical graders, and emits JSON plus a self-contained HTML report.

> [!CAUTION]
> A real generation run invokes authenticated AI coding-agent CLIs and may
> consume paid credits. The package defaults to concurrency `1`; model-based
> judgment is disabled unless `judge` is explicitly configured. Automated
> package tests never invoke a live agent.

## Installation

```bash
pnpm add -D @razorwind/benchmark
```

The selected agent CLI must already be installed and authenticated in the
environment running Razorwind:

- [Codex](https://developers.openai.com/codex/) through an existing `codex`
  session; or
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code/) through an
  existing `claude` session.

The plugin does not collect, persist, or transform credentials. With no agent
selection, it detects Codex first and then Claude Code. Explicitly requested
agents are required and missing executables fail before fixtures are created.

## Safe smoke configuration

```ts
import benchmark from "@razorwind/benchmark"
import { defineConfig } from "@razorwind/core"

export default defineConfig({
  plugins: [
    benchmark({
      profile: "smoke",
      concurrency: 1,
      retainWorkspaces: false
    })
  ]
})
```

The smoke profile is bounded to one task, two context levels, and one
repetition. It still calls a real agent when Razorwind generation runs.

## Options

| Option              | Default                 | Description                                                           |
| ------------------- | ----------------------- | --------------------------------------------------------------------- |
| `profile`           | `"smoke"`               | Bundled profile name or a custom matrix profile.                      |
| `agents`            | auto-detect             | Ordered set of `"codex"` and/or `"claude-code"` agents to require.    |
| `models`            | CLI default             | Models per agent, for example `{ codex: ["gpt-5"] }`.                 |
| `contexts`          | `["bare", "agents-md"]` | Context levels used when the profile does not override them.          |
| `context.agentsMd`  | `[]`                    | Instruction files, relative to the Razorwind working directory.       |
| `context.skillDirs` | `[]`                    | Skill directories, relative to the Razorwind working directory.       |
| `tasks`             | `"bundled"`             | Bundled tasks or a validated custom `BenchmarkTask[]`.                |
| `packageName`       | Schema name             | Explicit design-system import package when Schema has no usable name. |
| `outputPath`        | `"benchmark"`           | Safe relative root for generated artifacts.                           |
| `repetitions`       | `1`                     | Repetitions when the profile does not override them.                  |
| `concurrency`       | `1`                     | Maximum simultaneous agent cells.                                     |
| `timeoutMs`         | 30 minutes              | Timeout for each generating-agent invocation.                         |
| `retainWorkspaces`  | `false`                 | Retain temporary fixtures for diagnostics.                            |
| `judge`             | disabled                | Optional paid judge agent, model, sample count, and timeout.          |

Custom profile fields are `agents`, `models`, `contexts`, `tasks` (`"*"` or
task IDs), and `repetitions`.

## Bundled profiles

| Profile  | Contexts               | Tasks                         | Repetitions |
| -------- | ---------------------- | ----------------------------- | ----------- |
| `smoke`  | bare, AGENTS.md        | account-deletion confirmation | 1           |
| `small`  | skill                  | five representative tasks     | 1           |
| `medium` | AGENTS.md, skill       | all bundled tasks             | 1           |
| `full`   | bare, AGENTS.md, skill | all bundled tasks             | 3           |

The ten bundled tasks cover action hierarchy, destructive confirmation,
status indicators, empty states, validation errors, onboarding progress,
pagination, password visibility, immediate settings, and transient success
feedback. Prompts remain intent-level; hidden component expectations are not
leaked to the generating agent.

## Context levels

- `bare` copies no guidance.
- `agents-md` copies only configured instruction files.
- `skill` copies configured instruction files and skill directories.

Every context source must remain inside the configured working directory both
lexically and after realpath resolution. Generated source collection is
similarly restricted to `src/task/` inside a unique temporary fixture.

## Outputs

The combined plugin runs once for the complete multi-theme Schema and returns:

- `benchmark/manifest.json` — resolved non-secret matrix metadata;
- `benchmark/results.json` — ordered cell results, scores, findings, errors,
  timings, and applicable dimension basis; and
- `benchmark/report.html` — a deterministic, accessible, self-contained
  summary with no external runtime dependencies.

Change the leading directory with `outputPath`. Razorwind owns final document
placement; the benchmark engine does not write artifacts directly into the
consumer workspace.

## Scoring

Scores are a weighted mean over applicable dimensions and are renormalized
when a dimension is unavailable:

| Dimension            | Weight | What it measures                                       |
| -------------------- | -----: | ------------------------------------------------------ |
| imports              |   0.10 | Foreign UI dependencies.                               |
| API fidelity         |   0.25 | Hallucinated exports and invented known props.         |
| token discipline     |   0.15 | Raw colors and dimensions bypassing tokens.            |
| static accessibility |   0.10 | Curated JSX accessibility checks.                      |
| compilation          |   0.10 | TypeScript diagnostics against generated declarations. |
| judgment             |   0.30 | Optional rubric-based model judgment.                  |

Any hard failure makes the cell fail; otherwise review findings produce a
review gate. Judgment is opt-in and may consume additional paid credits for
every configured sample.

## Schema requirements and limitations

Ground truth comes only from the Razorwind `Schema`. Component props are
extracted from embedded `component.files[].content`. When component source is
missing, export checks remain active, but prop-level API fidelity is explicitly
reported as not applicable and generated declarations stay permissive. The
benchmark never guesses a prop API from a package installation.

This initial release intentionally excludes upstream audit workflows, CI
baselines, leaderboard and comparison commands, pruning, interactive wizards,
and long-form report generation. Live browser/runtime evaluation is also out
of scope; accessibility grading is static and curated.

## Programmatic API

The package exports the plugin plus focused helpers for option resolution,
Schema adaptation, task and matrix construction, benchmark execution, and
artifact rendering. Process spawning and fixture lifecycle internals are not
public exports.

## Original work and inspiration

This package adapts the core evaluation methodology and selected implementation
from [open-design-system-bench](https://github.com/christophhdesign/open-design-system-bench),
originally authored by [Christoph Hellmuth](https://github.com/christophhdesign)
and distributed under the MIT License. See [NOTICE](NOTICE) for the preserved
license and source revision.

<!-- START footer -->
<!-- END footer -->
