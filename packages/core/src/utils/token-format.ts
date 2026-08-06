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

function isObject(value: unknown): value is Record<string, unknown> {
  return isObjectFn(value);
}

/**
 * Convert a DTCG color `$value` (string, hex/alpha object, or
 * colorSpace/components object) into a CSS-friendly color string.
 */
export function formatColorValue(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (!isObject(value)) {
    return undefined;
  }

  if (typeof value.hex === "string") {
    const alpha =
      typeof value.alpha === "number" && value.alpha < 1
        ? Math.round(value.alpha * 255)
            .toString(16)
            .padStart(2, "0")
        : "";

    return `${value.hex}${alpha}`;
  }

  const colorSpace =
    typeof value.colorSpace === "string" ? value.colorSpace : undefined;
  const components = Array.isArray(value.components)
    ? value.components
    : undefined;

  if (!colorSpace || !components) {
    return undefined;
  }

  const alpha =
    typeof value.alpha === "number" && value.alpha < 1
      ? ` / ${value.alpha}`
      : "";

  if (colorSpace === "srgb" && components.length >= 3) {
    const [r, g, b] = components;
    if (
      typeof r === "number" &&
      typeof g === "number" &&
      typeof b === "number"
    ) {
      return `rgb(${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)}${alpha})`;
    }
  }

  const rendered = components.map(component => String(component)).join(" ");

  return `${colorSpace}(${rendered}${alpha})`;
}

/**
 * Convert a DTCG dimension/duration `$value` (number, string, or
 * value/unit object) into a CSS-friendly string.
 */
export function formatDimensionValue(value: unknown): string | undefined {
  if (typeof value === "number") {
    return String(value);
  }

  if (typeof value === "string") {
    return value;
  }

  if (
    isObject(value) &&
    typeof value.value === "number" &&
    typeof value.unit === "string"
  ) {
    return `${value.value}${value.unit}`;
  }

  return undefined;
}

/**
 * Convert a DTCG `$value` into a CSS-friendly string, dispatching on `type`
 * (or, when `type` is omitted, on the shape of `value`).
 */
export function formatTokenValue(value: unknown, type?: string): string {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (type === "color" || (!type && isObject(value) && "colorSpace" in value)) {
    const color = formatColorValue(value);
    if (color) {
      return color;
    }
  }

  if (
    type === "dimension" ||
    type === "duration" ||
    (isObject(value) && "value" in value && "unit" in value)
  ) {
    const dimension = formatDimensionValue(value);
    if (dimension) {
      return dimension;
    }
  }

  if (type === "cubicBezier" && Array.isArray(value)) {
    return `cubic-bezier(${value.join(", ")})`;
  }

  if (Array.isArray(value)) {
    return value.map(String).join(", ");
  }

  if (isObject(value)) {
    const color = formatColorValue(value);
    if (color) {
      return color;
    }

    const dimension = formatDimensionValue(value);
    if (dimension) {
      return dimension;
    }
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
