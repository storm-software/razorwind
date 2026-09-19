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

import type { ComponentPropMap, GroundTruth } from "../types";

function propertyName(name: string): string {
  return /^[A-Z_$][\w$]*$/i.test(name) ? name : JSON.stringify(name);
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
