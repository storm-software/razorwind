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
import type { FlatToken } from "../types";
import { formatTokenValue } from "./format";

/** Theme-like basename patterns used to split multi-theme token records. */
const THEME_BASENAME_PATTERN =
  /^(?:light|dark|dim|high-contrast|hc|default|base|theme)(?:[._-].+)?$/i;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTokenLeaf(node: Record<string, unknown>): boolean {
  return "$value" in node || "value" in node || "$ref" in node || "ref" in node;
}

function readDescription(node: Record<string, unknown>): string | undefined {
  if (typeof node.$description === "string") {
    return node.$description;
  }
  if (typeof node.description === "string") {
    return node.description;
  }
  return undefined;
}

function readType(
  node: Record<string, unknown>,
  inherited?: string
): string | undefined {
  if (typeof node.$type === "string") {
    return node.$type;
  }
  if (typeof node.type === "string") {
    return node.type;
  }
  return inherited;
}

function readValue(node: Record<string, unknown>): unknown {
  if ("$value" in node) {
    return node.$value;
  }
  if ("value" in node) {
    return node.value;
  }
  if (typeof node.$ref === "string") {
    return node.$ref;
  }
  if (typeof node.ref === "string") {
    return node.ref;
  }
  return undefined;
}

function walkTokens(
  node: unknown,
  path: string[],
  inheritedType: string | undefined,
  theme: string | undefined,
  out: FlatToken[]
): void {
  if (!isPlainObject(node)) {
    return;
  }

  const type = readType(node, inheritedType);

  if (isTokenLeaf(node)) {
    const value = readValue(node);
    out.push({
      path: path.join("."),
      type,
      value,
      cssValue: formatTokenValue(value, type),
      description: readDescription(node),
      theme
    });
    return;
  }

  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith("$")) {
      continue;
    }
    walkTokens(child, [...path, key], type, theme, out);
  }
}

export interface TokenSet {
  id: string;
  tokens: Tokens;
}

/**
 * Split `Schema.tokens` into one or more named token sets.
 *
 * A record whose keys all look like themes (`light`, `dark`, …) is treated as
 * multi-theme input; otherwise the whole document is a single set.
 */
export function resolveTokenSets(
  tokens: Tokens | Record<string, Tokens>
): TokenSet[] {
  if (!isPlainObject(tokens)) {
    return [];
  }

  const keys = Object.keys(tokens).filter(key => !key.startsWith("$"));
  const allThemes =
    keys.length > 0 && keys.every(key => THEME_BASENAME_PATTERN.test(key));

  if (allThemes) {
    return keys.map(id => ({
      id,
      tokens: (tokens as Record<string, Tokens>)[id]!
    }));
  }

  return [{ id: "default", tokens }];
}

/**
 * Flatten DTCG token trees into extraction rows.
 */
export function flattenTokens(
  tokens: Tokens | Record<string, Tokens>,
  includeTypes?: TokenType[]
): FlatToken[] {
  const include = includeTypes ? new Set<string>(includeTypes) : undefined;
  const flat: FlatToken[] = [];

  for (const set of resolveTokenSets(tokens)) {
    const theme = set.id === "default" ? undefined : set.id;
    walkTokens(set.tokens, [], undefined, theme, flat);
  }

  if (!include) {
    return flat;
  }

  return flat.filter(token => !token.type || include.has(token.type));
}
