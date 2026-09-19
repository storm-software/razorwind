# Benchmark Plugin Design

**Date:** 2026-09-19

## Intent

Add the first self-contained implementation of `@razorwind/benchmark`. The
package will adapt the core evaluation methodology from Christoph Hellmuth's
[`open-design-system-bench`](https://github.com/christophhdesign/open-design-system-bench)
and run it as a Razorwind plugin. It will evaluate how reliably Claude Code and
Codex use a design system without requiring a separate benchmark checkout.

The implementation must derive its ground truth from the in-memory Razorwind
`Schema`, execute a bounded profile matrix, and return stable benchmark
artifacts through Razorwind's normal generation pipeline. The package must
preserve the upstream project's MIT license and clearly credit the original
repository and author.

## Scope

The initial release includes:

- conversion of Razorwind component and DTCG token data into benchmark ground
  truth;
- bundled intent-level evaluation tasks adapted from the upstream suite;
- Claude Code and Codex subprocess adapters;
- matrix expansion across agents, models, context levels, tasks, and
  repetitions;
- isolated fixture execution;
- the upstream core grading dimensions: imports, API fidelity, token
  discipline, static accessibility, compilation, and optional LLM judgment;
- aggregate results and deterministic JSON, manifest, and HTML artifacts; and
- a default Razorwind plugin plus public programmatic helpers.

The initial release excludes static audits, comparison commands, CI baselines,
leaderboards, pruning, an initialization wizard, and long-form report
authoring. These features may be added later without changing the core plugin
contract.

No test or normal build command will invoke paid agent or judge sessions.

## Package Architecture

The package exposes a default `benchmark(options)` plugin. The plugin defines a
combined-theme `generate` hook so a multi-theme Razorwind run executes the
benchmark once rather than once per theme. It also exports the data conversion,
task loading, grading, scoring, execution, and rendering helpers needed for
programmatic use and focused testing.

Implementation responsibilities are divided into four areas:

- `schema/` converts a complete Razorwind `Schema` into normalized component
  catalog and token ground truth.
- `tasks/` contains the bundled tasks and validates bundled or caller-provided
  task definitions.
- `agents/` implements Claude Code and Codex behind one subprocess adapter
  contract.
- `engine/` expands the matrix, provisions fixtures, invokes agents, grades
  generated source, aggregates results, and renders reports.

Shared public types and the plugin factory remain at the package source root.
The boundaries are directional: the plugin coordinates the areas, the engine
depends on their contracts, and schema/task/agent modules do not depend on the
plugin.

Adapted source files will carry an upstream attribution header. The package
will also include the upstream MIT license in `NOTICE`, identify Christoph
Hellmuth and the original repository in its README, and include the repository
under package metadata keywords and attribution fields that do not replace
Razorwind's own package repository metadata.

## Public API

The primary API is:

```ts
benchmark({
  profile: "smoke",
  agents: ["codex", "claude-code"],
  models: {
    codex: ["gpt-5"],
    "claude-code": ["sonnet"]
  },
  contexts: ["bare", "agents-md", "skill"],
  context: {
    agentsMd: ["AGENTS.md"],
    skillDirs: [".agents/skills/design-system"]
  },
  tasks: "bundled",
  outputPath: "benchmark",
  judge: {
    agent: "claude-code",
    model: "haiku",
    samples: 1
  }
})
```

`profile` may select a built-in profile or provide an explicit matrix.
`tasks` accepts `"bundled"` or an array of task objects. Agent and judge
execution options include per-cell timeouts and environment overrides, but do
not accept a shell command string; subprocesses use argument arrays to avoid
shell interpretation. `packageName` optionally overrides the component module
specifier and otherwise resolves from `Schema.name`. Context file paths are
resolved relative to the Razorwind execution directory and must remain inside
it.

Defaults are intentionally inexpensive and safe:

- profile: `"smoke"`;
- agents: the first available configured agent;
- tasks: the bundled smoke task;
- contexts: `"bare"` and `"agents-md"`;
- repetitions: `1`;
- concurrency: `1`; and
- judging: disabled.

At least one agent and model must resolve before execution. Automatic agent
selection checks executable availability but never starts a session during
configuration.

## Data Flow

1. The generate hook validates options and receives the complete Razorwind
   `Schema` and resolved Razorwind configuration.
2. The Schema adapter normalizes public components, their files and API
   metadata, plus flattened DTCG token paths and values. Missing optional token
   data reduces the applicable grading surface; missing usable component data
   is a configuration error.
3. The task loader resolves and validates the bundled or supplied tasks before
   any subprocess starts.
4. The matrix builder creates deterministic cells ordered by agent, model,
   context, task, and repetition.
5. Each cell receives a fresh temporary fixture. The engine injects the
   appropriate context and task prompt. It generates TypeScript module
   declarations for the configured design-system package from the component
   catalog, allowing compilation to validate component and prop usage without
   requiring a second component-source extraction pass. It then invokes the
   selected agent through its adapter.
6. The engine collects only generated source under the fixture's allowed task
   directory and runs all applicable mechanical graders. Optional judgment is
   performed only when explicitly configured.
7. The aggregator records successful, failed, timed-out, and unavailable cells
   without losing completed results.
8. The renderer returns `results.json`, `manifest.json`, and `report.html` as
   Razorwind generated documents beneath `outputPath`.
9. Temporary workspaces are removed after their artifacts have been collected,
   including when a cell fails. A diagnostic option may retain them for local
   investigation, but it is off by default.

The engine does not write benchmark results directly into the consumer
workspace. Razorwind remains the owner of generated output placement.

## Agent Adapters

Both adapters implement the same contract: executable discovery, invocation,
timeout and cancellation, transcript capture, and normalized result metadata.
They invoke `claude` and `codex` without a shell and pass prompts through files
or standard input rather than interpolated command text.

The adapters rely on each CLI's existing authenticated session. The package
does not collect, persist, or transform credentials. Environment overrides are
merged narrowly into the child environment, and secrets are never copied into
generated manifests or transcripts by package code.

An adapter failure is cell-local after execution begins. Missing executables,
invalid model configuration, or an unusable global fixture configuration fail
before the matrix starts.

## Grading and Results

Mechanical grading preserves the upstream dimension names and weights:

- imports: `0.10`;
- API fidelity: `0.25`;
- token discipline: `0.15`;
- static accessibility: `0.10`;
- compilation: `0.10`; and
- judgment: `0.30` when enabled.

When judgment is disabled, the aggregate score renormalizes across applicable
mechanical dimensions and records that basis explicitly. A dimension that
cannot be measured from available Schema data is marked not applicable rather
than assigned an invented passing score.

Hard-gate behavior follows the upstream methodology: hallucinated components
or failed compilation fail a cell; foreign UI imports and critical judgment
failures require review or failure according to the corresponding grader. Each
finding includes its dimension, file when available, message, and gate.

`manifest.json` records the resolved matrix and non-secret execution metadata.
`results.json` records every cell, dimension score, gate, findings, duration,
and normalized agent metadata. `report.html` is a self-contained deterministic
view over those results and contains no external runtime dependencies.

## Errors and Safety

Configuration and ground-truth errors stop before agent execution. Runtime
timeouts, non-zero agent exits, malformed agent output, and judge failures are
captured on the affected cell so the rest of the matrix can finish. The final
plugin call throws only when no meaningful result artifact can be produced or
when a package-level invariant is violated.

Fixture paths are created under a unique temporary directory. The engine does
not install packages, start development servers, follow output paths outside
the fixture, or permit agent changes outside the fixture source directory.
Collected file paths are resolved and checked against that boundary before
reading.

Concurrency is bounded and defaults to one because agent runs may consume paid
credits. Judging is opt-in. Documentation will warn that invoking the plugin in
a real generation run may incur provider charges.

## Verification

Development follows test-first cycles. Tests will cover:

- Schema-to-catalog and DTCG-token conversion;
- task validation and prompt-leak rejection;
- deterministic matrix expansion;
- each mechanical grader and aggregate score behavior;
- adapter argument construction, timeout handling, and normalized failures
  through injected subprocess runners;
- deterministic manifest, JSON, and HTML rendering; and
- one end-to-end engine run using a fake agent in a temporary fixture.

Tests will not mock the behavior under assertion; injected boundaries replace
only real external processes. The end-to-end test must verify the complete
generated artifact set and cleanup behavior.

Focused verification will run the package's Nx-inferred test, typecheck, lint,
and build targets where present, followed by formatting checks and
`git diff --check`. A paid live Claude Code or Codex benchmark is outside
automated verification and requires separate explicit authorization.

## Attribution and Maintenance

This package is an adapted, scoped port inspired by
`christophhdesign/open-design-system-bench`, originally authored by Christoph
Hellmuth and distributed under the MIT License. Razorwind's implementation is
distributed as part of its Apache-2.0 project while preserving the license and
notices required for copied or substantially adapted upstream source.

The README will identify which behavior is preserved and which upstream
features are intentionally absent. Future upstream syncs should record the
source commit and review behavior changes before adoption rather than silently
copying the upstream tree.
