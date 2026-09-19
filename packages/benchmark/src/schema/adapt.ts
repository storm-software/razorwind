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

import type { Schema } from "@razorwind/core/schema";
import type { BenchmarkComponent, BenchmarkToken, GroundTruth } from "../types";
import { extractComponentProps } from "./props";

const THEME_NAME =
  /^(?:light|dark|dim|dimmed|high-contrast|hc|default|theme)$/i;

export interface AdaptSchemaOptions {
  packageName?: string;
}

function pascalCase(value: string): string {
  const parts = value.split(/[^a-z0-9]+/i).filter(Boolean);
  const result = parts
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

  return /^[A-Z_$]/i.test(result) ? result : `Component${result}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function flattenTokens(
  value: unknown,
  segments: string[],
  tokens: BenchmarkToken[],
  seen: WeakSet<object>,
  theme?: string
): void {
  if (!isRecord(value)) return;
  if (seen.has(value)) return;
  seen.add(value);

  if ("$value" in value) {
    tokens.push({
      path: segments.join("."),
      type: typeof value.$type === "string" ? value.$type : undefined,
      value: value.$value,
      theme
    });
    return;
  }

  for (const key of Object.keys(value).sort()) {
    if (key.startsWith("$")) continue;
    flattenTokens(value[key], [...segments, key], tokens, seen, theme);
  }
}

function normalizeTokens(tokens: Schema["tokens"]): BenchmarkToken[] {
  const result: BenchmarkToken[] = [];
  const entries = Object.entries(tokens as Record<string, unknown>);
  const themed =
    entries.length > 1 && entries.every(([key]) => THEME_NAME.test(key));

  if (themed) {
    for (const [theme, tree] of entries.sort(([left], [right]) =>
      left.localeCompare(right)
    )) {
      flattenTokens(tree, [theme], result, new WeakSet(), theme);
    }
  } else {
    flattenTokens(tokens, [], result, new WeakSet());
  }

  return result.sort((left, right) => left.path.localeCompare(right.path));
}

export async function adaptSchema(
  schema: Schema,
  options: AdaptSchemaOptions
): Promise<GroundTruth> {
  const packageName = options.packageName ?? schema.name;
  if (!packageName?.trim()) {
    throw new Error(
      "@razorwind/benchmark requires Schema.name or options.packageName"
    );
  }

  const components: Record<string, BenchmarkComponent> = {};
  const sorted = Object.values(schema.components).sort((left, right) =>
    left.title.localeCompare(right.title)
  );
  for (const component of sorted) {
    const exportName = pascalCase(component.title || component.name);
    components[exportName] = {
      name: component.name,
      exportName,
      description: component.description,
      props: await extractComponentProps(component.files)
    };
  }
  if (Object.keys(components).length === 0) {
    throw new Error(
      "@razorwind/benchmark requires at least one usable component"
    );
  }

  return {
    packageName,
    components,
    tokens: normalizeTokens(schema.tokens)
  };
}
