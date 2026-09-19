import {
  access,
  mkdir,
  mkdtemp,
  rm,
  symlink,
  writeFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AgentAdapter, AgentRunRequest } from "../src/agents";
import { runBenchmark } from "../src/engine";
import { resolveBenchmarkOptions } from "../src/options";
import type { BenchmarkTask, CellSpec, GroundTruth } from "../src/types";

const task: BenchmarkTask = {
  id: "button",
  title: "Button",
  prompt: "Build a primary action.",
  rubrics: [{ id: "clear", description: "The action is clear", weight: 1 }]
};
const groundTruth: GroundTruth = {
  packageName: "@acme/ui",
  components: {
    Button: {
      name: "button",
      exportName: "Button",
      props: {
        tone: { required: false, type: '"primary" | "danger"' },
        "aria-label": { required: false, type: "string" }
      }
    }
  },
  tokens: []
};
const retained: string[] = [];
afterEach(async () => {
  await Promise.all(
    retained.splice(0).map(path => rm(path, { recursive: true, force: true }))
  );
});

function cells(count: number): CellSpec[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `codex|gpt-5|bare|button|${index + 1}`,
    agent: "codex",
    model: "gpt-5",
    context: "bare",
    taskId: "button",
    repetition: index + 1
  }));
}

function fakeAdapter(run: AgentAdapter["run"]): AgentAdapter {
  return {
    id: "codex",
    defaultModel: "gpt-5",
    detect: vi.fn(async () => ({ ok: true, version: "fake" })),
    run
  };
}

async function writeValid(request: AgentRunRequest) {
  await writeFile(
    join(request.fixturePath, "src/task/index.tsx"),
    'import { Button } from "@acme/ui"; export default () => <Button tone="primary" aria-label="Save" />;\n'
  );
}

describe("evaluation engine", () => {
  it("runs a two-cell fake matrix through all five mechanical dimensions and cleans fixtures", async () => {
    const adapter = fakeAdapter(async request => {
      await writeValid(request);
      return {
        ok: true,
        timedOut: false,
        exitCode: 0,
        durationMs: 5,
        transcript: "fake transcript"
      };
    });
    const run = await runBenchmark({
      groundTruth,
      options: resolveBenchmarkOptions({ concurrency: 2 }, process.cwd()),
      tasks: [task],
      cells: cells(2),
      adapters: { codex: adapter }
    });

    expect(run.cells.map(result => result.cell.id)).toEqual(
      cells(2).map(cell => cell.id)
    );
    expect(run.cells).toHaveLength(2);
    for (const result of run.cells) {
      expect(result.dimensions.map(dimension => dimension.dimension)).toEqual([
        "imports",
        "apiFidelity",
        "tokenDiscipline",
        "a11yStatic",
        "compile"
      ]);
      expect(result.score).toBeGreaterThan(0);
      expect(result.gate).toBe("pass");
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      await expect(access(result.workspacePath!)).rejects.toThrow();
    }
  });

  it("isolates a timeout, preserves matrix order, and optionally retains workspaces", async () => {
    let invocation = 0;
    const adapter = fakeAdapter(async request => {
      invocation += 1;
      if (invocation !== 2) await writeValid(request);
      return invocation === 2
        ? {
            ok: false,
            timedOut: true,
            exitCode: null,
            durationMs: 100,
            transcript: "timed out",
            resultText: "timeout"
          }
        : {
            ok: true,
            timedOut: false,
            exitCode: 0,
            durationMs: 5,
            transcript: "ok"
          };
    });
    const run = await runBenchmark({
      groundTruth,
      options: resolveBenchmarkOptions(
        { concurrency: 1, retainWorkspaces: true },
        process.cwd()
      ),
      tasks: [task],
      cells: cells(3),
      adapters: { codex: adapter }
    });
    retained.push(
      ...run.cells.flatMap(result =>
        result.workspacePath ? [result.workspacePath] : []
      )
    );

    expect(run.cells.map(result => result.cell.id)).toEqual(
      cells(3).map(cell => cell.id)
    );
    expect(run.cells.map(result => result.error?.kind)).toEqual([
      undefined,
      "timeout",
      undefined
    ]);
    expect(run.cells[1]?.gate).toBe("fail");
    expect(invocation).toBe(3);
    for (const result of run.cells) {
      await expect(access(result.workspacePath!)).resolves.toBeUndefined();
    }
  });

  it("uses custom-profile model selections during execution", async () => {
    const models: string[] = [];
    const adapter = fakeAdapter(async request => {
      models.push(request.model);
      await writeValid(request);
      return {
        ok: true,
        timedOut: false,
        exitCode: 0,
        durationMs: 1,
        transcript: ""
      };
    });
    await runBenchmark({
      groundTruth,
      options: resolveBenchmarkOptions(
        {
          profile: {
            agents: ["codex"],
            models: { codex: ["profile-model"] },
            contexts: ["bare"],
            tasks: "*"
          },
          models: { codex: ["top-level-model"] }
        },
        process.cwd()
      ),
      tasks: [task],
      adapters: { codex: adapter }
    });

    expect(models).toEqual(["profile-model"]);
  });

  it("rejects invalid context trees before any agent executes", async () => {
    const root = await mkdtemp(join(tmpdir(), "benchmark-preflight-"));
    const outside = await mkdtemp(
      join(tmpdir(), "benchmark-preflight-outside-")
    );
    retained.push(root, outside);
    await mkdir(join(root, "skills", "acme"), { recursive: true });
    await writeFile(join(outside, "secret.md"), "outside\n");
    await symlink(
      join(outside, "secret.md"),
      join(root, "skills", "acme", "escape.md")
    );
    const run = vi.fn<AgentAdapter["run"]>();

    await expect(
      runBenchmark({
        groundTruth,
        options: resolveBenchmarkOptions(
          { context: { skillDirs: ["skills/acme"] } },
          root
        ),
        tasks: [task],
        cells: cells(1),
        adapters: { codex: fakeAdapter(run) }
      })
    ).rejects.toThrow(/context.*outside/i);
    expect(run).not.toHaveBeenCalled();
  });

  it("selects Codex first for automatic profiles and rejects explicit missing agents", async () => {
    const codex = fakeAdapter(async request => {
      await writeValid(request);
      return {
        ok: true,
        timedOut: false,
        exitCode: 0,
        durationMs: 1,
        transcript: ""
      };
    });
    const claude: AgentAdapter = {
      ...codex,
      id: "claude-code",
      defaultModel: "sonnet",
      detect: vi.fn(async () => ({ ok: true, version: "fake" }))
    };
    const automatic = await runBenchmark({
      groundTruth,
      options: resolveBenchmarkOptions(
        { profile: { contexts: ["bare"], tasks: "*" } },
        process.cwd()
      ),
      tasks: [task],
      adapters: { codex, "claude-code": claude }
    });
    expect(automatic.cells[0]?.cell.agent).toBe("codex");
    expect(claude.detect).not.toHaveBeenCalled();

    const missing = fakeAdapter(async () => {
      throw new Error("must not run");
    });
    missing.detect = vi.fn(async () => ({ ok: false, error: "not installed" }));
    await expect(
      runBenchmark({
        groundTruth,
        options: resolveBenchmarkOptions(
          {
            profile: { contexts: ["bare"], tasks: "*" },
            agents: ["codex"],
            models: { codex: ["gpt-5"] }
          },
          process.cwd()
        ),
        tasks: [task],
        adapters: { codex: missing }
      })
    ).rejects.toThrow(/codex.*not installed/i);
  });

  it("performs optional blind judgment and uses the median score", async () => {
    const generation = fakeAdapter(async request => {
      await writeValid(request);
      return {
        ok: true,
        timedOut: false,
        exitCode: 0,
        durationMs: 1,
        transcript: ""
      };
    });
    const prompts: string[] = [];
    const scores = [90, 70, 80];
    const judge = fakeAdapter(async request => {
      prompts.push(request.prompt);
      return {
        ok: true,
        timedOut: false,
        exitCode: 0,
        durationMs: 1,
        transcript: "",
        resultText: JSON.stringify({
          score: scores[prompts.length - 1],
          gate: "pass",
          findings: []
        })
      };
    });
    const run = await runBenchmark({
      groundTruth,
      options: resolveBenchmarkOptions(
        {
          judge: { agent: "codex", model: "judge-model", samples: 3 }
        },
        process.cwd()
      ),
      tasks: [task],
      cells: cells(1),
      adapters: { codex: generation },
      judgeAdapter: judge
    });

    expect(run.cells[0]?.dimensions.at(-1)).toEqual(
      expect.objectContaining({
        dimension: "judgment",
        score: 80,
        gate: "pass"
      })
    );
    expect(prompts.join("\n")).not.toMatch(/gpt-5|codex|bare/);
  });
});
