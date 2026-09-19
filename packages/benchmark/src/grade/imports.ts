/**
 * Adapted from christophhdesign/open-design-system-bench by Christoph Hellmuth.
 * Source commit: e258a12dff8d483746e9a9ebfa655fa827301e13. MIT licensed;
 * see ../../NOTICE for the preserved license notice.
 */
import type { DimensionResult, Finding, GroundTruth } from "../types";
import type { GradeContext } from "./index";

const PLATFORM_PREFIXES = ["react", "react-dom", "vite"];

function matchesPackage(source: string, packageName: string): boolean {
  return source === packageName || source.startsWith(`${packageName}/`);
}

function isAllowed(
  source: string,
  groundTruth: GroundTruth,
  extra: string[]
): boolean {
  if (source.startsWith("./") || source.startsWith("../")) return true;
  if (matchesPackage(source, groundTruth.packageName)) return true;
  return [...PLATFORM_PREFIXES, ...extra].some(prefix =>
    matchesPackage(source, prefix)
  );
}

export function gradeImports(context: GradeContext): DimensionResult {
  const findings: Finding[] = [];
  for (const file of context.files) {
    for (const imported of file.analysis.imports) {
      if (
        isAllowed(
          imported.source,
          context.groundTruth,
          context.task.mechanicalOverrides?.extraAllowedImports ?? []
        )
      )
        continue;
      findings.push({
        dimension: "imports",
        file: file.path,
        message: `Disallowed import '${imported.source}' in ${file.path}`,
        fix: `Use ${context.groundTruth.packageName} or a relative import instead.`
      });
    }
  }
  const count = findings.length;
  return {
    dimension: "imports",
    score: Math.max(0, 100 - count * 25),
    gate: count === 0 ? "pass" : count === 1 ? "review" : "fail",
    findings
  };
}
