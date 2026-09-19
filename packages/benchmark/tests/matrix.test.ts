import { describe, expect, it } from "vitest";
import { expandMatrix } from "../src/engine/matrix";
import { resolveBenchmarkOptions } from "../src/options";
import type { BenchmarkTask } from "../src/types";

const taskA: BenchmarkTask = {
  id: "a",
  title: "A",
  prompt: "Build A.",
  rubrics: [{ id: "a", description: "A works", weight: 1 }]
};
const taskB: BenchmarkTask = {
  id: "b",
  title: "B",
  prompt: "Build B.",
  rubrics: [{ id: "b", description: "B works", weight: 1 }]
};

describe("expandMatrix", () => {
  it("orders cells by agent, model, context, task, and repetition", () => {
    const options = resolveBenchmarkOptions(
      {
        profile: { contexts: ["bare"], tasks: "*", repetitions: 2 },
        agents: ["codex", "claude-code"],
        models: { codex: ["gpt-5"], "claude-code": ["sonnet"] }
      },
      "/workspace"
    );

    expect(expandMatrix(options, [taskB, taskA]).map(cell => cell.id)).toEqual([
      "claude-code|sonnet|bare|a|1",
      "claude-code|sonnet|bare|a|2",
      "claude-code|sonnet|bare|b|1",
      "claude-code|sonnet|bare|b|2",
      "codex|gpt-5|bare|a|1",
      "codex|gpt-5|bare|a|2",
      "codex|gpt-5|bare|b|1",
      "codex|gpt-5|bare|b|2"
    ]);
  });

  it("uses the smoke task, two contexts, and one repetition", () => {
    const options = resolveBenchmarkOptions(
      {
        agents: ["codex"],
        models: { codex: ["gpt-5"] }
      },
      "/workspace"
    );
    const smoke = expandMatrix(options, [
      { ...taskA, id: "confirm-account-deletion" },
      taskB
    ]);

    expect(
      smoke.map(cell => [cell.context, cell.taskId, cell.repetition])
    ).toEqual([
      ["agents-md", "confirm-account-deletion", 1],
      ["bare", "confirm-account-deletion", 1]
    ]);
  });

  it("lets an explicit profile select its own matrix", () => {
    const options = resolveBenchmarkOptions(
      {
        profile: {
          agents: ["claude-code"],
          models: { "claude-code": ["opus"] },
          contexts: ["skill"],
          tasks: ["b"],
          repetitions: 1
        }
      },
      "/workspace"
    );

    expect(expandMatrix(options, [taskA, taskB])).toEqual([
      expect.objectContaining({
        id: "claude-code|opus|skill|b|1",
        taskId: "b"
      })
    ]);
  });
});
