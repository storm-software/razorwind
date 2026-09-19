/**
 * Adapted from christophhdesign/open-design-system-bench by Christoph Hellmuth.
 * Source commit: e258a12dff8d483746e9a9ebfa655fa827301e13. MIT licensed;
 * see ../../NOTICE for the preserved license notice.
 */
import { parse } from "@babel/parser";
import traverseModule from "@babel/traverse";
import type { Node } from "@babel/types";

const traverse =
  (
    traverseModule as unknown as {
      default?: typeof traverseModule;
    }
  ).default ?? traverseModule;

export interface ImportAnalysis {
  source: string;
  names: Array<{ imported: string; local: string }>;
}

export interface JsxElementAnalysis {
  base: string;
  full: string;
  attrs: string[];
  hasSpread: boolean;
  line: number;
}

export interface FileAnalysis {
  imports: ImportAnalysis[];
  jsxElements: JsxElementAnalysis[];
  classNameLiterals: Array<{ value: string; line: number }>;
  inlineStyles: Array<{ prop: string; value: string; line: number }>;
}

export interface AnalyzedSourceFile {
  path: string;
  source: string;
  analysis: FileAnalysis;
}

const CLASSNAME_CALLS = new Set(["cx", "cn", "clsx", "twMerge", "tv"]);

function emptyAnalysis(): FileAnalysis {
  return {
    imports: [],
    jsxElements: [],
    classNameLiterals: [],
    inlineStyles: []
  };
}

function lineOf(node: { loc?: Node["loc"] } | null | undefined): number {
  return node?.loc?.start.line ?? 0;
}

function jsxBaseName(name: any): string {
  if (name.type === "JSXIdentifier") return name.name;
  if (name.type === "JSXMemberExpression") return jsxBaseName(name.object);
  if (name.type === "JSXNamespacedName") return name.namespace.name;
  return "";
}

function jsxFullName(name: any): string {
  if (name.type === "JSXIdentifier") return name.name;
  if (name.type === "JSXMemberExpression") {
    return `${jsxFullName(name.object)}.${name.property.name}`;
  }
  if (name.type === "JSXNamespacedName") {
    return `${name.namespace.name}:${name.name.name}`;
  }
  return "";
}

function jsxAttrName(name: any): string {
  if (name.type === "JSXIdentifier") return name.name;
  if (name.type === "JSXNamespacedName") {
    return `${name.namespace.name}:${name.name.name}`;
  }
  return "";
}

function templateChunks(template: any): string[] {
  return (template.quasis ?? []).map(
    (quasi: any) => quasi.value?.cooked ?? quasi.value?.raw ?? ""
  );
}

function literalValue(node: any): string | undefined {
  if (node.type === "StringLiteral") return node.value;
  if (node.type === "NumericLiteral") return String(node.value);
  if (node.type === "TemplateLiteral" && node.expressions.length === 0) {
    return templateChunks(node).join("");
  }
  return undefined;
}

export function analyzeSource(_path: string, source: string): FileAnalysis {
  let ast;
  try {
    ast = parse(source, {
      sourceType: "module",
      plugins: ["typescript", "jsx"],
      errorRecovery: true
    });
  } catch {
    return emptyAnalysis();
  }

  const analysis = emptyAnalysis();
  try {
    traverse(ast, {
      ImportDeclaration(path: any) {
        const names: ImportAnalysis["names"] = [];
        for (const specifier of path.node.specifiers) {
          if (specifier.type === "ImportDefaultSpecifier") {
            names.push({
              imported: "__default__",
              local: specifier.local.name
            });
          } else if (specifier.type === "ImportNamespaceSpecifier") {
            names.push({ imported: "*", local: specifier.local.name });
          } else if (specifier.type === "ImportSpecifier") {
            names.push({
              imported:
                specifier.imported.type === "Identifier"
                  ? specifier.imported.name
                  : specifier.imported.value,
              local: specifier.local.name
            });
          }
        }
        analysis.imports.push({ source: path.node.source.value, names });
      },
      JSXOpeningElement(path: any) {
        const node = path.node;
        const attrs: string[] = [];
        let hasSpread = false;
        for (const attr of node.attributes) {
          if (attr.type === "JSXSpreadAttribute") {
            hasSpread = true;
          } else {
            attrs.push(jsxAttrName(attr.name));
          }
        }
        analysis.jsxElements.push({
          base: jsxBaseName(node.name),
          full: jsxFullName(node.name),
          attrs,
          hasSpread,
          line: lineOf(node)
        });

        const className = node.attributes.find(
          (attr: any) =>
            attr.type === "JSXAttribute" &&
            jsxAttrName(attr.name) === "className"
        );
        if (className?.value?.type === "StringLiteral") {
          analysis.classNameLiterals.push({
            value: className.value.value,
            line: lineOf(className)
          });
        } else if (className?.value?.type === "JSXExpressionContainer") {
          const expression = className.value.expression;
          if (expression.type === "StringLiteral") {
            analysis.classNameLiterals.push({
              value: expression.value,
              line: lineOf(expression)
            });
          } else if (expression.type === "TemplateLiteral") {
            for (const value of templateChunks(expression)) {
              if (value) {
                analysis.classNameLiterals.push({
                  value,
                  line: lineOf(expression)
                });
              }
            }
          }
        }

        const style = node.attributes.find(
          (attr: any) =>
            attr.type === "JSXAttribute" && jsxAttrName(attr.name) === "style"
        );
        const expression =
          style?.value?.type === "JSXExpressionContainer"
            ? style.value.expression
            : undefined;
        if (expression?.type === "ObjectExpression") {
          for (const property of expression.properties) {
            if (property.type !== "ObjectProperty") continue;
            const prop =
              property.key.type === "Identifier"
                ? property.key.name
                : property.key.type === "StringLiteral"
                  ? property.key.value
                  : undefined;
            const value = literalValue(property.value);
            if (prop && value !== undefined) {
              analysis.inlineStyles.push({
                prop,
                value,
                line: lineOf(property)
              });
            }
          }
        }
      },
      CallExpression(path: any) {
        const callee = path.node.callee;
        if (callee.type !== "Identifier" || !CLASSNAME_CALLS.has(callee.name))
          return;
        for (const argument of path.node.arguments) {
          if (argument.type === "StringLiteral") {
            analysis.classNameLiterals.push({
              value: argument.value,
              line: lineOf(argument)
            });
          } else if (argument.type === "TemplateLiteral") {
            for (const value of templateChunks(argument)) {
              if (value) {
                analysis.classNameLiterals.push({
                  value,
                  line: lineOf(argument)
                });
              }
            }
          }
        }
      }
    });
  } catch {
    // Compilation grading owns syntax failures; static analysis is best effort.
  }
  return analysis;
}
