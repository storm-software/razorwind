# Benchmark Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a self-contained `@razorwind/benchmark` plugin that evaluates generated React/TypeScript work with Claude Code or Codex and emits deterministic benchmark artifacts from Razorwind Schema ground truth.

**Architecture:** A combined-theme Razorwind generator converts the in-memory Schema into a component/token catalog, expands a deterministic task matrix, provisions isolated fixtures, invokes a selected agent through a subprocess boundary, grades the resulting source, and returns JSON/HTML documents through Razorwind's writer. The scoped port preserves the upstream dimension contract and bundled tasks while replacing filesystem catalog extraction with a Schema adapter.

**Tech Stack:** TypeScript 6, Razorwind plugin API, Vitest 4, `@babel/parser`, `@babel/traverse`, `react-docgen-typescript`, Node child processes/filesystem, Nx inferred targets, Powerlines/tsdown.

**Spec:** `docs/superpowers/specs/2026-09-19-benchmark-plugin-design.md`

## Global Constraints

- Derive benchmark ground truth only from the in-memory Razorwind `Schema`; do not scan the consumer component source tree.
- Support both `claude-code` and `codex` agent ids behind one adapter contract.
- Run the plugin once for multi-theme schemas with `themeGeneration: "combined"`.
- Default to the `smoke` profile, one repetition, concurrency `1`, and judging disabled.
- Never invoke an authenticated agent or judge from unit/integration tests.
- Invoke subprocesses with executable plus argument arrays and `shell: false`; never interpolate a shell command.
- Keep fixture writes inside a unique temporary directory and generated documents beneath a validated relative `outputPath`.
- Record cell-local timeouts and agent/judge failures without discarding completed cells.
- Preserve the upstream MIT license and credit Christoph Hellmuth and `christophhdesign/open-design-system-bench` in adapted-source headers, `NOTICE`, README, and package metadata.
- Do not add the upstream audit, compare, CI baseline, leaderboard, pruning, initialization wizard, or long-form report commands.
- Do not run a paid live Claude Code or Codex benchmark without separate explicit authorization.

## Review Focus

- A component without embedded source content must keep component-name grading active while marking prop-level fidelity not applicable; Task 2 pins this behavior.
- Multi-theme token records must produce one stable catalog and one benchmark run with theme-qualified token paths; Tasks 2 and 8 pin this behavior.
- Absolute or traversal output/context paths must fail before fixture creation or agent execution; Tasks 1 and 5 pin these boundaries.
- A timed-out process must terminate its process group and become one cell-local error while later cells still run; Tasks 6 and 7 pin this behavior.
- Symlinks or resolved context paths escaping the configured Razorwind cwd must be rejected rather than copied into a fixture; Task 5 pins this behavior.

---

### Task 1: Package Contracts, Option Resolution, and Attribution Skeleton

**Files:**

- Create: `packages/benchmark/src/types.ts`
- Create: `packages/benchmark/src/options.ts`
- Create: `packages/benchmark/tests/options.test.ts`
- Create: `packages/benchmark/NOTICE`
- Modify: `packages/benchmark/package.json`
- Modify: `packages/benchmark/powerlines.config.ts`
- Modify: `packages/benchmark/tsconfig.lib.json`
- Modify: `pnpm-workspace.yaml`

**Interfaces:**

- Consumes: `Schema`, `Config`, and `Plugin` from `@razorwind/core` in later tasks.
- Produces: `BenchmarkOptions`, `ResolvedBenchmarkOptions`, `BenchmarkTask`, `BenchmarkProfile`, `AgentId`, `ContextLevel`, `CellSpec`, `CellResult`, `DimensionResult`, `GroundTruth`, `resolveBenchmarkOptions(options, cwd)`, and `assertSafeRelativePath(path, label)`.

- [ ] **Step 1: Write the failing option-resolution tests**

```ts
import { describe, expect, it } from "vitest"
import { resolveBenchmarkOptions } from "../src/options"

describe("resolveBenchmarkOptions", () => {
  it("uses the bounded no-judge smoke defaults", () => {
    expect(resolveBenchmarkOptions({}, "/workspace")).toMatchObject({
      profile: "smoke",
      contexts: ["bare", "agents-md"],
      repetitions: 1,
      concurrency: 1,
      judge: undefined,
      outputPath: "benchmark",
      cwd: "/workspace"
    })
  })

  it.each(["../escape", "/absolute", "benchmark/../../escape"])(
    "rejects unsafe output path %s",
    outputPath => {
      expect(() =>
        resolveBenchmarkOptions({ outputPath }, "/workspace")
      ).toThrow(/outputPath must be a relative path inside the output root/)
    }
  )
})
```

- [ ] **Step 2: Run the test and verify the intended red state**

Run: `devenv shell -- pnpm nx test benchmark -- --run tests/options.test.ts`

Expected: FAIL because `src/options.ts` and the public contracts do not exist.

- [ ] **Step 3: Add the minimal public contracts and strict option resolver**

Define discriminated contracts in `src/types.ts`, including these stable shapes:

```ts
export type AgentId = "claude-code" | "codex"
export type ContextLevel = "bare" | "agents-md" | "skill"
export type Gate = "pass" | "review" | "fail"
export type DimensionName =
  | "imports"
  | "apiFidelity"
  | "tokenDiscipline"
  | "a11yStatic"
  | "compile"
  | "judgment"

export interface BenchmarkOptions {
  profile?: "smoke" | "small" | "medium" | "full" | BenchmarkProfile
  agents?: AgentId[]
  models?: Partial<Record<AgentId, string[]>>
  contexts?: ContextLevel[]
  context?: { agentsMd?: string[]; skillDirs?: string[] }
  tasks?: "bundled" | BenchmarkTask[]
  packageName?: string
  outputPath?: string
  repetitions?: number
  concurrency?: number
  timeoutMs?: number
  retainWorkspaces?: boolean
  judge?: {
    agent: AgentId
    model: string
    samples?: number
    timeoutMs?: number
  }
}
```

Implement `assertSafeRelativePath` with `node:path` normalization. Reject empty, absolute, `.`/`..`, and normalized paths beginning with `../`. Resolve defaults without probing executables.

- [ ] **Step 4: Add package/runtime metadata and attribution skeleton**

Add workspace dependencies on `@razorwind/core` and `@power-plant/core`; add catalog entries and package dependencies for `@babel/parser`, `@babel/traverse`, `@babel/types`, and `react-docgen-typescript`; keep `typescript` available at runtime because compile grading uses its API. Add matching type packages as development dependencies. Correct the package description grammar and add keywords `benchmark`, `evaluation`, `ai-agents`, and `open-design-system-bench`.

Change Powerlines inputs to only real public entries:

```ts
input: ["src/index.ts"]
```

Remove the unrelated Style Dictionary project reference from `tsconfig.lib.json`, retain the core reference, and create `NOTICE` containing the upstream repository URL, author, source commit `e258a12dff8d483746e9a9ebfa655fa827301e13`, and its full MIT license text from `/tmp/open-design-system-bench/LICENSE`.

- [ ] **Step 5: Run focused tests and typecheck**

Run: `devenv shell -- pnpm nx test benchmark -- --run tests/options.test.ts`

Expected: PASS.

Run: `devenv shell -- pnpm nx run benchmark:typecheck`

Expected: PASS, or if the inferred target name differs, inspect `devenv shell -- pnpm nx show project benchmark` and run its declared typecheck target.

- [ ] **Step 6: Commit the contracts**

```bash
git add pnpm-workspace.yaml pnpm-lock.yaml packages/benchmark/package.json packages/benchmark/powerlines.config.ts packages/benchmark/tsconfig.lib.json packages/benchmark/NOTICE packages/benchmark/src/types.ts packages/benchmark/src/options.ts packages/benchmark/tests/options.test.ts
git commit -m "feat(benchmark): define package contracts"
```

### Task 2: Schema Ground-Truth Adapter and Component Declarations

**Files:**

- Create: `packages/benchmark/src/schema/adapt.ts`
- Create: `packages/benchmark/src/schema/props.ts`
- Create: `packages/benchmark/src/schema/declarations.ts`
- Create: `packages/benchmark/src/schema/index.ts`
- Create: `packages/benchmark/tests/schema.test.ts`

**Interfaces:**

- Consumes: `GroundTruth` and catalog/token types from Task 1; `Schema` from `@razorwind/core/schema`.
- Produces: `adaptSchema(schema, options): Promise<GroundTruth>`, `extractComponentProps(files): Promise<ComponentPropMap | null>`, and `renderComponentDeclarations(groundTruth): string`.

- [ ] **Step 1: Write failing adapter tests using real Schema content**

```ts
const schema = {
  name: "@acme/ui",
  components: {
    button: {
      name: "button",
      title: "Button",
      files: [
        {
          path: "Button.tsx",
          content:
            "export interface ButtonProps { tone: 'primary' | 'danger'; disabled?: boolean }\nexport function Button(_: ButtonProps) { return null }"
        }
      ]
    },
    card: { name: "card", title: "Card" }
  },
  icons: {},
  fonts: {},
  tokens: {
    light: { color: { primary: { $type: "color", $value: "#0055cc" } } },
    dark: { color: { primary: { $type: "color", $value: "#66aaff" } } }
  }
} satisfies Schema

it("derives exports, props, and theme-qualified token paths from Schema", async () => {
  const groundTruth = await adaptSchema(schema, {})
  expect(groundTruth.packageName).toBe("@acme/ui")
  expect(groundTruth.components.Button.props).toEqual({
    tone: { required: true, type: "'primary' | 'danger'" },
    disabled: { required: false, type: "boolean" }
  })
  expect(groundTruth.components.Card.props).toBeNull()
  expect(groundTruth.tokens.map(token => token.path)).toEqual([
    "dark.color.primary",
    "light.color.primary"
  ])
})
```

Also assert that `renderComponentDeclarations` emits strict props for `Button`, but an index signature for `Card`, so missing source content cannot produce false invented-prop findings.

- [ ] **Step 2: Run the adapter test and verify it fails**

Run: `devenv shell -- pnpm nx test benchmark -- --run tests/schema.test.ts`

Expected: FAIL because the Schema adapter is missing.

- [ ] **Step 3: Implement deterministic token and component normalization**

Sort component exports and flattened token paths lexically. Convert component keys/titles to valid PascalCase exports while preserving the source `name`. Detect a token leaf by `$value`, carry `$type`, theme, and JSON-safe value, and never resolve the same object twice through cyclic references.

For prop extraction, define `ComponentPropMap` as
`Record<string, { required: boolean; type: string }>`; write embedded source
strings to a package-owned temporary directory, invoke
`react-docgen-typescript` only on those temporary files, merge duplicate
component docs by display name, and delete the directory in `finally`. Return
`null` for a component with no usable source or no extracted props; do not
return an empty map that would make every prop look invented.

- [ ] **Step 4: Render fixture declarations from the normalized catalog**

Emit one ambient module with named component and props exports:

```ts
declare module "@acme/ui" {
  import type { ComponentType } from "react"
  export interface ButtonProps {
    tone: "primary" | "danger"
    disabled?: boolean
  }
  export const Button: ComponentType<ButtonProps>
  export type CardProps = Record<string, unknown>
  export const Card: ComponentType<CardProps>
}
```

Escape module names and property names, preserve docgen type text, and fall back to `unknown` when a type string cannot be represented safely.

- [ ] **Step 5: Run adapter tests and typecheck**

Run: `devenv shell -- pnpm nx test benchmark -- --run tests/schema.test.ts`

Expected: PASS, including the missing-source and multi-theme assertions.

Run: `devenv shell -- pnpm nx run benchmark:typecheck`

Expected: PASS.

- [ ] **Step 6: Commit the adapter**

```bash
git add packages/benchmark/src/schema packages/benchmark/tests/schema.test.ts
git commit -m "feat(benchmark): derive ground truth from schema"
```

### Task 3: Bundled Tasks, Validation, Profiles, and Matrix Expansion

**Files:**

- Create: `packages/benchmark/src/tasks/bundled.ts`
- Create: `packages/benchmark/src/tasks/load.ts`
- Create: `packages/benchmark/src/tasks/index.ts`
- Create: `packages/benchmark/src/engine/matrix.ts`
- Create: `packages/benchmark/tests/tasks.test.ts`
- Create: `packages/benchmark/tests/matrix.test.ts`

**Interfaces:**

- Consumes: `BenchmarkTask`, `BenchmarkProfile`, `CellSpec`, agent/context types, and resolved options from Task 1.
- Produces: `BUNDLED_TASKS`, `loadTasks(input)`, `validateTask(task)`, `BUILT_IN_PROFILES`, and `expandMatrix(options, tasks): CellSpec[]`.

- [ ] **Step 1: Write failing task validation and bundled-suite tests**

Assert that the bundled suite has exactly the ten upstream ids:

```ts
expect(BUNDLED_TASKS.map(task => task.id)).toEqual([
  "cancel-plan-action-hierarchy",
  "confirm-account-deletion",
  "connection-status-indicator",
  "empty-state-devices",
  "form-validation-errors",
  "onboarding-flow",
  "paginated-activity-log",
  "password-visibility",
  "settings-toggle-section",
  "success-feedback"
])
```

Add a task whose prompt names an expected component and expect `validateTask` to throw `task "leak" prompt reveals hidden component "Button"`. Add duplicate-id, empty-prompt, and missing-rubric cases.

- [ ] **Step 2: Run the task test and verify it fails**

Run: `devenv shell -- pnpm nx test benchmark -- --run tests/tasks.test.ts`

Expected: FAIL because the suite and validator do not exist.

- [ ] **Step 3: Port the ten task definitions into typed constants**

Adapt the YAML files under `/tmp/open-design-system-bench/tasks/` into `BenchmarkTask` constants without weakening prompts, hidden expectations, critical rubrics, or mechanical overrides. Put the upstream MIT attribution header and source commit on `bundled.ts`. Validate every supplied or bundled task before returning it.

- [ ] **Step 4: Write failing deterministic matrix tests**

```ts
it("orders cells by agent, model, context, task, and repetition", () => {
  const cells = expandMatrix(resolvedOptions, [taskB, taskA])
  expect(cells.map(cell => cell.id)).toEqual([
    "claude-code|sonnet|bare|a|1",
    "claude-code|sonnet|bare|a|2",
    "claude-code|sonnet|bare|b|1",
    "claude-code|sonnet|bare|b|2",
    "codex|gpt-5|bare|a|1",
    "codex|gpt-5|bare|a|2",
    "codex|gpt-5|bare|b|1",
    "codex|gpt-5|bare|b|2"
  ])
})
```

Also assert that `smoke` selects one task, two contexts, and one repetition, while an explicit profile overrides those values.

- [ ] **Step 5: Implement built-in profiles and pure matrix expansion**

Keep expansion free of filesystem/process work. Sort ids/models/tasks consistently, reject a profile that resolves to zero cells, and use the exact pipe-separated cell id shown in the test.

- [ ] **Step 6: Run both suites and commit**

Run: `devenv shell -- pnpm nx test benchmark -- --run tests/tasks.test.ts tests/matrix.test.ts`

Expected: PASS.

```bash
git add packages/benchmark/src/tasks packages/benchmark/src/engine/matrix.ts packages/benchmark/tests/tasks.test.ts packages/benchmark/tests/matrix.test.ts
git commit -m "feat(benchmark): add evaluation task matrix"
```

### Task 4: Source Analysis and Mechanical Graders

**Files:**

- Create: `packages/benchmark/src/grade/analyze.ts`
- Create: `packages/benchmark/src/grade/imports.ts`
- Create: `packages/benchmark/src/grade/api-fidelity.ts`
- Create: `packages/benchmark/src/grade/token-discipline.ts`
- Create: `packages/benchmark/src/grade/a11y-static.ts`
- Create: `packages/benchmark/src/grade/score.ts`
- Create: `packages/benchmark/src/grade/index.ts`
- Create: `packages/benchmark/tests/grade.test.ts`

**Interfaces:**

- Consumes: `BenchmarkTask`, `GroundTruth`, `DimensionResult`, `Gate`, and collected source files.
- Produces: `analyzeSource(path, source): FileAnalysis`, `gradeMechanical(context): DimensionResult[]`, and `composeScore(dimensions): { score: number; gate: Gate; basis: DimensionName[] }`.

- [ ] **Step 1: Write one failing behavioral test per mechanical dimension**

Use real TSX strings, not mocked analysis. Cover:

```tsx
import { Button, Imaginary } from "@acme/ui"
import { Dialog } from "foreign-ui"

export function Example() {
  return (
    <Button
      imaginaryProp
      className="bg-[#ff0000] w-[137px]"
      onClick={() => {}}
    />
  )
}
```

Expect a foreign-import finding, a hard-fail hallucinated export, a review invented prop when props are known, raw color/dimension findings, and the accessible-name/keyboard finding appropriate to the fixture. Add the same `imaginaryProp` usage against a component with `props: null` and assert that prop-level API fidelity is not applicable rather than passing or failing.

- [ ] **Step 2: Run the grading test and verify it fails**

Run: `devenv shell -- pnpm nx test benchmark -- --run tests/grade.test.ts`

Expected: FAIL because analysis and graders do not exist.

- [ ] **Step 3: Port the upstream analysis and four static graders**

Adapt the implementation from upstream `src/grade/ast.ts` and `src/grade/mechanical/{imports,api-fidelity,token-discipline,a11y-static}.ts`, preserving weights and gate thresholds. Replace `SystemConfig` lookups with `GroundTruth`; use `component.props === null` to suppress invented-prop judgments while retaining import/export checks. Keep DOM passthrough, `data-*`, `aria-*`, and event-handler allowances.

Each adapted file must identify the upstream repository, MIT license, and source commit in its header.

- [ ] **Step 4: Implement applicable-dimension score composition**

Use weights `{ imports: 0.10, apiFidelity: 0.25, tokenDiscipline: 0.15, a11yStatic: 0.10, compile: 0.10, judgment: 0.30 }`. Exclude `applicable: false` dimensions and renormalize by the remaining weight sum. Overall gate is `fail` when any hard gate fails, otherwise `review` when any dimension reviews, otherwise `pass`.

- [ ] **Step 5: Run grader tests and typecheck**

Run: `devenv shell -- pnpm nx test benchmark -- --run tests/grade.test.ts`

Expected: PASS.

Run: `devenv shell -- pnpm nx run benchmark:typecheck`

Expected: PASS.

- [ ] **Step 6: Commit mechanical grading**

```bash
git add packages/benchmark/src/grade packages/benchmark/tests/grade.test.ts
git commit -m "feat(benchmark): add mechanical grading"
```

### Task 5: Safe Fixture Provisioning and Compile Grading

**Files:**

- Create: `packages/benchmark/src/engine/fixture.ts`
- Create: `packages/benchmark/src/grade/compile.ts`
- Create: `packages/benchmark/tests/fixture.test.ts`
- Create: `packages/benchmark/tests/compile.test.ts`

**Interfaces:**

- Consumes: resolved context options, `GroundTruth`, `BenchmarkTask`, and `renderComponentDeclarations`.
- Produces: `provisionFixture(request): Promise<Fixture>`, `collectFixtureSources(fixture): Promise<SourceFile[]>`, `disposeFixture(fixture): Promise<void>`, and `gradeCompile(fixture): Promise<DimensionResult>`.

- [ ] **Step 1: Write failing fixture-boundary tests**

Create a temporary cwd containing `AGENTS.md`, a skill directory, and a symlink pointing outside cwd. Assert that bare context copies neither guidance source, `agents-md` copies only the configured instruction file, `skill` copies both, `../escape` paths fail, and the escaping symlink fails after `realpath` resolution.

Assert that the fixture contains `package.json`, `tsconfig.json`, minimal React JSX declarations, the generated design-system module declarations, `src/task/index.tsx`, and a task README restricting edits to `src/task/`.

- [ ] **Step 2: Run fixture tests and verify they fail**

Run: `devenv shell -- pnpm nx test benchmark -- --run tests/fixture.test.ts`

Expected: FAIL because fixture provisioning is missing.

- [ ] **Step 3: Implement fixture creation and path containment**

Use `mkdtemp(join(tmpdir(), "razorwind-benchmark-"))`. Resolve every context source with both lexical containment and `realpath` containment under `options.cwd`. Copy only regular files/directories. Seed the task entry with a valid no-op React component so a fake agent may replace it. `collectFixtureSources` must resolve every collected path and reject anything outside `src/task`.

- [ ] **Step 4: Write compile grader tests**

Use the TypeScript API against the fixture, asserting valid `<Button tone="primary" />` passes and `<Button tone="invented" />` fails with a diagnostic recorded as a compile hard failure. Also assert permissive declarations for unknown component props do not manufacture a compile error.

- [ ] **Step 5: Implement in-process compile grading**

Use `ts.readConfigFile`, `ts.parseJsonConfigFileContent`, and `ts.createProgram`; do not spawn a workspace-global `tsc`. Format at most twenty diagnostics with file and line information. Return score `100`/pass for no error diagnostics and `0`/fail otherwise.

- [ ] **Step 6: Run fixture and compile tests, then commit**

Run: `devenv shell -- pnpm nx test benchmark -- --run tests/fixture.test.ts tests/compile.test.ts`

Expected: PASS.

```bash
git add packages/benchmark/src/engine/fixture.ts packages/benchmark/src/grade/compile.ts packages/benchmark/tests/fixture.test.ts packages/benchmark/tests/compile.test.ts
git commit -m "feat(benchmark): provision isolated fixtures"
```

### Task 6: Process Boundary, Claude Code Adapter, and Codex Adapter

**Files:**

- Create: `packages/benchmark/src/agents/process.ts`
- Create: `packages/benchmark/src/agents/claude-code.ts`
- Create: `packages/benchmark/src/agents/codex.ts`
- Create: `packages/benchmark/src/agents/index.ts`
- Create: `packages/benchmark/tests/agents.test.ts`

**Interfaces:**

- Consumes: `AgentId`, cell model/prompt/fixture path, timeout, and environment overrides.
- Produces: injectable `ProcessRunner`, `runProcess(request): Promise<ProcessResult>`, `AgentAdapter`, `claudeCodeAdapter`, `codexAdapter`, and `getAgentAdapter(id)`.

- [ ] **Step 1: Write failing argument-construction tests with an injected runner**

Assert Claude Code receives an argument vector beginning with:

```ts
;[
  "-p",
  "--output-format",
  "stream-json",
  "--verbose",
  "--model",
  "sonnet",
  "--permission-mode",
  "acceptEdits",
  "--strict-mcp-config"
]
```

Assert Codex receives a non-interactive `exec` invocation with JSON output, the selected model, writable-workspace sandboxing, no repository requirement, and prompt input through stdin rather than an argument:

```ts
;[
  "exec",
  "--json",
  "--sandbox",
  "workspace-write",
  "--skip-git-repo-check",
  "--model",
  "gpt-5",
  "-"
]
```

Assert neither vector contains `sh`, `bash`, `-c`, or the raw prompt.

- [ ] **Step 2: Run agent tests and verify they fail**

Run: `devenv shell -- pnpm nx test benchmark -- --run tests/agents.test.ts`

Expected: FAIL because adapters and runner do not exist.

- [ ] **Step 3: Implement one safe process runner**

Use `spawn(executable, args, { cwd, env, detached: process.platform !== "win32", shell: false, stdio: ["pipe", "pipe", "pipe"] })`. Bound captured stdout/stderr, stream a redacted transcript, and on timeout send `SIGTERM` to the process group followed by an unref'd `SIGKILL` grace timer. Expose the spawn function as an injected dependency for tests.

- [ ] **Step 4: Implement and normalize both adapters**

Port Claude stream-result parsing from upstream. Implement Codex JSONL parsing for completion/error events and normalized token/duration metadata. Both adapters must implement `detect()` with `<executable> --version`, inherit the existing authenticated environment, accept narrow explicit environment overrides, and return `{ ok, timedOut, exitCode, durationMs, transcript, resultText, usage }`.

Add a fake runner that records a timeout and assert the adapter returns a timed-out result instead of throwing.

- [ ] **Step 5: Run tests, typecheck, and commit**

Run: `devenv shell -- pnpm nx test benchmark -- --run tests/agents.test.ts`

Expected: PASS.

Run: `devenv shell -- pnpm nx run benchmark:typecheck`

Expected: PASS.

```bash
git add packages/benchmark/src/agents packages/benchmark/tests/agents.test.ts
git commit -m "feat(benchmark): add claude and codex adapters"
```

### Task 7: Evaluation Engine, Concurrency, and Optional Judgment

**Files:**

- Create: `packages/benchmark/src/engine/judge.ts`
- Create: `packages/benchmark/src/engine/run.ts`
- Create: `packages/benchmark/src/engine/index.ts`
- Create: `packages/benchmark/tests/engine.test.ts`

**Interfaces:**

- Consumes: ground truth, resolved options, cells, task suite, fixture helpers, agent registry, and graders from Tasks 2–6.
- Produces: `runBenchmark(request): Promise<BenchmarkRun>`, `runCell(request): Promise<CellResult>`, and `judgeCell(request): Promise<DimensionResult>`.

- [ ] **Step 1: Write a failing end-to-end fake-agent test**

Inject a fake adapter that writes a valid task component into the supplied fixture and returns success. Run a two-cell matrix and assert both cells contain the five mechanical dimensions, stable ids, scores, gates, timings, and collected findings. Assert the temporary fixture no longer exists after completion.

- [ ] **Step 2: Add failure-isolation and timeout tests**

Use three fake cells: success, timed out, success. Assert all three appear in results in matrix order, the timeout is recorded only on its cell, the third cell still executes, and the aggregate run is complete. Assert retained workspaces survive only when `retainWorkspaces: true`.

- [ ] **Step 3: Run the engine test and verify it fails**

Run: `devenv shell -- pnpm nx test benchmark -- --run tests/engine.test.ts`

Expected: FAIL because the runner does not exist.

- [ ] **Step 4: Implement bounded ordered execution**

Before expanding an automatic profile, call `detect()` in the preference order
`codex`, then `claude-code`, select the first available adapter, and use its CLI
default model when the caller supplied neither agents nor models. Explicitly
requested agents are all required: report a configuration error naming every
missing executable before provisioning fixtures.

Implement a worker pool capped by `concurrency`. Store each result by its original cell index so concurrent completion cannot reorder artifacts. For every cell: provision, invoke, collect, analyze, run static and compile graders, optionally judge, compose, then dispose in `finally` unless retained. Convert adapter exceptions into normalized cell errors.

- [ ] **Step 5: Implement opt-in judgment through the adapter contract**

Build a blind rubric prompt containing task intent, rubrics, catalog summary, and generated diff/source without agent/model/context labels. Require a JSON result of `{ score: number, gate: Gate, findings: string[] }`, validate range/gate, run `samples` times, and use the median score plus the worst gate. A malformed or failed judge produces an applicable `judgment` review result with an explicit error finding; it does not erase mechanical scores.

- [ ] **Step 6: Run engine tests and commit**

Run: `devenv shell -- pnpm nx test benchmark -- --run tests/engine.test.ts`

Expected: PASS, with no live agent executable invoked.

```bash
git add packages/benchmark/src/engine packages/benchmark/tests/engine.test.ts
git commit -m "feat(benchmark): execute evaluation matrices"
```

### Task 8: Deterministic Artifacts and Razorwind Plugin Integration

**Files:**

- Create: `packages/benchmark/src/report/json.ts`
- Create: `packages/benchmark/src/report/html.ts`
- Create: `packages/benchmark/src/report/index.ts`
- Create: `packages/benchmark/src/generate.ts`
- Replace: `packages/benchmark/src/index.ts`
- Create: `packages/benchmark/tests/report.test.ts`
- Create: `packages/benchmark/tests/plugin.test.ts`

**Interfaces:**

- Consumes: complete `BenchmarkRun`, `adaptSchema`, `loadTasks`, `expandMatrix`, `runBenchmark`, `resolveBenchmarkOptions`, and Razorwind `GeneratedDocument`/`definePlugin`.
- Produces: `renderManifest(run): string`, `renderResults(run): string`, `renderReportHtml(run): string`, `generateBenchmark(schema, config, options)`, and default `benchmark(options)` plugin.

- [ ] **Step 1: Write failing deterministic renderer tests**

Freeze timestamps in a run fixture and assert two renders are byte-identical. Parse JSON and assert it contains schema version, package name, resolved non-secret configuration, ordered cells, dimension basis, score, gate, and errors. Assert HTML contains the matrix cells and embeds escaped JSON without external scripts, stylesheets, or network URLs.

- [ ] **Step 2: Run report tests and verify they fail**

Run: `devenv shell -- pnpm nx test benchmark -- --run tests/report.test.ts`

Expected: FAIL because report renderers do not exist.

- [ ] **Step 3: Implement stable JSON and self-contained HTML**

Use an explicit object construction order and a two-space JSON serializer ending in newline. Escape `<`, `>`, `&`, U+2028, and U+2029 before embedding JSON in HTML. Render a compact accessible table with agent/model/context/task/repetition, total score, gate, and dimension scores.

- [ ] **Step 4: Write failing plugin integration tests**

Inject a fake `runBenchmark` dependency into `generateBenchmark`, call it with a two-theme Schema, and assert it runs exactly once and returns:

```ts
expect(Object.keys(documents)).toEqual([
  "benchmark/manifest.json",
  "benchmark/report.html",
  "benchmark/results.json"
])
expect(plugin.name).toBe("benchmark")
expect(plugin.themeGeneration).toBe("combined")
expect(typeof plugin.generate).toBe("function")
```

Assert each document has `plugin: { name: "benchmark" }`. Assert unsafe output paths fail before the injected runner is called.

- [ ] **Step 5: Implement the plugin and public exports**

Create the plugin with:

```ts
export default definePlugin((options: BenchmarkOptions = {}) => ({
  name: "benchmark",
  themeGeneration: "combined",
  generate: (schema, config) => generateBenchmark(schema, config, options)
}))
```

Export all public types plus focused programmatic helpers from `src/index.ts`. Keep process/fixture internals unexported.

- [ ] **Step 6: Run report/plugin tests, full package tests, and commit**

Run: `devenv shell -- pnpm nx test benchmark -- --run tests/report.test.ts tests/plugin.test.ts`

Expected: PASS.

Run: `devenv shell -- pnpm nx test benchmark`

Expected: PASS with no authenticated agent process launched.

```bash
git add packages/benchmark/src/report packages/benchmark/src/generate.ts packages/benchmark/src/index.ts packages/benchmark/tests/report.test.ts packages/benchmark/tests/plugin.test.ts
git commit -m "feat(benchmark): expose razorwind evaluation plugin"
```

### Task 9: User Documentation, Package Build, and Final Verification

**Files:**

- Replace: `packages/benchmark/README.md`
- Modify: `packages/benchmark/package.json`

**Interfaces:**

- Consumes: final public API and observed verification commands.
- Produces: publishable package documentation and verified build artifacts.

- [ ] **Step 1: Rewrite README around the implemented benchmark**

Document installation, a safe smoke example, full options, bundled profiles/tasks, Claude Code and Codex authentication prerequisites, output files, score dimensions, opt-in paid judging, Schema source-content limitations, and initial exclusions. Add a prominent attribution section:

```md
## Original work and inspiration

This package adapts the core evaluation methodology and selected implementation
from [open-design-system-bench](https://github.com/christophhdesign/open-design-system-bench),
originally authored by [Christoph Hellmuth](https://github.com/christophhdesign)
and distributed under the MIT License. See [NOTICE](NOTICE) for the preserved
license and source revision.
```

Remove the copied CSS/DESIGN.md description and option table from the scaffold.

- [ ] **Step 2: Verify package metadata and published files**

Ensure `package.json` has standard Razorwind repository metadata with `directory: "packages/benchmark"`, package exports for `.` and `./package.json`, the corrected description, runtime dependencies, and `files: ["dist", "NOTICE", "README.md"]`.

Run: `devenv shell -- pnpm nx show project benchmark`

Expected: inferred build, test, typecheck, and lint targets are present.

- [ ] **Step 3: Format and run all focused validation**

Run: `devenv shell -- pnpm exec prettier --write packages/benchmark pnpm-workspace.yaml`

Run: `devenv shell -- pnpm nx test benchmark`

Run: `devenv shell -- pnpm nx run benchmark:typecheck`

Run: `devenv shell -- pnpm nx run benchmark:lint`

Run: `devenv shell -- pnpm nx build benchmark`

Expected: every command exits `0`. If target names differ, use the exact inferred names shown by `nx show project benchmark` and record that substitution in the handoff.

- [ ] **Step 4: Inspect built exports and attribution**

Run: `devenv shell -- node -e "import('./packages/benchmark/dist/index.mjs').then(m => { const p=m.default({}); if (p.name !== 'benchmark' || p.themeGeneration !== 'combined') process.exit(1) })"`

Expected: exit `0` without running a benchmark.

Run: `rg -n "Christoph Hellmuth|open-design-system-bench|MIT License" packages/benchmark/README.md packages/benchmark/NOTICE packages/benchmark/src`

Expected: README, NOTICE, and adapted source headers all contain attribution.

- [ ] **Step 5: Run repository hygiene checks**

Run: `git diff --check`

Expected: exit `0`.

Run: `git status --short`

Expected: only benchmark implementation files, intentional workspace metadata changes, and the user's pre-existing unrelated changes are present. Do not stage unrelated changes.

- [ ] **Step 6: Commit documentation and final package configuration**

```bash
git add packages/benchmark/README.md packages/benchmark/NOTICE packages/benchmark/package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.json
git commit -m "docs(benchmark): document evaluation workflow"
```

- [ ] **Step 7: Request final review without running paid evaluations**

Summarize the exact passing commands, any baseline failures by name, the unverified live-agent boundary, and the preserved unrelated worktree changes. Do not claim Claude Code or Codex live execution proof unless a separately authorized benchmark was run and its final exit/result artifacts were captured.
