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

/**
 * `inset-shadow` must not match the space `inset` prefix (`\b` is true between
 * `t` and `-`). Shadow families map onto separate Tamagui custom token
 * categories so they can be used as `boxShadow` / `textShadow` / `filter`.
 *
 * @see https://tamagui.dev/docs/core/tokens
 * @see https://tamagui.dev/docs/intro/styles
 */
const FONT_SIZE_PATH_PATTERN = /^(?:font-size|fontSize)(?:\.|$)/i;
const FONT_WEIGHT_PATH_PATTERN = /^(?:font-weight|fontWeight)(?:\.|$)/i;
const BOX_SHADOW_PATH_PATTERN = /^shadow(?:\.|$)/i;
const INSET_SHADOW_PATH_PATTERN = /^inset-shadow(?:\.|$)/i;
const DROP_SHADOW_PATH_PATTERN = /^drop-shadow(?:\.|$)/i;
const TEXT_SHADOW_PATH_PATTERN = /^text-shadow(?:\.|$)/i;
const BLUR_PATH_PATTERN = /^(?:blur|blur-?radius)(?:\.|$)/i;

const CSS_STRING_CATEGORIES = new Set<TamaguiTokenCategory>([
  "color",
  "shadow",
  "insetShadow",
  "dropShadow",
  "textShadow"
]);

const CATEGORY_PREFIXES: Array<{
  prefix: RegExp;
  category: TamaguiTokenCategory;
}> = [
  { prefix: /^(?:color|colours?|palette)(?:\.|$)/i, category: "color" },
  { prefix: FONT_SIZE_PATH_PATTERN, category: "fontSize" },
  { prefix: FONT_WEIGHT_PATH_PATTERN, category: "fontWeight" },
  { prefix: DROP_SHADOW_PATH_PATTERN, category: "dropShadow" },
  { prefix: INSET_SHADOW_PATH_PATTERN, category: "insetShadow" },
  { prefix: TEXT_SHADOW_PATH_PATTERN, category: "textShadow" },
  { prefix: BOX_SHADOW_PATH_PATTERN, category: "shadow" },
  { prefix: BLUR_PATH_PATTERN, category: "blur" },
  { prefix: /^(?:space|spacing|gap)(?:\.|$)/i, category: "space" },
  { prefix: /^inset(?:\.|$)/i, category: "space" },
  { prefix: /^(?:size|sizing)(?:\.|$)/i, category: "size" },
  { prefix: /^(?:radius|rounded|radii)(?:\.|$)/i, category: "radius" },
  // eslint-disable-next-line regexp/no-dupe-disjunctions
  { prefix: /^(?:z-?index|zindex|elevation)(?:\.|$)/i, category: "zIndex" }
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

function isTruthyPrimitiveFlag(value: unknown): boolean {
  return value === true || value === "true" || value === 1;
}

/**
 * True when a DTCG group is explicitly a primitive.
 *
 * Accepts `primitive: true`, `$primitive: true`, or `$type: "primitive"`.
 */
function isPrimitiveGroup(node: Record<string, unknown>): boolean {
  if (
    isTruthyPrimitiveFlag(node.primitive) ||
    isTruthyPrimitiveFlag(node.$primitive)
  ) {
    return true;
  }
  return readType(node) === "primitive";
}

function isPrimitiveMetadataKey(key: string, value: unknown): boolean {
  return (
    (key === "primitive" || key === "$primitive") &&
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

  if (type === "shadow") {
    if (INSET_SHADOW_PATH_PATTERN.test(path)) {
      return "insetShadow";
    }
    if (DROP_SHADOW_PATH_PATTERN.test(path)) {
      return "dropShadow";
    }
    if (TEXT_SHADOW_PATH_PATTERN.test(path)) {
      return "textShadow";
    }
    return "shadow";
  }

  if (type === "dimension") {
    if (FONT_SIZE_PATH_PATTERN.test(path)) {
      return "fontSize";
    }
    if (BLUR_PATH_PATTERN.test(path)) {
      return "blur";
    }
    if (/(?:^|\.)(?:space|spacing|gap)(?:\.|$)/i.test(path)) {
      return "space";
    }
    if (/(?:^|\.)inset(?:\.|$)/i.test(path)) {
      return "space";
    }
    if (/radius|rounded/i.test(path)) {
      return "radius";
    }
    if (/z-?index|elevation/i.test(path)) {
      return "zIndex";
    }
    if (/(?:^|\.)(?:size|sizing)(?:\.|$)/i.test(path)) {
      return "size";
    }
    if (/(?:^|\.)(?:width|height)(?:\.|$)/i.test(path)) {
      return "size";
    }
  }

  if (type === "number" && /z-?index|elevation/i.test(path)) {
    return "zIndex";
  }

  if (type === "fontWeight" || FONT_WEIGHT_PATH_PATTERN.test(path)) {
    return "fontWeight";
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
    /^(?:color|colours?|palette|primitive|space|spacing|gap|inset|shadow|inset-shadow|drop-shadow|text-shadow|font-size|fontSize|font-weight|fontWeight|size|sizing|radius|rounded|radii|z-?index|zindex|elevation|blur)$/i.test(
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
  primitive: boolean,
  out: FlatToken[]
): void {
  if (!isObject(node)) {
    return;
  }

  const isPrimitive =
    primitive || isPrimitiveGroup(node) || isPaletteGroup(node);
  const type = readType(node, inheritedType);

  if (isTokenLeaf(node)) {
    const value = readValue(node);
    const tokenPath = path.join(".");
    const category =
      resolveTokenCategory(tokenPath, type) ??
      (isPrimitive || type === "primitive" || type === "palette"
        ? "color"
        : undefined);
    const cssValue = formatTokenValue(value, type);
    const tamaguiValue =
      (category && CSS_STRING_CATEGORIES.has(category)) ||
      type === "color" ||
      type === "palette" ||
      type === "primitive" ||
      type === "shadow"
        ? cssValue
        : toTamaguiValue(value, type);

    out.push({
      path: tokenPath,
      type: type === "palette" || type === "primitive" ? "color" : type,
      value,
      cssValue,
      tamaguiValue,
      category,
      tokenKey: category ? toTokenKey(tokenPath) : undefined,
      description: readDescription(node),
      theme,
      primitive: isPrimitive
    });
    return;
  }

  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith("$") && key !== "$palette" && key !== "$primitive") {
      continue;
    }
    if (isPaletteMetadataKey(key, child)) {
      continue;
    }
    if (isPrimitiveMetadataKey(key, child)) {
      continue;
    }

    walkTokens(child, [...path, key], type, theme, isPrimitive, out);
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
