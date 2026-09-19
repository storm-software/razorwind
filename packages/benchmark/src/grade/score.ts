/**
 * Adapted from christophhdesign/open-design-system-bench by Christoph Hellmuth.
 * Source commit: e258a12dff8d483746e9a9ebfa655fa827301e13. MIT licensed;
 * see ../../NOTICE for the preserved license notice.
 */
import type { DimensionName, DimensionResult, Gate } from "../types";

const WEIGHTS: Record<DimensionName, number> = {
  imports: 0.1,
  apiFidelity: 0.25,
  tokenDiscipline: 0.15,
  a11yStatic: 0.1,
  compile: 0.1,
  judgment: 0.3
};
const GATE_RANK: Record<Gate, number> = { pass: 0, review: 1, fail: 2 };

export function composeScore(dimensions: DimensionResult[]): {
  score: number;
  gate: Gate;
  basis: DimensionName[];
} {
  let weightedScore = 0;
  let weightSum = 0;
  let gate: Gate = "pass";
  const basis: DimensionName[] = [];

  for (const result of dimensions) {
    if (result.applicable === false) continue;
    const weight = WEIGHTS[result.dimension];
    basis.push(result.dimension);
    weightedScore += result.score * weight;
    weightSum += weight;
    if (GATE_RANK[result.gate] > GATE_RANK[gate]) gate = result.gate;
  }
  return {
    score: weightSum > 0 ? weightedScore / weightSum : 0,
    gate,
    basis
  };
}
