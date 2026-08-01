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

import type { GeneratedDocument } from "@power-plant/core";
import type { Schema } from "@razorwind/core/schema";
import { createDocument } from "@razorwind/core/utils";
import { isString } from "@stryke/type-checks/is-string";
import { isAbsolute, resolve } from "node:path";
import StyleDictionary from "style-dictionary";
import type { DesignTokens } from "style-dictionary/types";
import type { StyleDictionaryPluginOptions } from "./types";

function stringifyOutput(value: unknown): string {
  if (isString(value)) {
    return value;
  }

  if (
    typeof value === "object" &&
    value &&
    "toString" in value &&
    typeof value.toString === "function"
  ) {
    const text = value.toString();
    if (text !== "[object Object]") {
      return text;
    }
  }

  return JSON.stringify(value);
}

function resolveGlobs(
  globs: string[] | undefined,
  cwd: string
): string[] | undefined {
  if (!globs) {
    return undefined;
  }

  return globs.map(glob => (isAbsolute(glob) ? glob : resolve(cwd, glob)));
}

/**
 * Resolve schema tokens into a Style Dictionary `DesignTokens` document.
 *
 * Multi-theme records (`{ light, dark, … }`) pass through as nested groups so
 * platforms can filter/transform per theme if desired.
 */
function resolveTokens(tokens: Schema["tokens"]): DesignTokens {
  if (!tokens || typeof tokens !== "object") {
    return {};
  }

  return tokens as DesignTokens;
}

/**
 * Run Style Dictionary `formatAllPlatforms()` against Razorwind schema tokens.
 *
 * @see https://styledictionary.com/reference/api/#formatallplatforms
 * @see https://styledictionary.com/reference/config/#platform
 */
export async function generateStyleDictionary(
  spec: Schema,
  options: StyleDictionaryPluginOptions = {},
  cwd = process.cwd()
): Promise<Record<string, GeneratedDocument>> {
  const { source, include, usesDtcg, platforms, ...rest } = options;

  if (!platforms || Object.keys(platforms).length === 0) {
    return {};
  }

  const sd = new StyleDictionary({
    ...rest,
    source: resolveGlobs(source, cwd),
    include: resolveGlobs(include, cwd),
    tokens: resolveTokens(spec.tokens),
    platforms,
    usesDtcg: usesDtcg ?? true
  });

  const formatted = (await sd.formatAllPlatforms()) as Record<
    string,
    Array<{ output: unknown; destination?: string }>
  >;
  const documents: Record<string, GeneratedDocument> = {};

  for (const [platform, files] of Object.entries(formatted)) {
    for (const file of files) {
      const path = file.destination ?? `${platform}.output`;
      documents[path] = createDocument<Schema, StyleDictionaryPluginOptions>(
        path,
        stringifyOutput(file.output),
        { name: platform }
      );
    }
  }

  return documents;
}
