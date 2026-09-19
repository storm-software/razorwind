/**
 * Adapted from christophhdesign/open-design-system-bench by Christoph Hellmuth.
 * Source commit: e258a12dff8d483746e9a9ebfa655fa827301e13. MIT licensed;
 * see ../../NOTICE for the preserved license notice.
 */
import { relative } from "node:path";
import ts from "typescript";
import type { Fixture } from "../engine/fixture";
import type { DimensionResult, Finding } from "../types";

function diagnosticFinding(
  fixture: Fixture,
  diagnostic: ts.Diagnostic
): Finding {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
  if (!diagnostic.file || diagnostic.start === undefined) {
    return { dimension: "compile", message };
  }
  const location = diagnostic.file.getLineAndCharacterOfPosition(
    diagnostic.start
  );
  const file = relative(fixture.root, diagnostic.file.fileName).replaceAll(
    "\\",
    "/"
  );
  return {
    dimension: "compile",
    file,
    message: `${file}:${location.line + 1}:${location.character + 1} - ${message}`
  };
}

export async function gradeCompile(fixture: Fixture): Promise<DimensionResult> {
  const config = ts.readConfigFile(fixture.tsconfigPath, ts.sys.readFile);
  let diagnostics: ts.Diagnostic[] = config.error ? [config.error] : [];
  const parsed = ts.parseJsonConfigFileContent(
    config.config ?? {},
    ts.sys,
    fixture.root,
    undefined,
    fixture.tsconfigPath
  );
  diagnostics = diagnostics.concat(parsed.errors);
  if (!config.error) {
    const program = ts.createProgram({
      rootNames: parsed.fileNames,
      options: parsed.options,
      projectReferences: parsed.projectReferences
    });
    diagnostics.push(
      ...program.getOptionsDiagnostics(),
      ...program.getGlobalDiagnostics(),
      ...program.getSyntacticDiagnostics(),
      ...program.getSemanticDiagnostics()
    );
  }
  const errors = diagnostics
    .filter(diagnostic => diagnostic.category === ts.DiagnosticCategory.Error)
    .slice(0, 20);
  return {
    dimension: "compile",
    score: errors.length === 0 ? 100 : 0,
    gate: errors.length === 0 ? "pass" : "fail",
    findings: errors.map(diagnostic => diagnosticFinding(fixture, diagnostic))
  };
}
