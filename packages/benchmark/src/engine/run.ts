import type { AgentAdapter, AgentRunResult } from "../agents";
import { getAgentAdapter } from "../agents";
import { analyzeSource, composeScore, gradeMechanical } from "../grade";
import { gradeCompile } from "../grade/compile";
import type {
  AgentId,
  BenchmarkRun,
  BenchmarkTask,
  CellResult,
  CellSpec,
  GroundTruth,
  ResolvedBenchmarkOptions
} from "../types";
import {
  collectFixtureSources,
  disposeFixture,
  provisionFixture,
  type Fixture
} from "./fixture";
import { judgeCell } from "./judge";
import { expandMatrix } from "./matrix";

export interface RunBenchmarkRequest {
  groundTruth: GroundTruth;
  options: ResolvedBenchmarkOptions;
  tasks: BenchmarkTask[];
  cells?: CellSpec[];
  adapters?: Partial<Record<AgentId, AgentAdapter>>;
  judgeAdapter?: AgentAdapter;
}

export interface RunCellRequest {
  groundTruth: GroundTruth;
  options: ResolvedBenchmarkOptions;
  task: BenchmarkTask;
  cell: CellSpec;
  adapter: AgentAdapter;
  judgeAdapter?: AgentAdapter;
}

function adapterFor(
  id: AgentId,
  adapters: Partial<Record<AgentId, AgentAdapter>> | undefined
): AgentAdapter {
  return adapters?.[id] ?? getAgentAdapter(id);
}

function profileAgents(options: ResolvedBenchmarkOptions): AgentId[] {
  if (typeof options.profile !== "string" && options.profile.agents) {
    return [...options.profile.agents];
  }
  return [...options.agents];
}

async function resolveCells(request: RunBenchmarkRequest): Promise<{
  cells: CellSpec[];
  adapters: Map<AgentId, AgentAdapter>;
}> {
  const requested = request.cells
    ? [...new Set(request.cells.map(cell => cell.agent))]
    : profileAgents(request.options);
  const adapters = new Map<AgentId, AgentAdapter>();

  if (requested.length > 0) {
    const missing: string[] = [];
    for (const id of requested) {
      const adapter = adapterFor(id, request.adapters);
      const detection = await adapter.detect();
      if (!detection.ok)
        missing.push(`${id}: ${detection.error ?? "unavailable"}`);
      adapters.set(id, adapter);
    }
    if (missing.length > 0) {
      throw new Error(
        `Missing required benchmark agents: ${missing.join("; ")}`
      );
    }
    if (request.cells) return { cells: request.cells, adapters };
  } else {
    for (const id of ["codex", "claude-code"] as const) {
      const adapter = adapterFor(id, request.adapters);
      const detection = await adapter.detect();
      if (!detection.ok) continue;
      requested.push(id);
      adapters.set(id, adapter);
      break;
    }
    if (requested.length === 0) {
      throw new Error(
        "No supported benchmark agent is available (tried codex, claude-code)"
      );
    }
  }

  const models = { ...request.options.models };
  for (const id of requested) {
    if (!models[id]?.length) models[id] = [adapters.get(id)!.defaultModel];
  }
  const options: ResolvedBenchmarkOptions = {
    ...request.options,
    agents: requested,
    models,
    profile:
      typeof request.options.profile === "string"
        ? request.options.profile
        : { ...request.options.profile, agents: requested, models }
  };
  return { cells: expandMatrix(options, request.tasks), adapters };
}

function failedAgentResult(error: unknown): AgentRunResult {
  return {
    ok: false,
    timedOut: false,
    exitCode: null,
    durationMs: 0,
    transcript: "",
    resultText: error instanceof Error ? error.message : String(error)
  };
}

export async function runCell(request: RunCellRequest): Promise<CellResult> {
  const startedAt = Date.now();
  let fixture: Fixture | undefined;
  let agentResult: AgentRunResult | undefined;
  try {
    fixture = await provisionFixture({
      options: request.options,
      context: request.cell.context,
      task: request.task,
      groundTruth: request.groundTruth
    });
    try {
      agentResult = await request.adapter.run({
        model: request.cell.model,
        prompt: request.task.prompt,
        fixturePath: fixture.root,
        timeoutMs: request.options.timeoutMs
      });
    } catch (error) {
      agentResult = failedAgentResult(error);
    }

    const sources = await collectFixtureSources(fixture);
    const files = sources.map(source => ({
      ...source,
      analysis: analyzeSource(source.path, source.source)
    }));
    const dimensions = [
      ...gradeMechanical({
        groundTruth: request.groundTruth,
        task: request.task,
        files
      }),
      await gradeCompile(fixture)
    ];
    if (request.options.judge && request.judgeAdapter) {
      dimensions.push(
        await judgeCell({
          adapter: request.judgeAdapter,
          model: request.options.judge.model,
          samples: request.options.judge.samples,
          timeoutMs: request.options.judge.timeoutMs,
          fixturePath: fixture.root,
          task: request.task,
          groundTruth: request.groundTruth,
          sources
        })
      );
    }
    const composed = composeScore(dimensions);
    return {
      cell: request.cell,
      dimensions,
      score: composed.score,
      gate: composed.gate,
      durationMs: Date.now() - startedAt,
      transcript: agentResult.transcript,
      usage: agentResult.usage,
      error: agentResult.ok
        ? undefined
        : {
            kind: agentResult.timedOut ? "timeout" : "agent",
            message: agentResult.resultText ?? "Agent execution failed"
          },
      workspacePath: fixture.root
    };
  } catch (error) {
    return {
      cell: request.cell,
      dimensions: [],
      score: 0,
      gate: "fail",
      durationMs: Date.now() - startedAt,
      error: {
        kind: fixture ? "agent" : "fixture",
        message: error instanceof Error ? error.message : String(error)
      },
      workspacePath: fixture?.root
    };
  } finally {
    if (fixture && !request.options.retainWorkspaces)
      await disposeFixture(fixture);
  }
}

export async function runBenchmark(
  request: RunBenchmarkRequest
): Promise<BenchmarkRun> {
  const startedAt = new Date().toISOString();
  const resolved = await resolveCells(request);
  const tasks = new Map(request.tasks.map(task => [task.id, task]));
  const results = new Array<CellResult>(resolved.cells.length);
  let nextIndex = 0;

  const worker = async () => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= resolved.cells.length) return;
      const cell = resolved.cells[index]!;
      const task = tasks.get(cell.taskId);
      if (!task) throw new Error(`Unknown benchmark task '${cell.taskId}'`);
      results[index] = await runCell({
        groundTruth: request.groundTruth,
        options: request.options,
        task,
        cell,
        adapter: resolved.adapters.get(cell.agent)!,
        judgeAdapter:
          request.judgeAdapter ??
          (request.options.judge
            ? adapterFor(request.options.judge.agent, request.adapters)
            : undefined)
      });
    }
  };
  await Promise.all(
    Array.from(
      { length: Math.min(request.options.concurrency, resolved.cells.length) },
      worker
    )
  );
  return {
    schemaVersion: 1,
    startedAt,
    completedAt: new Date().toISOString(),
    packageName: request.groundTruth.packageName,
    profile:
      typeof request.options.profile === "string"
        ? request.options.profile
        : "custom",
    cells: results
  };
}
