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

function collectColorThemes(
  tokens: Tokens | Record<string, Tokens>
): Map<string, string> {
  const themes = new Map<string, string>();

  function walk(
    node: unknown,
    path: string[],
    setId: string | undefined,
    inheritedTheme: string | undefined
  ): void {
    if (!isObject(node)) {
      return;
    }

    const ownTheme = node.theme ?? node.$theme;
    const childTheme =
      typeof ownTheme === "string" && ownTheme.length > 0
        ? ownTheme
        : inheritedTheme;

    if (isTokenLeaf(node)) {
      if (childTheme) {
        themes.set(`${setId ?? ""}:${path.join(".")}`, childTheme);
      }
      return;
    }

    for (const [key, child] of Object.entries(node)) {
      if (key.startsWith("$") || key === "theme") {
        continue;
      }
      walk(child, [...path, key], setId, childTheme);
    }
  }

  for (const set of resolveTokenSets(tokens)) {
    walk(set.tokens, [], set.id === "default" ? undefined : set.id, undefined);
  }

  return themes;
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
  const colorThemes = collectColorThemes(tokens);

  return flattenTokensBase<FlatToken>(tokens, {
    includeTypes: options.includeTypes,
    shouldIncludeToken: token => token.skipDocs !== true,
    enrichToken: base => ({
      ...base,
      cssVar: toCssVar(base.path, cssVarPrefix),
      ...(base.type === "color" &&
        colorThemes.has(`${base.theme ?? ""}:${base.path}`) && {
          childTheme: colorThemes.get(`${base.theme ?? ""}:${base.path}`)
        })
    })
  });
}
