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
import { formatTokenValue, isObject } from "@razorwind/core/utils";
import type { FlatToken, SandpackPluginOptions } from "./types";

/**
 * Theme-like basename patterns used to split multi-theme token records.
 * Kept in sync with `@razorwind/core` `THEME_BASENAME_PATTERN`, plus camelCase
 * suffixes produced by `@razorwind/color-variants` (e.g. `darkHighContrast`).
 */
const THEME_BASENAME_PATTERN =
  /^(?:light|dark|dim|dimmed|high-contrast|hc|protanopia|deuteranopia|tritanopia|achromatopsia|achromatomaly|monochrome|monochromatic|grayscale|greyscale|bw|black-and-white|black-white|blackWhite|default|base|theme)(?:[A-Z]\w*|[._-].+)?$/i;

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
  if (!isObject(node)) {
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
 */
export function resolveTokenSets(
  tokens: Tokens | Record<string, Tokens>
): TokenSet[] {
  if (!isObject(tokens)) {
    return [];
  }

  const keys = Object.keys(tokens).filter(key => !key.startsWith("$"));
  const allThemes =
    keys.length > 0 && keys.every(key => THEME_BASENAME_PATTERN.test(key));

  if (allThemes) {
    const themeTokens = tokens as Record<string, Tokens>;

    return keys.map(id => ({
      id,
      tokens: themeTokens[id]!
    }));
  }

  return [{ id: "default", tokens }];
}

/**
 * Flatten DTCG token trees into rows helpful for {@link SandpackPluginOptions.mapTheme}.
 */
export function flattenTokens(
  tokens: Tokens | Record<string, Tokens>,
  options: Pick<SandpackPluginOptions, "includeTypes"> = {}
): FlatToken[] {
  const includeTypes = options.includeTypes
    ? new Set<string>(options.includeTypes)
    : undefined;
  const flat: FlatToken[] = [];

  for (const set of resolveTokenSets(tokens)) {
    const theme = set.id === "default" ? undefined : set.id;
    walkTokens(set.tokens, [], undefined, theme, flat);
  }

  if (!includeTypes) {
    return flat;
  }

  return flat.filter(
    token => !token.type || includeTypes.has(token.type as TokenType)
  );
}
