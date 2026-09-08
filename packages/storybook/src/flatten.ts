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
import type { FlatToken, StorybookPluginOptions } from "./types";

export { resolveTokenSets };
export type { TokenSet };

function isTruthyFlag(value: unknown): boolean {
  return value === true || value === "true" || value === 1;
}

function metadataKey(theme: string | undefined, path: string): string {
  return theme ? `${theme}:${path}` : path;
}

function readChildTheme(node: Record<string, unknown>): string | undefined {
  const value = node.theme ?? node.$theme;

  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function isColorMetadataKey(key: string, value: unknown): boolean {
  if (key === "palette" || key === "$palette") {
    return (
      typeof value === "boolean" ||
      typeof value === "number" ||
      typeof value === "string"
    );
  }

  return (key === "theme" || key === "$theme") && typeof value === "string";
}

function collectColorMetadata(
  tokens: Tokens | Record<string, Tokens>
): Map<string, Pick<FlatToken, "palette" | "childTheme">> {
  const metadata = new Map<string, Pick<FlatToken, "palette" | "childTheme">>();

  function walk(
    node: unknown,
    path: string[],
    theme: string | undefined,
    palette: boolean,
    childTheme: string | undefined
  ): void {
    if (!isObject(node)) {
      return;
    }

    const nextPalette =
      palette || isTruthyFlag(node.palette) || isTruthyFlag(node.$palette);
    const nextChildTheme = readChildTheme(node) ?? childTheme;

    if (isTokenLeaf(node)) {
      if (nextPalette || nextChildTheme) {
        metadata.set(metadataKey(theme, path.join(".")), {
          ...(nextPalette && { palette: true }),
          ...(nextChildTheme && { childTheme: nextChildTheme })
        });
      }
      return;
    }

    for (const [key, child] of Object.entries(node)) {
      if (
        (key.startsWith("$") && key !== "$palette" && key !== "$theme") ||
        isColorMetadataKey(key, child)
      ) {
        continue;
      }

      walk(child, [...path, key], theme, nextPalette, nextChildTheme);
    }
  }

  for (const set of resolveTokenSets(tokens)) {
    const theme = set.id === "default" ? undefined : set.id;
    walk(set.tokens, [], theme, false, undefined);
  }

  return metadata;
}

/**
 * Flatten DTCG token trees into documentation rows.
 */
export function flattenTokens(
  tokens: Tokens | Record<string, Tokens>,
  options: Pick<StorybookPluginOptions, "cssVarPrefix" | "includeTypes"> = {}
): FlatToken[] {
  const cssVarPrefix = options.cssVarPrefix ?? "rw";
  const metadata = collectColorMetadata(tokens);

  return flattenTokensBase<FlatToken>(tokens, {
    includeTypes: options.includeTypes,
    shouldIncludeToken: token => token.skipDocs !== true,
    enrichToken: base => {
      const colorMetadata = metadata.get(metadataKey(base.theme, base.path));

      return {
        ...base,
        cssVar: toCssVar(base.path, cssVarPrefix),
        ...(base.type === "color" && colorMetadata)
      };
    }
  });
}
