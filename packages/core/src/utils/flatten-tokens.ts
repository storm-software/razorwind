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

import { isObject as isObjectFn } from "@stryke/type-checks/is-object";
import type { Tokens } from "../schema";
import { formatTokenValue } from "./token-format";

function isObject(value: unknown): value is Record<string, unknown> {
  return isObjectFn(value);
}

/**
 * A flattened design token row produced by {@link flattenTokens}.
 */
export interface BaseFlatToken {
  /** Dot-separated token path (e.g. `color.primary`). */
  path: string;
  /** DTCG `$type`, when known. */
  type?: string;
  /** Raw `$value` from the token document. */
  value: unknown;
  /** CSS-friendly string form of {@link value}. */
  cssValue: string;
  /** Optional DTCG `$description`. */
  description?: string;
  /** Theme / set id when tokens are a `Record<string, Tokens>`. */
  theme?: string;
}

export interface TokenSet {
  id: string;
  tokens: Tokens;
}

/**
 * Theme-like keys for splitting multi-theme token records.
 *
 * Extends core {@link ../lib/tokens/constants#THEME_BASENAME_PATTERN} with
 * camelCase suffixes from `@razorwind/color-variants` (e.g. `darkHighContrast`).
 */
export const TOKEN_SET_THEME_PATTERN =
  /^(?:light|dark|dim|dimmed|high-contrast|hc|protanopia|deuteranopia|tritanopia|achromatopsia|achromatomaly|monochrome|monochromatic|grayscale|greyscale|bw|black-and-white|black-white|blackWhite|default|base|theme)(?:[A-Z]\w*|[._-].+)?$/i;

/**
 * True when `node` is a DTCG token leaf rather than a nested group.
 */
export function isTokenLeaf(node: Record<string, unknown>): boolean {
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

function walkTokens<T extends BaseFlatToken>(
  node: unknown,
  path: string[],
  inheritedType: string | undefined,
  theme: string | undefined,
  enrichToken: ((token: BaseFlatToken) => T) | undefined,
  out: T[]
): void {
  if (!isObject(node)) {
    return;
  }

  const type = readType(node, inheritedType);

  if (isTokenLeaf(node)) {
    const value = readValue(node);
    const base: BaseFlatToken = {
      path: path.join("."),
      type,
      value,
      cssValue: formatTokenValue(value, type),
      description: readDescription(node),
      theme
    };
    out.push(enrichToken ? enrichToken(base) : (base as T));
    return;
  }

  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith("$")) {
      continue;
    }
    walkTokens(child, [...path, key], type, theme, enrichToken, out);
  }
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
  if (!isObject(tokens)) {
    return [];
  }

  const keys = Object.keys(tokens).filter(key => !key.startsWith("$"));
  const allThemes =
    keys.length > 0 && keys.every(key => TOKEN_SET_THEME_PATTERN.test(key));

  if (allThemes) {
    const themeTokens = tokens as Record<string, Tokens>;

    return keys.map(id => ({
      id,
      tokens: themeTokens[id]!
    }));
  }

  return [{ id: "default", tokens }];
}

export interface FlattenTokensOptions<T extends BaseFlatToken = BaseFlatToken> {
  /** When set, only tokens whose `$type` is listed are returned. */
  includeTypes?: readonly string[];
  /** Map each base row before it is appended (e.g. add `cssVar`). */
  enrichToken?: (token: BaseFlatToken) => T;
}

/**
 * Flatten DTCG token trees into rows for theme mapping or documentation.
 */
export function flattenTokens<T extends BaseFlatToken = BaseFlatToken>(
  tokens: Tokens | Record<string, Tokens>,
  options: FlattenTokensOptions<T> = {}
): T[] {
  const includeTypes = options.includeTypes
    ? new Set<string>(options.includeTypes)
    : undefined;
  const flat: T[] = [];

  for (const set of resolveTokenSets(tokens)) {
    const theme = set.id === "default" ? undefined : set.id;
    walkTokens(set.tokens, [], undefined, theme, options.enrichToken, flat);
  }

  if (!includeTypes) {
    return flat;
  }

  return flat.filter(token => !token.type || includeTypes.has(token.type));
}
