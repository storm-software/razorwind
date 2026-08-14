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

const FUNCTIONAL_COLOR_RE = /^(?:oklch|oklab|hsl|hsla|rgb|rgba)\(/i;

/**
 * Trim stray closing parens from CSS functional color notation
 * (e.g. `oklch(0.3 0.06 184))` → `oklch(0.3 0.06 184)`).
 */
export function normalizeFunctionalColorString(value: string): string {
  const trimmed = value.trim();
  if (!FUNCTIONAL_COLOR_RE.test(trimmed)) {
    return trimmed;
  }

  let normalized = trimmed;
  while (
    normalized.endsWith(")") &&
    (normalized.match(/\(/g)?.length ?? 0) <
      (normalized.match(/\)/g)?.length ?? 0)
  ) {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
}

/**
 * Convert a DTCG color `$value` (string, hex/alpha object, or
 * colorSpace/components object) into a CSS-friendly color string.
 */
export function formatColorValue(value: unknown): string | undefined {
  if (typeof value === "string") {
    return normalizeFunctionalColorString(value);
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

function isShadowLayer(value: unknown): value is Record<string, unknown> {
  return isObject(value) && "offsetX" in value && "offsetY" in value;
}

function formatShadowLayer(layer: Record<string, unknown>): string {
  const offsetX = formatDimensionValue(layer.offsetX) ?? "0";
  const offsetY = formatDimensionValue(layer.offsetY) ?? "0";
  const blur = formatDimensionValue(layer.blur);
  const spread =
    layer.spread === undefined ? undefined : formatDimensionValue(layer.spread);
  const color = formatColorValue(layer.color);
  const parts = [
    layer.inset === true ? "inset" : undefined,
    offsetX,
    offsetY,
    blur,
    spread,
    color
  ].filter((part): part is string => part != null && part !== "");

  return parts.join(" ");
}

/**
 * Convert a DTCG shadow `$value` (one layer or a list of layers) into a
 * CSS `box-shadow` string.
 */
export function formatShadowValue(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    if (value.length === 0 || !value.every(isShadowLayer)) {
      return undefined;
    }

    return formatCssAliasReferences(value.map(formatShadowLayer).join(", "));
  }

  if (!isShadowLayer(value)) {
    return undefined;
  }

  return formatCssAliasReferences(formatShadowLayer(value));
}

/** DTCG alias (`{color.neutral.800}`), rewritten to `var(--…)` on emit. */
const DTCG_ALIAS_RE = /\{([^{}]+)\}/g;

/**
 * Convert a DTCG token path into a Tailwind `@theme` custom property.
 *
 * `color.primary` → `--color-primary`; a trailing `DEFAULT` leaf is stripped
 * (`radius.DEFAULT` → `--radius`).
 */
export function toThemeCssVar(path: string): string {
  const segments = path
    .split(".")
    .filter(Boolean)
    .filter(
      (segment, index, all) =>
        !(segment === "DEFAULT" && index === all.length - 1)
    );

  return `--${segments.join("-")}`;
}

/**
 * Rewrite DTCG aliases in a CSS value to `var(--…)` references so reused
 * tokens point at sibling custom properties instead of leaving `{path}` text.
 */
export function formatCssAliasReferences(value: string): string {
  return value.replace(
    DTCG_ALIAS_RE,
    (_, tokenPath: string) => `var(${toThemeCssVar(tokenPath.trim())})`
  );
}

/**
 * Convert a DTCG `$value` into a CSS-friendly string, dispatching on `type`
 * (or, when `type` is omitted, on the shape of `value`).
 */
export function formatTokenValue(value: unknown, type?: string): string {
  if (typeof value === "string") {
    return formatCssAliasReferences(normalizeFunctionalColorString(value));
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

  if (
    type === "shadow" ||
    isShadowLayer(value) ||
    (Array.isArray(value) && value.some(isShadowLayer))
  ) {
    const shadow = formatShadowValue(value);
    if (shadow) {
      return shadow;
    }
  }

  if (Array.isArray(value)) {
    return value.map(item => formatTokenValue(item)).join(", ");
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
