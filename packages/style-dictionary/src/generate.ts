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
import {
  normalizeTokenTree,
  styleDictionaryLogOptions
} from "@razorwind/core/lib/tokens";
import type { Schema } from "@razorwind/core/schema";
import { createDocument } from "@razorwind/core/utils";
import { isString } from "@stryke/type-checks/is-string";
import { dirname, isAbsolute, join, resolve } from "node:path";
import StyleDictionary from "style-dictionary";
import type { DesignTokens } from "style-dictionary/types";
import { renderInstallMd } from "./install";
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

  return normalizeTokenTree(tokens) as DesignTokens;
}

function defaultInstallPath(outputPaths: string[]): string {
  const first = outputPaths[0];
  if (!first) {
    return "INSTALL.md";
  }
  const parent = dirname(first);

  return parent === "." ? "INSTALL.md" : join(parent, "INSTALL.md");
}

export { renderInstallMd };

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
  const { source, include, usesDtcg, platforms, verbose, ...rest } = options;

  if (!platforms || Object.keys(platforms).length === 0) {
    return {};
  }

  const sd = new StyleDictionary(
    {
      ...rest,
      source: resolveGlobs(source, cwd),
      include: resolveGlobs(include, cwd),
      tokens: resolveTokens(spec.tokens),
      platforms,
      usesDtcg: usesDtcg ?? true
    },
    styleDictionaryLogOptions(verbose)
  );

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

  if (Object.keys(documents).length > 0) {
    const outputPaths = Object.keys(documents).sort();
    const installPath = options.installPath ?? defaultInstallPath(outputPaths);
    const installBody =
      options.installGuide ?? renderInstallMd({ files: outputPaths });
    documents[installPath] = createDocument<
      Schema,
      StyleDictionaryPluginOptions
    >(
      installPath,
      installBody,
      { name: "razorwind-style-dictionary" },
      undefined,
      "markdown"
    );
  }

  return documents;
}
