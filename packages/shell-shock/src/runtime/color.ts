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

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGB_RE =
  /^rgba?\(\s*(\d{1,3})(?:\s|\s*,)\s*(\d{1,3})(?:\s|\s*,)\s*(\d{1,3})\s*(?:[,/]\s*([\d.]+%?)\s*)?\)$/i;

function channelToHex(channel: number): string {
  return Math.round(Math.max(0, Math.min(255, channel)))
    .toString(16)
    .padStart(2, "0");
}

function expandShortHex(hex: string): string {
  return hex
    .split("")
    .map(char => char + char)
    .join("");
}

/**
 * Normalize a color string or DTCG color `$value` to lowercase six-digit hex (or
 * eight-digit hex when a non-opaque alpha is present). Returns `null` for
 * references, unsupported color spaces and non-color values.
 */
export function toHexColor(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();

    const hex = HEX_RE.exec(trimmed);
    if (hex?.[1]) {
      const digits = hex[1].toLowerCase();
      const expanded = digits.length <= 4 ? expandShortHex(digits) : digits;

      return `#${expanded.length === 8 && expanded.endsWith("ff") ? expanded.slice(0, 6) : expanded}`;
    }

    const rgb = RGB_RE.exec(trimmed);
    if (rgb) {
      const [, r, g, b, alpha] = rgb;
      let suffix = "";
      if (alpha !== undefined) {
        const parsed = alpha.endsWith("%")
          ? Number.parseFloat(alpha) / 100
          : Number.parseFloat(alpha);
        if (Number.isFinite(parsed) && parsed < 1) {
          suffix = channelToHex(parsed * 255);
        }
      }
      return `#${channelToHex(Number(r))}${channelToHex(Number(g))}${channelToHex(Number(b))}${suffix}`;
    }

    return null;
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const alpha =
    typeof record.alpha === "number" && record.alpha < 1
      ? channelToHex(record.alpha * 255)
      : "";

  if (typeof record.hex === "string") {
    const base = toHexColor(record.hex);

    return base ? `${base.slice(0, 7)}${alpha}` : null;
  }

  if (
    record.colorSpace === "srgb" &&
    Array.isArray(record.components) &&
    record.components.length >= 3
  ) {
    const [r, g, b] = record.components as unknown[];
    if (
      typeof r === "number" &&
      typeof g === "number" &&
      typeof b === "number"
    ) {
      return `#${channelToHex(r * 255)}${channelToHex(g * 255)}${channelToHex(b * 255)}${alpha}`;
    }
  }

  return null;
}

/** Parse a hex color into 0..255 RGB channels (alpha ignored). */
export function hexToRgb(hex: string): [number, number, number] | null {
  const normalized = toHexColor(hex);
  if (!normalized) {
    return null;
  }

  return [
    Number.parseInt(normalized.slice(1, 3), 16),
    Number.parseInt(normalized.slice(3, 5), 16),
    Number.parseInt(normalized.slice(5, 7), 16)
  ];
}

/**
 * Perceptually-weighted RGB distance (0 = identical). Uses the "redmean"
 * approximation, which is good enough for nearest-token suggestions.
 */
export function colorDistance(a: string, b: string): number {
  const left = hexToRgb(a);
  const right = hexToRgb(b);
  if (!left || !right) {
    return Number.POSITIVE_INFINITY;
  }

  const rMean = (left[0] + right[0]) / 2;
  const dr = left[0] - right[0];
  const dg = left[1] - right[1];
  const db = left[2] - right[2];

  return Math.sqrt(
    (2 + rMean / 256) * dr * dr +
      4 * dg * dg +
      (2 + (255 - rMean) / 256) * db * db
  );
}
