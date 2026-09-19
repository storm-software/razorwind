import type { Config } from "@razorwind/core";
import type { Schema } from "@razorwind/core/schema";
import { describe, expect, it, vi } from "vitest";
import benchmark, { generateBenchmark } from "../src";
import type { BenchmarkRun, BenchmarkTask } from "../src/types";

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
            "export interface ButtonProps { tone?: 'primary' } export function Button(_: ButtonProps) { return null }"
        }
      ]
    }
  },
  icons: {},
  fonts: {},
  tokens: {
    light: { color: { primary: { $type: "color", $value: "#0055cc" } } },
    dark: { color: { primary: { $type: "color", $value: "#66aaff" } } }
  }
} satisfies Schema;

const task: BenchmarkTask = {
  id: "button",
  title: "Button",
  prompt: "Build a primary action.",
  rubrics: [{ id: "clear", description: "Clear action", weight: 1 }]
};
const run: BenchmarkRun = {
  schemaVersion: 1,
  startedAt: "2026-09-19T12:00:00.000Z",
  completedAt: "2026-09-19T12:00:01.000Z",
  packageName: "@acme/ui",
  profile: "custom",
  cells: []
};
const config = { cwd: process.cwd() } as Config;

describe("benchmark plugin", () => {
  it("runs a combined two-theme schema once and returns the three generated documents", async () => {
    const runner = vi.fn(async () => run);
    const documents = await generateBenchmark(
      schema,
      config,
      { outputPath: "benchmark", tasks: [task] },
      { runBenchmark: runner }
    );

    expect(runner).toHaveBeenCalledTimes(1);
    expect(Object.keys(documents)).toEqual([
      "benchmark/manifest.json",
      "benchmark/report.html",
      "benchmark/results.json"
    ]);
    for (const document of Object.values(documents)) {
      expect(document).toEqual(
        expect.objectContaining({
          plugin: { name: "benchmark" },
          chunks: [expect.objectContaining({ content: expect.any(String) })]
        })
      );
    }
  });

  it("rejects an unsafe output path before invoking the runner", async () => {
    const runner = vi.fn(async () => run);
    await expect(
      generateBenchmark(
        schema,
        config,
        { outputPath: "../escape", tasks: [task] },
        { runBenchmark: runner }
      )
    ).rejects.toThrow(/outputPath.*relative path/i);
    expect(runner).not.toHaveBeenCalled();
  });

  it("exposes a combined Razorwind plugin", () => {
    const plugin = benchmark();
    expect(plugin.name).toBe("benchmark");
    expect(plugin.themeGeneration).toBe("combined");
    expect(typeof plugin.generate).toBe("function");
  });
});
