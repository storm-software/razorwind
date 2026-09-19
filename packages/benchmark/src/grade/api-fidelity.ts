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

import type { DimensionResult, Finding, Gate } from "../types";
import type { GradeContext } from "./index";

const ALWAYS_ALLOWED = new Set([
  "key",
  "ref",
  "children",
  "className",
  "style",
  "id"
]);
const DOM_PASSTHROUGH = new Set([
  "title",
  "role",
  "tabIndex",
  "hidden",
  "lang",
  "dir",
  "slot",
  "translate",
  "draggable",
  "contentEditable",
  "spellCheck",
  "inputMode",
  "accessKey",
  "autoCapitalize",
  "autoCorrect",
  "name",
  "value",
  "defaultValue",
  "checked",
  "defaultChecked",
  "type",
  "disabled",
  "required",
  "readOnly",
  "placeholder",
  "autoComplete",
  "autoFocus",
  "form",
  "min",
  "max",
  "minLength",
  "maxLength",
  "step",
  "pattern",
  "multiple",
  "accept",
  "size",
  "rows",
  "cols",
  "wrap",
  "list",
  "selected",
  "htmlFor",
  "action",
  "method",
  "encType",
  "noValidate",
  "capture",
  "href",
  "target",
  "rel",
  "download",
  "src",
  "srcSet",
  "sizes",
  "alt",
  "loading",
  "decoding",
  "crossOrigin",
  "referrerPolicy",
  "width",
  "height",
  "poster",
  "controls",
  "autoPlay",
  "loop",
  "muted",
  "playsInline",
  "preload",
  "colSpan",
  "rowSpan",
  "scope",
  "headers",
  "open",
  "reversed",
  "start",
  "dateTime",
  "cite"
]);

function matchesPackage(source: string, packageName: string): boolean {
  return source === packageName || source.startsWith(`${packageName}/`);
}

function isAllowed(attr: string, props: Set<string>): boolean {
  return (
    props.has(attr) ||
    ALWAYS_ALLOWED.has(attr) ||
    DOM_PASSTHROUGH.has(attr) ||
    attr.startsWith("data-") ||
    attr.startsWith("aria-") ||
    /^on[A-Z]/.test(attr)
  );
}

export function gradeApiFidelity(context: GradeContext): DimensionResult {
  const findings: Finding[] = [];
  const validExports = new Set(
    Object.values(context.groundTruth.components).map(c => c.exportName)
  );
  const componentsByExport = new Map(
    Object.values(context.groundTruth.components).map(component => [
      component.exportName,
      component
    ])
  );
  let score = 100;
  let gate: Gate = "pass";
  let usedSystem = false;

  for (const file of context.files) {
    const localToExport = new Map<string, string>();
    for (const imported of file.analysis.imports) {
      if (!matchesPackage(imported.source, context.groundTruth.packageName))
        continue;
      usedSystem = true;
      for (const { imported: exportName, local } of imported.names) {
        if (exportName === "__default__" || exportName === "*") continue;
        if (validExports.has(exportName)) {
          localToExport.set(local, exportName);
        } else if (
          ![...validExports].some(name => `${name}Props` === exportName)
        ) {
          score -= 40;
          gate = "fail";
          findings.push({
            dimension: "apiFidelity",
            file: file.path,
            message: `Hallucinated component '${exportName}' imported from ${context.groundTruth.packageName} in ${file.path}`,
            fix: `Use an exported component: ${[...validExports].join(", ")}.`
          });
        }
      }
    }

    for (const element of file.analysis.jsxElements) {
      const exportName = localToExport.get(element.base);
      if (!exportName) continue;
      const component = componentsByExport.get(exportName)!;
      if (element.full !== element.base || element.hasSpread) {
        if (gate !== "fail") gate = "review";
        findings.push({
          dimension: "apiFidelity",
          file: file.path,
          message: `<${element.full}> props are not statically verifiable in ${file.path}:${element.line}.`
        });
        continue;
      }
      if (component.props === null) {
        findings.push({
          dimension: "apiFidelity",
          file: file.path,
          message: `Prop-level API fidelity for <${element.full}> is not applicable because Schema has no prop metadata.`
        });
        continue;
      }
      const props = new Set(Object.keys(component.props));
      for (const attr of element.attrs) {
        if (isAllowed(attr, props)) continue;
        score -= 15;
        if (gate !== "fail") gate = "review";
        findings.push({
          dimension: "apiFidelity",
          file: file.path,
          message: `Invented prop '${attr}' on <${element.full}> in ${file.path}:${element.line}`,
          fix: `'${attr}' is not a documented prop of ${exportName}.`
        });
      }
    }
  }

  if (!usedSystem) {
    return {
      dimension: "apiFidelity",
      score: 0,
      gate: "fail",
      findings: [
        {
          dimension: "apiFidelity",
          message: "No design-system components used."
        }
      ]
    };
  }
  return {
    dimension: "apiFidelity",
    score: Math.max(0, score),
    gate,
    findings
  };
}
