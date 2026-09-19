/* -------------------------------------------------------------------

                    🗲 Storm Software - Razorwind

 This code was released as part of the Razorwind project. Razorwind
 is maintained by Storm Software under the Apache-2.0 license, and is
 free for commercial and private use. For more information, please visit
 our licensing page at https://stormsoftware.com/licenses/projects/razorwind.

 Website:                  https://stormsoftware.com
 Repository:               https://github.com/storm-software/razorwind
 Documentation:            https://docs.stormsoftware.com/projects/razorwind
 Contact:                  https://stormsoftware.com/contact

 SPDX-License-Identifier:  Apache-2.0

 ------------------------------------------------------------------- */

import type { AgentAdapter } from "../agents";
import type {
  BenchmarkTask,
  DimensionResult,
  Finding,
  Gate,
  GroundTruth
} from "../types";
import type { FixtureSource } from "./fixture";

const GATE_RANK: Record<Gate, number> = { pass: 0, review: 1, fail: 2 };

export interface JudgeCellRequest {
  adapter: AgentAdapter;
  model: string;
  samples: number;
  timeoutMs: number;
  fixturePath: string;
  task: BenchmarkTask;
  groundTruth: GroundTruth;
  sources: FixtureSource[];
}

interface JudgmentResponse {
  score: number;
  gate: Gate;
  findings: string[];
}

function promptFor(request: JudgeCellRequest): string {
  const catalog = Object.values(request.groundTruth.components).map(
    component => ({
      component: component.exportName,
      props: component.props ? Object.keys(component.props).sort() : null
    })
  );

  return [
    "Evaluate this generated design-system implementation against the rubric.",
    'Return only JSON: {"score": number, "gate": "pass" | "review" | "fail", "findings": string[]}.',
    `Task: ${request.task.prompt}`,
    `Rubric: ${JSON.stringify(request.task.rubrics)}`,
    `Available design-system catalog: ${JSON.stringify(catalog)}`,
    "Generated source:",
    ...request.sources.map(source => `--- ${source.path}\n${source.source}`)
  ].join("\n\n");
}

function parseJudgment(text: string | undefined): JudgmentResponse {
  if (!text) throw new Error("judge returned no result");
  const value = JSON.parse(text) as Partial<JudgmentResponse>;
  if (
    typeof value.score !== "number" ||
    !Number.isFinite(value.score) ||
    value.score < 0 ||
    value.score > 100 ||
    !value.gate ||
    !(value.gate in GATE_RANK) ||
    !Array.isArray(value.findings) ||
    value.findings.some(item => typeof item !== "string")
  ) {
    throw new Error("judge returned an invalid JSON result");
  }
  return value as JudgmentResponse;
}

export async function judgeCell(
  request: JudgeCellRequest
): Promise<DimensionResult> {
  const responses: JudgmentResponse[] = [];
  try {
    const prompt = promptFor(request);
    for (let sample = 0; sample < request.samples; sample += 1) {
      const result = await request.adapter.run({
        model: request.model,
        prompt,
        fixturePath: request.fixturePath,
        timeoutMs: request.timeoutMs
      });
      if (!result.ok) {
        throw new Error(
          result.resultText ??
            (result.timedOut ? "judge timed out" : "judge failed")
        );
      }
      responses.push(parseJudgment(result.resultText));
    }
  } catch (error) {
    return {
      dimension: "judgment",
      score: 0,
      gate: "review",
      findings: [
        {
          dimension: "judgment",
          message: `Judgment unavailable: ${error instanceof Error ? error.message : String(error)}`
        }
      ]
    };
  }

  const sortedScores = responses
    .map(response => response.score)
    .sort((a, b) => a - b);
  const score = sortedScores[Math.floor(sortedScores.length / 2)] ?? 0;
  const gate = responses.reduce<Gate>(
    (worst, response) =>
      GATE_RANK[response.gate] > GATE_RANK[worst] ? response.gate : worst,
    "pass"
  );
  const findings: Finding[] = responses.flatMap((response, sample) =>
    response.findings.map(message => ({
      dimension: "judgment" as const,
      message:
        responses.length > 1 ? `Sample ${sample + 1}: ${message}` : message
    }))
  );

  return { dimension: "judgment", score, gate, findings };
}
