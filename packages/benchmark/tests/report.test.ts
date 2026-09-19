import { describe, expect, it } from "vitest";
import { renderManifest, renderReportHtml, renderResults } from "../src/report";
import type { BenchmarkRun } from "../src/types";

const run: BenchmarkRun = {
  schemaVersion: 1,
  startedAt: "2026-09-19T12:00:00.000Z",
  completedAt: "2026-09-19T12:01:00.000Z",
  packageName: "@acme/ui",
  profile: "smoke",
  cells: [
    {
      cell: {
        id: "codex|gpt-5|bare|button|1",
        agent: "codex",
        model: "gpt-5",
        context: "bare",
        taskId: "button",
        repetition: 1
      },
      dimensions: [
        { dimension: "imports", score: 100, gate: "pass", findings: [] },
        { dimension: "compile", score: 100, gate: "pass", findings: [] },
        {
          dimension: "judgment",
          score: 0,
          gate: "fail",
          applicable: false,
          findings: []
        }
      ],
      score: 100,
      gate: "pass",
      durationMs: 50
    },
    {
      cell: {
        id: "claude-code|sonnet|skill|button|1",
        agent: "claude-code",
        model: "sonnet",
        context: "skill",
        taskId: "button",
        repetition: 1
      },
      dimensions: [],
      score: 0,
      gate: "fail",
      durationMs: 100,
      error: { kind: "timeout", message: "Timed out <unsafe>&\u2028" }
    }
  ]
};

describe("benchmark reports", () => {
  it("renders byte-stable manifest and results JSON with configuration, basis, and errors", () => {
    expect(renderManifest(run)).toBe(renderManifest(run));
    expect(renderResults(run)).toBe(renderResults(run));
    const manifest = JSON.parse(renderManifest(run));
    const results = JSON.parse(renderResults(run));

    expect(manifest).toEqual(
      expect.objectContaining({
        schemaVersion: 1,
        packageName: "@acme/ui",
        configuration: expect.objectContaining({
          profile: "smoke",
          agents: ["codex", "claude-code"],
          contexts: ["bare", "skill"]
        }),
        matrix: run.cells.map(result => result.cell)
      })
    );
    expect(results.cells[0]).toEqual(
      expect.objectContaining({
        id: "codex|gpt-5|bare|button|1",
        basis: ["imports", "compile"],
        score: 100,
        gate: "pass"
      })
    );
    expect(results.cells[1].error).toEqual(run.cells[1]?.error);
    expect(renderResults(run).endsWith("\n")).toBe(true);
  });

  it("renders self-contained accessible HTML with safely embedded JSON", () => {
    const html = renderReportHtml(run);
    expect(html).toBe(renderReportHtml(run));
    expect(html).toContain("<table");
    expect(html).toContain("codex|gpt-5|bare|button|1");
    expect(html).toContain('aria-label="Benchmark results"');
    expect(html).toContain("\\u003cunsafe\\u003e\\u0026\\u2028");
    expect(html).not.toMatch(/<script[^>]+src=|<link|https?:\/\//);
  });
});
