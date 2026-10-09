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

import type { Tokens } from "@razorwind/core/schema";
import type { TokenSet } from "@razorwind/core/utils";
import {
  flattenTokens as flattenTokensBase,
  isObject,
  isTokenLeaf,
  resolveTokenSets,
  toCssVar
} from "@razorwind/core/utils";
import type { DocgenGeneratePluginOptions, FlatToken } from "../types";

export { resolveTokenSets };
export type { TokenSet };

type ColorMetadata = Pick<FlatToken, "childTheme" | "childGroup">;

function readString(
  node: Record<string, unknown>,
  key: string
): string | undefined {
  const value = node[key] ?? node[`$${key}`];

  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function collectColorMetadata(
  tokens: Tokens | Record<string, Tokens>
): Map<string, ColorMetadata> {
  const metadata = new Map<string, ColorMetadata>();

  function walk(
    node: unknown,
    path: string[],
    setId: string | undefined,
    inherited: ColorMetadata
  ): void {
    if (!isObject(node)) {
      return;
    }

    const childTheme = readString(node, "theme") ?? inherited.childTheme;
    const childGroup = readString(node, "group") ?? inherited.childGroup;

    if (isTokenLeaf(node)) {
      if (childTheme || childGroup) {
        metadata.set(`${setId ?? ""}:${path.join(".")}`, {
          ...(childTheme && { childTheme }),
          ...(childGroup && { childGroup })
        });
      }
      return;
    }

    for (const [key, child] of Object.entries(node)) {
      if (key.startsWith("$") || key === "theme" || key === "group") {
        continue;
      }
      walk(child, [...path, key], setId, { childTheme, childGroup });
    }
  }

  for (const set of resolveTokenSets(tokens)) {
    walk(set.tokens, [], set.id === "default" ? undefined : set.id, {});
  }

  return metadata;
}

/**
 * Flatten DTCG token trees into documentation rows.
 */
export function flattenTokens(
  tokens: Tokens | Record<string, Tokens>,
  options: Pick<
    DocgenGeneratePluginOptions,
    "cssVarPrefix" | "includeTypes"
  > = {}
): FlatToken[] {
  const cssVarPrefix = options.cssVarPrefix;
  const colorMetadata = collectColorMetadata(tokens);

  return flattenTokensBase<FlatToken>(tokens, {
    includeTypes: options.includeTypes,
    shouldIncludeToken: token => token.skipDocs !== true,
    enrichToken: base => ({
      ...base,
      cssVar: toCssVar(base.path, cssVarPrefix),
      ...(base.type === "color" &&
        colorMetadata.get(`${base.theme ?? ""}:${base.path}`))
    })
  });
}
