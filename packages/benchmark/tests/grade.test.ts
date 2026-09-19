import { describe, expect, it } from "vitest";
import { analyzeSource, composeScore, gradeMechanical } from "../src/grade";
import type { BenchmarkTask, DimensionResult, GroundTruth } from "../src/types";

const task: BenchmarkTask = {
  id: "actions",
  title: "Actions",
  prompt: "Build an action.",
  rubrics: [{ id: "clear", description: "The action is clear", weight: 1 }]
};

const groundTruth: GroundTruth = {
  packageName: "@acme/ui",
  components: {
    Button: {
      name: "button",
      exportName: "Button",
      props: {
        tone: { required: false, type: '"primary" | "danger"' }
      }
    }
  },
  tokens: []
};

function file(source: string) {
  return {
    path: "src/task/index.tsx",
    source,
    analysis: analyzeSource("index.tsx", source)
  };
}

describe("mechanical grading", () => {
  it("finds foreign imports, hallucinated APIs, invented props, raw values, and static a11y errors", () => {
    const source = `
      import { Button, Imaginary } from "@acme/ui";
      import { Dialog } from "foreign-ui";
      export function Example() {
        return <div onClick={() => {}}><Button imaginaryProp className="bg-[#ff0000] w-[137px]" /></div>;
      }
    `;
    const dimensions = gradeMechanical({
      groundTruth,
      task,
      files: [file(source)]
    });

    expect(
      dimensions.find(result => result.dimension === "imports")?.findings
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: expect.stringContaining("foreign-ui")
        })
      ])
    );
    const api = dimensions.find(result => result.dimension === "apiFidelity");
    expect(api?.gate).toBe("fail");
    expect(api?.findings.map(finding => finding.message).join("\n")).toMatch(
      /Hallucinated component 'Imaginary'.*Invented prop 'imaginaryProp'/s
    );
    expect(
      dimensions.find(result => result.dimension === "tokenDiscipline")
        ?.findings
    ).toHaveLength(2);
    expect(
      dimensions.find(result => result.dimension === "a11yStatic")?.findings[0]
        ?.message
    ).toMatch(/onClick.*keyboard handler/);
  });

  it("keeps export checks but skips invented-prop findings without prop metadata", () => {
    const unknownProps: GroundTruth = {
      ...groundTruth,
      components: {
        Button: { ...groundTruth.components.Button!, props: null }
      }
    };
    const source = `import { Button } from "@acme/ui"; export const Example = () => <Button imaginaryProp />;`;
    const api = gradeMechanical({
      groundTruth: unknownProps,
      task,
      files: [file(source)]
    }).find(result => result.dimension === "apiFidelity");

    expect(api?.gate).toBe("pass");
    expect(api?.findings).toEqual([
      expect.objectContaining({
        message: expect.stringContaining("not applicable")
      })
    ]);
  });

  it("renormalizes scores over applicable dimensions and keeps the worst gate", () => {
    const dimensions: DimensionResult[] = [
      { dimension: "imports", score: 100, gate: "pass", findings: [] },
      {
        dimension: "apiFidelity",
        score: 50,
        gate: "review",
        findings: []
      },
      {
        dimension: "judgment",
        score: 0,
        gate: "fail",
        applicable: false,
        findings: []
      }
    ];

    expect(composeScore(dimensions)).toEqual({
      score: expect.closeTo(64.2857, 3),
      gate: "review",
      basis: ["imports", "apiFidelity"]
    });
  });
});
