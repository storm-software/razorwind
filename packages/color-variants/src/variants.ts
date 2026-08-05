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
import { isObject } from "@razorwind/core/utils";
import { colorValueToHex, hexToColorValue, transformHex } from "./color";
import type { ColorVariant } from "./types";
import { VARIANT_DESCRIPTIONS } from "./types";

/**
 * Theme-like keys used to detect a multi-theme tokens record.
 * Kept in sync with `@razorwind/core` `THEME_BASENAME_PATTERN`.
 */
const THEME_BASENAME_PATTERN =
  /^(?:light|dark|dim|dimmed|high-contrast|hc|protanopia|deuteranopia|tritanopia|achromatopsia|achromatomaly|monochrome|monochromatic|grayscale|greyscale|bw|black-and-white|black-white|blackWhite|default|base|theme)(?:[._-].+)?$/i;

function isTokenLeaf(node: Record<string, unknown>): boolean {
  return "$value" in node || "value" in node || "$ref" in node || "ref" in node;
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
  return undefined;
}

function writeValue(node: Record<string, unknown>, next: unknown): void {
  if ("$value" in node) {
    node.$value = next;
    return;
  }
  if ("value" in node) {
    node.value = next;
  }
}

/**
 * Convert a kebab-case {@link ColorVariant} into a camelCase record key
 * (`high-contrast` → `highContrast`).
 */
export function variantToCamelCase(variant: ColorVariant): string {
  return variant.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase());
}

/**
 * Append a variant suffix onto an existing theme key
 * (`dark` + `high-contrast` → `darkHighContrast`).
 */
export function appendVariantKey(
  baseKey: string,
  variant: ColorVariant
): string {
  const camel = variantToCamelCase(variant);

  return `${baseKey}${camel.charAt(0).toUpperCase()}${camel.slice(1)}`;
}

/**
 * True when `tokens` is a multi-theme record (every non-`$` key looks like a
 * theme basename), not a single DTCG token tree.
 */
export function isTokensRecord(
  tokens: Tokens | Record<string, Tokens>
): tokens is Record<string, Tokens> {
  if (!isObject(tokens)) {
    return false;
  }

  const keys = Object.keys(tokens).filter(key => !key.startsWith("$"));
  if (keys.length === 0) {
    return false;
  }

  return keys.every(key => THEME_BASENAME_PATTERN.test(key));
}

/**
 * Walk a token tree and rewrite every resolvable color `$value` for `variant`.
 */
export function applyColorVariantToTokens(
  tokens: Tokens,
  variant: ColorVariant
): Tokens {
  const clone = structuredClone(tokens);

  const walk = (node: unknown, inheritedType?: string): void => {
    if (!isObject(node)) {
      return;
    }

    const type = readType(node, inheritedType);

    if (isTokenLeaf(node)) {
      const value = readValue(node);
      const hex = colorValueToHex(value);

      // Transform typed colors, or untyped leaves whose `$value` parses as color.
      const isColor = type === "color" || (type === undefined && hex !== null);
      if (!isColor || !hex) {
        return;
      }

      writeValue(node, hexToColorValue(transformHex(hex, variant), value));
      return;
    }

    for (const [key, child] of Object.entries(node)) {
      if (key.startsWith("$")) {
        continue;
      }
      walk(child, type);
    }
  };

  walk(clone);
  return clone;
}

/**
 * Attach a short `$description` describing the variant on the token set root.
 */
export function withVariantDescription(
  tokens: Tokens,
  variant: ColorVariant
): Tokens {
  const next = structuredClone(tokens);
  const description = VARIANT_DESCRIPTIONS[variant];
  const existing =
    typeof next.$description === "string" ? next.$description.trim() : "";

  next.$description = existing ? `${existing} ${description}` : description;

  return next;
}

/**
 * Expand extracted tokens into a record that includes the original set(s)
 * plus one entry per requested color variant.
 *
 * - Multi-theme input `{ dark, light }` → `{ dark, light, darkDimmed, … }`
 * - Single token tree → `{ default, dimmed, highContrast, … }`
 */
export function expandColorVariants(
  tokens: Tokens | Record<string, Tokens>,
  variants: ColorVariant[]
): Record<string, Tokens> {
  const result: Record<string, Tokens> = {};

  if (isTokensRecord(tokens)) {
    for (const [key, set] of Object.entries(tokens)) {
      result[key] = set;
      for (const variant of variants) {
        const variantKey = appendVariantKey(key, variant);
        result[variantKey] = withVariantDescription(
          applyColorVariantToTokens(set, variant),
          variant
        );
      }
    }
    return result;
  }

  result.default = tokens;
  for (const variant of variants) {
    result[variantToCamelCase(variant)] = withVariantDescription(
      applyColorVariantToTokens(tokens, variant),
      variant
    );
  }
  return result;
}
