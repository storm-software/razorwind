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

/**
 * sRGB primitives shared by CVD simulation and contrast-style transforms.
 *
 * Adapted from Pierre theme color science:
 * https://github.com/pierrecomputer/pierre/tree/main/packages/theme/src/color
 */

/** Parse a hex color (`#rgb` / `#rrggbb` / `#rrggbbaa`) to RGB channels in 0–1. */
export function hexToRgb01(hex: string): [number, number, number] {
  const cleaned = hex.replace("#", "");
  const expanded =
    cleaned.length === 3 || cleaned.length === 4
      ? cleaned
          .split("")
          .map(x => x + x)
          .join("")
      : cleaned;

  const num = Number.parseInt(expanded.slice(0, 6), 16);
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;

  return [r, g, b];
}

/** Optional alpha channel from `#rrggbbaa` (0–1), else `undefined`. */
export function hexAlpha(hex: string): number | undefined {
  const cleaned = hex.replace("#", "");
  const expanded =
    cleaned.length === 3 || cleaned.length === 4
      ? cleaned
          .split("")
          .map(x => x + x)
          .join("")
      : cleaned;

  if (expanded.length < 8) {
    return undefined;
  }

  return Number.parseInt(expanded.slice(6, 8), 16) / 255;
}

/** Linearize an sRGB channel (remove the sRGB gamma curve). */
export function srgbToLinear(c: number): number {
  if (c <= 0.04045) {
    return c / 12.92;
  }
  return ((c + 0.055) / 1.055) ** 2.4;
}

/** Apply the sRGB gamma curve to a linear channel (encode for display). */
export function linearToSrgb(c: number): number {
  if (c <= 0.0031308) {
    return c * 12.92;
  }
  return 1.055 * c ** (1 / 2.4) - 0.055;
}

/** WCAG relative luminance for an sRGB hex color. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb01(hex).map(srgbToLinear) as [
    number,
    number,
    number
  ];

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function channelToHex(v01: number): string {
  return Math.round(clamp01(v01) * 255)
    .toString(16)
    .padStart(2, "0");
}

/** Encode RGB (0–1) channels as a 6-digit hex string. */
export function rgb01ToHex(r: number, g: number, b: number): string {
  return `#${channelToHex(r)}${channelToHex(g)}${channelToHex(b)}`;
}

/** Encode RGB + optional alpha as `#rrggbb` or `#rrggbbaa`. */
export function rgb01ToHexWithAlpha(
  r: number,
  g: number,
  b: number,
  alpha?: number
): string {
  const base = rgb01ToHex(r, g, b);
  if (alpha === undefined || alpha >= 1) {
    return base;
  }
  return `${base}${channelToHex(alpha)}`;
}
