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

import type { ColorVariant } from "../types";
import { simulateCVD } from "./cvd";
import { hslToRgb, rgbToHsl } from "./hsl";
import {
  clamp01,
  hexAlpha,
  hexToRgb01,
  relativeLuminance,
  rgb01ToHex,
  rgb01ToHexWithAlpha
} from "./srgb";

const HEX_RE = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/**
 * Dimmed / soft: reduce saturation and compress luminance toward midtone.
 * Mirrors the softer palette stops used by Pierre “soft” themes.
 */
function dimmedHex(hex: string): string {
  const [r, g, b] = hexToRgb01(hex);
  const [h, s, l] = rgbToHsl(r, g, b);
  const nextS = s * 0.55;
  const nextL = 0.5 + (l - 0.5) * 0.7;
  const [nr, ng, nb] = hslToRgb(h, clamp01(nextS), clamp01(nextL));

  return rgb01ToHexWithAlpha(nr, ng, nb, hexAlpha(hex));
}

/**
 * High contrast: boost saturation and push luminance away from midtone.
 */
function highContrastHex(hex: string): string {
  const [r, g, b] = hexToRgb01(hex);
  const [h, s, l] = rgbToHsl(r, g, b);
  const nextS = Math.min(1, s * 1.35 + (s > 0 ? 0.05 : 0));
  const nextL = clamp01(0.5 + (l - 0.5) * 1.45);
  const [nr, ng, nb] = hslToRgb(h, nextS, nextL);

  return rgb01ToHexWithAlpha(nr, ng, nb, hexAlpha(hex));
}

/** Full grayscale via WCAG relative luminance (achromatopsia / monochrome). */
function grayscaleHex(hex: string): string {
  const y = relativeLuminance(hex);
  // Re-encode linear luminance as an sRGB gray channel.
  const encoded = y <= 0.0031308 ? y * 12.92 : 1.055 * y ** (1 / 2.4) - 0.055;

  return rgb01ToHexWithAlpha(encoded, encoded, encoded, hexAlpha(hex));
}

/**
 * Transform an sRGB hex color into the requested {@link ColorVariant}.
 */
export function transformHex(hex: string, variant: ColorVariant): string {
  switch (variant) {
    case "dimmed":
      return dimmedHex(hex);
    case "high-contrast":
      return highContrastHex(hex);
    case "protanopia":
      return withAlpha(simulateCVD(hex.slice(0, 7), "protan"), hex);
    case "deuteranopia":
      return withAlpha(simulateCVD(hex.slice(0, 7), "deutan"), hex);
    case "tritanopia":
      return withAlpha(simulateCVD(hex.slice(0, 7), "tritan"), hex);
    case "achromatopsia":
    case "monochromatic":
      return grayscaleHex(hex);
    default: {
      const _exhaustive: never = variant;

      return _exhaustive;
    }
  }
}

function withAlpha(transformed: string, original: string): string {
  const alpha = hexAlpha(original);
  if (alpha === undefined || alpha >= 1) {
    return transformed;
  }
  return `${transformed}${Math.round(clamp01(alpha) * 255)
    .toString(16)
    .padStart(2, "0")}`;
}

/**
 * Normalize a DTCG color `$value` into a 6/8-digit hex string, or `null`
 * when the value cannot be transformed (refs, unknown spaces, …).
 */
export function colorValueToHex(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (HEX_RE.test(trimmed)) {
      return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
    }
    if (trimmed.startsWith("{") || trimmed.startsWith("var(")) {
      return null;
    }
    return null;
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;

  if (typeof record.hex === "string" && HEX_RE.test(record.hex)) {
    const alpha =
      typeof record.alpha === "number" && record.alpha < 1
        ? Math.round(record.alpha * 255)
            .toString(16)
            .padStart(2, "0")
        : "";

    return `${record.hex}${alpha}`;
  }

  if (
    record.colorSpace === "srgb" &&
    Array.isArray(record.components) &&
    record.components.length >= 3
  ) {
    const [r, g, b] = record.components;
    if (
      typeof r === "number" &&
      typeof g === "number" &&
      typeof b === "number"
    ) {
      const alpha = typeof record.alpha === "number" ? record.alpha : undefined;

      return rgb01ToHexWithAlpha(r, g, b, alpha);
    }
  }

  return null;
}

/**
 * Write a transformed hex back into a shape compatible with the original
 * DTCG `$value`.
 */
export function hexToColorValue(
  hex: string,
  original: unknown
): string | Record<string, unknown> {
  const [r, g, b] = hexToRgb01(hex);
  const alpha = hexAlpha(hex);
  const six = rgb01ToHex(r, g, b);

  if (typeof original === "string") {
    return alpha === undefined || alpha >= 1 ? six : `${six}${channel(alpha)}`;
  }

  if (original && typeof original === "object") {
    const record = original as Record<string, unknown>;

    if ("hex" in record || record.colorSpace === "srgb") {
      const next: Record<string, unknown> = {
        ...record,
        colorSpace: "srgb",
        components: [r, g, b],
        hex: six
      };
      if (alpha !== undefined && alpha < 1) {
        next.alpha = alpha;
      } else {
        delete next.alpha;
      }
      return next;
    }
  }

  return {
    colorSpace: "srgb",
    components: [r, g, b],
    hex: six,
    ...(alpha !== undefined && alpha < 1 ? { alpha } : {})
  };
}

function channel(v01: number): string {
  return Math.round(clamp01(v01) * 255)
    .toString(16)
    .padStart(2, "0");
}
