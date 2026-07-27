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

import { isObject } from "@razorwind/core/utils";

export { formatTokenValue, toCssVar } from "@razorwind/core/utils";

/**
 * Escape a value for embedding inside a double-quoted JS/TS string literal.
 */
export function escapeString(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
    .replaceAll("\n", "\\n")
    .replaceAll("\r", "\\r");
}

/**
 * Serialize a JS value as a TypeScript expression literal.
 */
export function toLiteral(value: unknown): string {
  if (typeof value === "string") {
    return `"${escapeString(value)}"`;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (value == null) {
    return "undefined";
  }

  return JSON.stringify(value);
}

/**
 * Convert a DTCG `$value` into a Tamagui token primitive.
 *
 * Colors stay CSS strings. Dimensions with `px` (or unitless numbers) become
 * numbers — Tamagui `space` / `size` / `radius` / `zIndex` expect numbers.
 */
export function toTamaguiValue(value: unknown, type?: string): string | number {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "boolean") {
    return Number(value);
  }

  if (
    isObject(value) &&
    typeof value.value === "number" &&
    typeof value.unit === "string"
  ) {
    const unit = value.unit.toLowerCase();
    if (unit === "px" || unit === "") {
      return value.value;
    }
    if (unit === "rem") {
      return value.value * 16;
    }
    return `${value.value}${value.unit}`;
  }

  if (typeof value === "string") {
    const pxMatch = /^(-?\d+(?:\.\d+)?)px$/i.exec(value.trim());
    if (pxMatch) {
      return Number(pxMatch[1]);
    }

    const remMatch = /^(-?\d+(?:\.\d+)?)rem$/i.exec(value.trim());
    if (remMatch) {
      return Number(remMatch[1]) * 16;
    }

    const numeric = Number(value);
    if (!Number.isNaN(numeric) && value.trim() !== "") {
      return numeric;
    }

    return value;
  }

  // Colors and other complex values should already be stringified via
  // formatTokenValue before reaching createTokens color entries.
  void type;
  return String(value);
}
