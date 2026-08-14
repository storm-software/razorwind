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
import { isObject, resolveTokenSets } from "@razorwind/core/utils";
import { formatTokenValue, toTamaguiValue } from "./format";
import type {
  FlatToken,
  TamaguiPluginOptions,
  TamaguiTokenCategory
} from "./types";

export { resolveTokenSets };
export type { TokenSet };

const CATEGORY_PREFIXES: Array<{
  prefix: RegExp;
  category: TamaguiTokenCategory;
}> = [
  { prefix: /^(?:color|colours?|palette)\b/i, category: "color" },
  { prefix: /^(?:space|spacing|gap|inset)\b/i, category: "space" },
  { prefix: /^(?:size|sizing)\b/i, category: "size" },
  { prefix: /^(?:radius|rounded|radii)\b/i, category: "radius" },
  // eslint-disable-next-line regexp/no-dupe-disjunctions
  { prefix: /^(?:z-?index|zindex|elevation)\b/i, category: "zIndex" }
];

function isTokenLeaf(node: Record<string, unknown>): boolean {
  return "$value" in node || "value" in node || "$ref" in node || "ref" in node;
}

function isTruthyPaletteFlag(value: unknown): boolean {
  return value === true || value === "true" || value === 1;
}

/**
 * True when a DTCG group is explicitly a color palette.
 *
 * Accepts `palette: true`, `$palette: true`, or `$type: "palette"`.
 */
export function isPaletteGroup(node: Record<string, unknown>): boolean {
  if (isTruthyPaletteFlag(node.palette) || isTruthyPaletteFlag(node.$palette)) {
    return true;
  }

  return readType(node) === "palette";
}

function isPaletteMetadataKey(key: string, value: unknown): boolean {
  return (
    (key === "palette" || key === "$palette") &&
    (typeof value === "boolean" ||
      typeof value === "number" ||
      typeof value === "string")
  );
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

/**
 * Map a DTCG token path + type onto a Tamagui `createTokens` category.
 */
export function resolveTokenCategory(
  path: string,
  type?: string
): TamaguiTokenCategory | undefined {
  for (const { prefix, category } of CATEGORY_PREFIXES) {
    if (prefix.test(path)) {
      return category;
    }
  }

  if (type === "color" || type === "palette") {
    return "color";
  }

  if (type === "dimension") {
    if (/space|spacing|gap|inset/i.test(path)) {
      return "space";
    }
    if (/radius|rounded/i.test(path)) {
      return "radius";
    }
    if (/z-?index|elevation/i.test(path)) {
      return "zIndex";
    }
    if (/size|sizing|width|height/i.test(path)) {
      return "size";
    }
  }

  if (type === "number" && /z-?index|elevation/i.test(path)) {
    return "zIndex";
  }

  return undefined;
}

/**
 * Join path/kebab segments into a camelCase Tamagui token key.
 *
 * `background` + `accent-subtle` → `backgroundAccentSubtle`.
 * Numeric steps stay attached (`blue` + `1` → `blue1`).
 */
export function toCamelCaseKey(parts: string[]): string {
  return parts
    .flatMap(part => part.split(/[-_\s]+/))
    .filter(Boolean)
    .map((part, index) => {
      if (/^\d/.test(part)) {
        return part;
      }

      const lower = part.toLowerCase();
      if (index === 0) {
        return lower;
      }

      return `${lower.charAt(0).toUpperCase()}${lower.slice(1)}`;
    })
    .join("");
}

/**
 * Derive the Tamagui token key from a DTCG path (strip category prefix).
 *
 * `radius.DEFAULT` → `true` (Tamagui default token convention).
 * `color.blue.1` → `blue1`.
 * `color.background.accent-subtle` → `backgroundAccentSubtle`.
 */
export function toTokenKey(path: string): string {
  const segments = path.split(".").filter(Boolean);
  const first = segments[0];

  if (
    first &&
    // eslint-disable-next-line regexp/no-dupe-disjunctions
    /^(?:color|colours?|palette|space|spacing|gap|inset|size|sizing|radius|rounded|radii|z-?index|zindex|elevation)$/i.test(
      first
    )
  ) {
    segments.shift();
  }

  const remaining = segments.length > 0 ? segments : path.split(".").slice(-1);
  if (
    remaining.length === 1 &&
    // eslint-disable-next-line regexp/no-dupe-disjunctions
    /^(?:DEFAULT|default)$/i.test(remaining[0] ?? "")
  ) {
    return "true";
  }

  return toCamelCaseKey(remaining);
}

function walkTokens(
  node: unknown,
  path: string[],
  inheritedType: string | undefined,
  theme: string | undefined,
  inPalette: boolean,
  out: FlatToken[]
): void {
  if (!isObject(node)) {
    return;
  }

  const palette = inPalette || isPaletteGroup(node);
  const type = readType(node, inheritedType);

  if (isTokenLeaf(node)) {
    const value = readValue(node);
    const tokenPath = path.join(".");
    const category =
      resolveTokenCategory(tokenPath, type) ??
      (palette || type === "palette" ? "color" : undefined);
    const cssValue = formatTokenValue(value, type);
    const tamaguiValue =
      category === "color" || type === "color" || type === "palette"
        ? cssValue
        : toTamaguiValue(value, type);

    out.push({
      path: tokenPath,
      type: type === "palette" ? "color" : type,
      value,
      cssValue,
      tamaguiValue,
      category,
      tokenKey: category ? toTokenKey(tokenPath) : undefined,
      description: readDescription(node),
      theme,
      palette: palette || undefined
    });
    return;
  }

  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith("$") && key !== "$palette") {
      continue;
    }
    if (isPaletteMetadataKey(key, child)) {
      continue;
    }
    walkTokens(child, [...path, key], type, theme, palette, out);
  }
}

/**
 * Flatten DTCG token trees into Tamagui config rows.
 */
export function flattenTokens(
  tokens: Tokens | Record<string, Tokens>,
  options: Pick<TamaguiPluginOptions, "includeTypes"> = {}
): FlatToken[] {
  const includeTypes = options.includeTypes
    ? new Set<string>(options.includeTypes)
    : undefined;
  const flat: FlatToken[] = [];

  for (const set of resolveTokenSets(tokens)) {
    const theme = set.id === "default" ? undefined : set.id;
    walkTokens(set.tokens, [], undefined, theme, false, flat);
  }

  if (!includeTypes) {
    return flat;
  }

  return flat.filter(
    token => !token.type || includeTypes.has(token.type as TokenType)
  );
}
