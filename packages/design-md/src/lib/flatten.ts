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

import type { TokenType } from "@power-plant/dtcg-schema";
import type { Tokens } from "@razorwind/core/schema";
import type { TokenSet } from "@razorwind/core/utils";
import {
  flattenTokens as flattenTokensBase,
  isObject,
  isTokenLeaf,
  resolveTokenSets
} from "@razorwind/core/utils";
import type { FlatToken } from "../types";

export { resolveTokenSets };
export type { TokenSet };

function isTruthyFlag(value: unknown): boolean {
  return value === true || value === "true" || value === 1;
}

function readType(node: Record<string, unknown>): string | undefined {
  if (typeof node.$type === "string") {
    return node.$type;
  }
  if (typeof node.type === "string") {
    return node.type;
  }
  return undefined;
}

/**
 * True when a DTCG group is explicitly a color palette.
 *
 * Accepts `palette: true`, `$palette: true`, or `$type: "palette"`.
 */
export function isPaletteGroup(node: Record<string, unknown>): boolean {
  if (isTruthyFlag(node.palette) || isTruthyFlag(node.$palette)) {
    return true;
  }

  return readType(node) === "palette";
}

/**
 * True when a DTCG group is explicitly a primitive.
 *
 * Accepts `primitive: true`, `$primitive: true`, or `$type: "primitive"`.
 */
export function isPrimitiveGroup(node: Record<string, unknown>): boolean {
  if (isTruthyFlag(node.primitive) || isTruthyFlag(node.$primitive)) {
    return true;
  }

  return readType(node) === "primitive";
}

function isPaletteOrPrimitiveMetadataKey(key: string, value: unknown): boolean {
  return (
    (key === "palette" ||
      key === "$palette" ||
      key === "primitive" ||
      key === "$primitive") &&
    (typeof value === "boolean" ||
      typeof value === "number" ||
      typeof value === "string")
  );
}

function flagKey(theme: string | undefined, path: string): string {
  return theme ? `${theme}:${path}` : path;
}

/**
 * Collect `palette` / `primitive` flags inherited from ancestor groups.
 */
function collectPaletteAndPrimitiveFlags(
  tokens: Tokens | Record<string, Tokens>
): Map<string, { palette?: boolean; primitive?: boolean }> {
  const flags = new Map<string, { palette?: boolean; primitive?: boolean }>();

  function walk(
    node: unknown,
    path: string[],
    theme: string | undefined,
    palette: boolean,
    primitive: boolean
  ): void {
    if (!isObject(node)) {
      return;
    }

    const isPalette = palette || isPaletteGroup(node);
    const isPrimitive = primitive || isPrimitiveGroup(node);

    if (isTokenLeaf(node)) {
      if (isPalette || isPrimitive) {
        flags.set(flagKey(theme, path.join(".")), {
          ...(isPalette && { palette: true }),
          ...(isPrimitive && { primitive: true })
        });
      }
      return;
    }

    for (const [key, child] of Object.entries(node)) {
      if (key.startsWith("$") && key !== "$palette" && key !== "$primitive") {
        continue;
      }
      if (isPaletteOrPrimitiveMetadataKey(key, child)) {
        continue;
      }

      walk(child, [...path, key], theme, isPalette, isPrimitive);
    }
  }

  for (const set of resolveTokenSets(tokens)) {
    const theme = set.id === "default" ? undefined : set.id;
    walk(set.tokens, [], theme, false, false);
  }

  return flags;
}

/**
 * Flatten DTCG token trees into extraction rows.
 */
export function flattenTokens(
  tokens: Tokens | Record<string, Tokens>,
  includeTypes?: TokenType[]
): FlatToken[] {
  const flat = flattenTokensBase<FlatToken>(tokens, { includeTypes });
  const flags = collectPaletteAndPrimitiveFlags(tokens);

  for (const token of flat) {
    const extra = flags.get(flagKey(token.theme, token.path));
    if (extra?.palette) {
      token.palette = true;
    }
    if (extra?.primitive) {
      token.primitive = true;
    }
  }

  return flat;
}
