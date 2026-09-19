/**
 * Adapted from christophhdesign/open-design-system-bench by Christoph Hellmuth.
 * Source commit: e258a12dff8d483746e9a9ebfa655fa827301e13. MIT licensed;
 * see ../../NOTICE for the preserved license notice.
 */
import { matchesGlob } from "node:path";
import type { DimensionResult, Finding, Gate } from "../types";
import type { GradeContext } from "./index";

type Kind = "color" | "dimension";
const HEX = /#[0-9a-f]{3,8}\b/i;
const RGB = /\brgba?\([^)]*\)/i;
const DIMENSION = /\d(?:\.\d+)?(?:px|rem)\b/i;
const BRACKET = /\[[^\]]+\]/g;

function classify(value: string): Kind | undefined {
  if (HEX.test(value) || RGB.test(value)) return "color";
  if (DIMENSION.test(value)) return "dimension";
  return undefined;
}

function allowed(path: string, patterns: string[]): boolean {
  return patterns.some(pattern => {
    try {
      return matchesGlob(path, pattern);
    } catch {
      return path === pattern;
    }
  });
}

export function gradeTokenDiscipline(context: GradeContext): DimensionResult {
  if (context.groundTruth.tokens.length === 0) {
    return {
      dimension: "tokenDiscipline",
      score: 0,
      gate: "pass",
      applicable: false,
      findings: []
    };
  }
  const findings: Finding[] = [];
  let hasColor = false;
  for (const file of context.files) {
    const allowHex = allowed(
      file.path,
      context.task.mechanicalOverrides?.allowHexIn ?? []
    );
    for (const literal of file.analysis.classNameLiterals) {
      let masked = literal.value;
      for (const match of literal.value.matchAll(BRACKET)) {
        const kind = classify(match[0]);
        if (kind && !(kind === "color" && allowHex)) {
          hasColor ||= kind === "color";
          findings.push({
            dimension: "tokenDiscipline",
            file: file.path,
            message: `Arbitrary Tailwind value '${match[0]}' in ${file.path}:${literal.line} bypasses design tokens`,
            fix: `Use a design-system ${kind} token instead.`
          });
        }
        masked = masked.replace(match[0], " ".repeat(match[0].length));
      }
      const rawColor = HEX.exec(masked)?.[0] ?? RGB.exec(masked)?.[0];
      if (rawColor && !allowHex) {
        hasColor = true;
        findings.push({
          dimension: "tokenDiscipline",
          file: file.path,
          message: `Raw color '${rawColor}' in ${file.path}:${literal.line} bypasses design tokens`
        });
      }
    }
    for (const style of file.analysis.inlineStyles) {
      const kind = classify(style.value);
      if (!kind || (kind === "color" && allowHex)) continue;
      hasColor ||= kind === "color";
      findings.push({
        dimension: "tokenDiscipline",
        file: file.path,
        message: `Inline style ${style.prop}: '${style.value}' in ${file.path}:${style.line} bypasses design tokens`,
        fix: `Use a design-system ${kind} token instead.`
      });
    }
  }
  const count = findings.length;
  const gate: Gate =
    count === 0 ? "pass" : count > 3 || hasColor ? "review" : "pass";
  return {
    dimension: "tokenDiscipline",
    score: Math.max(0, 100 - count * 10),
    gate,
    findings
  };
}
