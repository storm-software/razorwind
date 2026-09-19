import type { ComponentPropMap, GroundTruth } from "../types";

function propertyName(name: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(name) ? name : JSON.stringify(name);
}

function safeType(type: string): string {
  if (
    !type.trim() ||
    /[;`\r\n]/.test(type) ||
    /\b(?:declare|import|export|module|namespace)\b/.test(type)
  ) {
    return "unknown";
  }
  return type;
}

function renderProps(
  exportName: string,
  props: ComponentPropMap | null
): string[] {
  if (!props) {
    return [`  export type ${exportName}Props = Record<string, unknown>;`];
  }

  const lines = [`  export interface ${exportName}Props {`];
  for (const [name, prop] of Object.entries(props).sort(([left], [right]) =>
    left.localeCompare(right)
  )) {
    lines.push(
      `    ${propertyName(name)}${prop.required ? "" : "?"}: ${safeType(prop.type)};`
    );
  }
  lines.push("  }");
  return lines;
}

export function renderComponentDeclarations(groundTruth: GroundTruth): string {
  const lines = [
    `declare module ${JSON.stringify(groundTruth.packageName)} {`,
    '  import type { ComponentType } from "react";'
  ];

  for (const component of Object.values(groundTruth.components)) {
    lines.push(...renderProps(component.exportName, component.props));
    lines.push(
      `  export const ${component.exportName}: ComponentType<${component.exportName}Props>;`
    );
  }
  lines.push("}", "");
  return lines.join("\n");
}
