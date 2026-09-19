/**
 * Adapted from christophhdesign/open-design-system-bench by Christoph Hellmuth.
 * Source commit: e258a12dff8d483746e9a9ebfa655fa827301e13. MIT licensed;
 * see ../../NOTICE for the preserved license notice.
 */
import { join, relative } from "node:path";
import ts from "typescript";
import {
  collectFixtureSources,
  type Fixture,
  type FixtureSource
} from "../engine/fixture";
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

export async function gradeCompile(
  fixture: Fixture,
  collected?: FixtureSource[]
): Promise<DimensionResult> {
  const sources = collected ?? (await collectFixtureSources(fixture));
  const reactPath = join(fixture.root, ".benchmark-types", "react.d.ts");
  const designSystemPath = join(
    fixture.root,
    ".benchmark-types",
    "design-system.d.ts"
  );
  const virtualFiles = new Map<string, string>([
    [reactPath, fixture.reactDeclarations],
    [designSystemPath, fixture.designSystemDeclarations],
    ...sources.map(
      source => [join(fixture.root, source.path), source.source] as const
    )
  ]);
  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    jsx: ts.JsxEmit.ReactJSX,
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    types: []
  };
  const host = ts.createCompilerHost(options);
  const readFile = host.readFile.bind(host);
  const fileExists = host.fileExists.bind(host);
  host.fileExists = path => virtualFiles.has(path) || fileExists(path);
  host.readFile = path => virtualFiles.get(path) ?? readFile(path);
  host.getSourceFile = (path, languageVersion) => {
    const source = host.readFile(path);
    return source === undefined
      ? undefined
      : ts.createSourceFile(path, source, languageVersion, true);
  };
  const program = ts.createProgram({
    rootNames: [...virtualFiles.keys()],
    options,
    host
  });
  const diagnostics = [
    ...program.getOptionsDiagnostics(),
    ...program.getGlobalDiagnostics(),
    ...program.getSyntacticDiagnostics(),
    ...program.getSemanticDiagnostics()
  ];
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
