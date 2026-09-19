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

import type { AgentId, BenchmarkRun } from "../types";

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function configuration(run: BenchmarkRun) {
  const agents = unique(run.cells.map(result => result.cell.agent));
  const models: Partial<Record<AgentId, string[]>> = {};
  for (const agent of agents) {
    models[agent] = unique(
      run.cells
        .filter(result => result.cell.agent === agent)
        .map(result => result.cell.model)
    );
  }
  return {
    profile: run.profile,
    agents,
    models,
    contexts: unique(run.cells.map(result => result.cell.context)),
    tasks: unique(run.cells.map(result => result.cell.taskId)),
    repetitions: Math.max(
      0,
      ...run.cells.map(result => result.cell.repetition)
    ),
    judgment: run.cells.some(result =>
      result.dimensions.some(
        dimension =>
          dimension.dimension === "judgment" && dimension.applicable !== false
      )
    )
  };
}

function stringify(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function renderManifest(run: BenchmarkRun): string {
  return stringify({
    schemaVersion: run.schemaVersion,
    packageName: run.packageName,
    profile: run.profile,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    configuration: configuration(run),
    matrix: run.cells.map(result => ({
      id: result.cell.id,
      agent: result.cell.agent,
      model: result.cell.model,
      context: result.cell.context,
      taskId: result.cell.taskId,
      repetition: result.cell.repetition
    }))
  });
}

export function renderResults(run: BenchmarkRun): string {
  return stringify({
    schemaVersion: run.schemaVersion,
    packageName: run.packageName,
    profile: run.profile,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    cells: run.cells.map(result => ({
      id: result.cell.id,
      agent: result.cell.agent,
      model: result.cell.model,
      context: result.cell.context,
      taskId: result.cell.taskId,
      repetition: result.cell.repetition,
      basis: result.dimensions
        .filter(dimension => dimension.applicable !== false)
        .map(dimension => dimension.dimension),
      score: result.score,
      gate: result.gate,
      durationMs: result.durationMs,
      usage: result.usage,
      dimensions: result.dimensions.map(dimension => ({
        dimension: dimension.dimension,
        score: dimension.score,
        gate: dimension.gate,
        applicable: dimension.applicable ?? true,
        findings: dimension.findings
      })),
      error: result.error
    }))
  });
}
