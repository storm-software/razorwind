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

import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";
import type { Node } from "@babel/types";
import type { DimensionResult, Finding } from "../types";
import type { GradeContext } from "./index";

const traverse =
  (traverseModule as unknown as { default?: typeof traverseModule }).default ??
  traverseModule;

const INTERACTIVE = new Set([
  "a",
  "button",
  "input",
  "select",
  "textarea",
  "option",
  "summary",
  "audio",
  "video"
]);
const VALID_ARIA = new Set([
  "aria-activedescendant",
  "aria-atomic",
  "aria-autocomplete",
  "aria-busy",
  "aria-checked",
  "aria-controls",
  "aria-current",
  "aria-describedby",
  "aria-details",
  "aria-disabled",
  "aria-errormessage",
  "aria-expanded",
  "aria-haspopup",
  "aria-hidden",
  "aria-invalid",
  "aria-keyshortcuts",
  "aria-label",
  "aria-labelledby",
  "aria-level",
  "aria-live",
  "aria-modal",
  "aria-multiline",
  "aria-multiselectable",
  "aria-orientation",
  "aria-owns",
  "aria-placeholder",
  "aria-pressed",
  "aria-readonly",
  "aria-relevant",
  "aria-required",
  "aria-roledescription",
  "aria-selected",
  "aria-sort",
  "aria-valuemax",
  "aria-valuemin",
  "aria-valuenow",
  "aria-valuetext"
]);

function lineOf(node: { loc?: Node["loc"] } | undefined): number {
  return node?.loc?.start.line ?? 0;
}

function attrName(name: any): string {
  return name.type === "JSXIdentifier" ? name.name : "";
}

function findAttr(attributes: any[], name: string): any | undefined {
  return attributes.find(
    attr => attr.type === "JSXAttribute" && attrName(attr.name) === name
  );
}

function tagName(name: any): string {
  if (name.type === "JSXIdentifier") return name.name;
  if (name.type === "JSXMemberExpression") {
    return `${tagName(name.object)}.${name.property.name}`;
  }
  return "";
}

function staticValue(attr: any): string | number | boolean | undefined {
  if (!attr?.value) return attr ? true : undefined;
  if (attr.value.type === "StringLiteral") return attr.value.value;
  if (attr.value.type !== "JSXExpressionContainer") return undefined;
  const expression = attr.value.expression;
  if (
    expression.type === "StringLiteral" ||
    expression.type === "NumericLiteral" ||
    expression.type === "BooleanLiteral"
  ) {
    return expression.value;
  }
  if (
    expression.type === "UnaryExpression" &&
    expression.operator === "-" &&
    expression.argument.type === "NumericLiteral"
  ) {
    return -expression.argument.value;
  }
  return undefined;
}

function hasText(element: any): boolean {
  return (
    element?.children?.some((child: any) => {
      if (child.type === "JSXText") return child.value.trim().length > 0;
      if (child.type === "JSXExpressionContainer") {
        return (
          child.expression.type !== "JSXEmptyExpression" &&
          child.expression.type !== "NullLiteral"
        );
      }
      return child.type === "JSXElement";
    }) ?? false
  );
}

function named(attributes: any[], element: any): boolean {
  for (const name of [
    "aria-label",
    "aria-labelledby",
    "ariaLabel",
    "label",
    "title"
  ]) {
    const value = staticValue(findAttr(attributes, name));
    if (
      typeof value === "string" ? value.trim().length > 0 : value !== undefined
    )
      return true;
  }
  return hasText(element);
}

function analyzeA11y(path: string, source: string): Finding[] {
  const findings: Finding[] = [];
  let ast;
  try {
    ast = parse(source, {
      sourceType: "module",
      plugins: ["typescript", "jsx"],
      errorRecovery: true
    });
  } catch {
    return findings;
  }
  try {
    traverse(ast, {
      JSXOpeningElement(nodePath: any) {
        const node = nodePath.node;
        const attributes = node.attributes;
        const tag = tagName(node.name);
        const line = lineOf(node);
        const element =
          nodePath.parentPath?.node?.type === "JSXElement"
            ? nodePath.parentPath.node
            : undefined;
        const add = (message: string, fix?: string) =>
          findings.push({
            dimension: "a11yStatic",
            file: path,
            message: `${message} in ${path}:${line}`,
            fix
          });

        if (findAttr(attributes, "autoFocus")) {
          add(`autoFocus on <${tag}>`, "Remove autoFocus.");
        }
        for (const attr of attributes) {
          const name = attr.type === "JSXAttribute" ? attrName(attr.name) : "";
          if (name.startsWith("aria-") && !VALID_ARIA.has(name)) {
            add(`Invalid ARIA attribute '${name}'`);
          }
        }

        const host = /^[a-z]/.test(tag);
        if (host && tag === "img" && !findAttr(attributes, "alt")) {
          add(
            "<img> missing 'alt'",
            'Add alt text or alt="" for a decorative image.'
          );
        }
        const tabIndex = staticValue(findAttr(attributes, "tabIndex"));
        if (host && typeof tabIndex === "number" && tabIndex > 0) {
          add(`Positive tabIndex={${tabIndex}} on <${tag}>`);
        }
        if (
          host &&
          findAttr(attributes, "onClick") &&
          !INTERACTIVE.has(tag) &&
          !findAttr(attributes, "onKeyDown") &&
          !findAttr(attributes, "onKeyUp") &&
          !findAttr(attributes, "onKeyPress")
        ) {
          add(
            `onClick without a keyboard handler on non-interactive <${tag}>`,
            "Add a keyboard handler or use a native interactive element."
          );
        }
        if (host && tag === "a") {
          const href = staticValue(findAttr(attributes, "href"));
          if (
            href === undefined ||
            href === "#" ||
            (typeof href === "string" && href.startsWith("javascript:"))
          ) {
            add("<a> has no valid href", "Use a real href or a button.");
          }
        }
        if (
          (tag === "button" || tag === "Button" || tag === "IconButton") &&
          !named(attributes, element)
        ) {
          add(`<${tag}> empty or icon-only control has no accessible name`);
        }
      }
    });
  } catch {
    // Compilation grading owns malformed syntax; this pass is best effort.
  }
  return findings;
}

export function gradeA11yStatic(context: GradeContext): DimensionResult {
  const findings = context.files.flatMap(file =>
    analyzeA11y(file.path, file.source)
  );

  return {
    dimension: "a11yStatic",
    score: Math.max(0, 100 - findings.length * 15),
    gate: findings.length > 0 ? "review" : "pass",
    findings
  };
}
