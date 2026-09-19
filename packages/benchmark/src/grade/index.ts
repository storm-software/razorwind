/**
 * Adapted from christophhdesign/open-design-system-bench by Christoph Hellmuth.
 * Source commit: e258a12dff8d483746e9a9ebfa655fa827301e13. MIT licensed;
 * see ../../NOTICE for the preserved license notice.
 */
import type { BenchmarkTask, DimensionResult, GroundTruth } from "../types";
import { gradeA11yStatic } from "./a11y-static";
import type { AnalyzedSourceFile } from "./analyze";
import { gradeApiFidelity } from "./api-fidelity";
import { gradeImports } from "./imports";
import { gradeTokenDiscipline } from "./token-discipline";

export interface GradeContext {
  groundTruth: GroundTruth;
  task: BenchmarkTask;
  files: AnalyzedSourceFile[];
}

export function gradeMechanical(context: GradeContext): DimensionResult[] {
  return [
    gradeImports(context),
    gradeApiFidelity(context),
    gradeTokenDiscipline(context),
    gradeA11yStatic(context)
  ];
}

export * from "./analyze";
export * from "./score";
