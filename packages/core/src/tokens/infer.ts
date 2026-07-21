/* -------------------------------------------------------------------

                       🗲 Storm Software - Windie

 This code was released as part of the Windie project. Windie
 is maintained by Storm Software under the Apache-2.0 license, and is
 free for commercial and private use. For more information, please visit
 our licensing page at https://stormsoftware.com/licenses/projects/windie.

 Website:                  https://stormsoftware.com
 Repository:               https://github.com/storm-software/windie
 Documentation:            https://docs.stormsoftware.com/projects/windie
 Contact:                  https://stormsoftware.com/contact

 SPDX-License-Identifier:  Apache-2.0

 ------------------------------------------------------------------- */

import { TYPE_PATH_HINTS } from "./constants";

const HEX_COLOR_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGB_COLOR_RE =
  // eslint-disable-next-line no-control-regex
  /^rgba?\(\s*([+\d.]+%?)[\x09-\x0D\xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]*(?: |(?: \s*)?,)\s*([+\d.]+%?)[\x09-\x0D\xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]*(?: |(?: \s*)?,)\s*([+\d.]+%?)(?:\s*[,/]\s*([+\d.]+%?))?\s*\)$/i;
const HSL_COLOR_RE =
  // eslint-disable-next-line no-control-regex
  /^hsla?\(\s*([+\d.]+)[\x09-\x0D\xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]*(?: |(?: \s*)?,)\s*([+\d.]+)%[\x09-\x0D\xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]*(?: |(?: \s*)?,)\s*([+\d.]+)%(?:\s*[,/]\s*([+\d.]+%?))?\s*\)$/i;
const OKLCH_COLOR_RE =
  /^oklch\(\s*([+\d.]+%?|none)\s+([+\d.]+|none)\s+([+\d.]+|none)(?:\s*\/\s*([+\d.]+%?))?\s*\)$/i;
const DIMENSION_RE =
  /^([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*(px|rem|em|%|vh|vw|vmin|vmax|ch|ex|cm|mm|in|pt|pc)$/i;
const DURATION_RE = /^([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*(ms|s)$/i;
const CUBIC_BEZIER_RE =
  /^cubic-bezier\(\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*,\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*,\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*,\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*\)$/i;
const CSS_VAR_RE =
  /^var\(\s*(--[\w-]+)\s*(?:,\s*(?:\S.*|[\t\v\f \xA0\u1680\u2000-\u200A\u202F\u205F\u3000\uFEFF]))?\)\s*$/i;
const CURLY_REF_RE = /^\{[^{}]+\}$/;
const FONT_WEIGHT_NAMES: Record<string, number> = {
  thin: 100,
  hairline: 100,
  extralight: 200,
  "extra-light": 200,
  ultralight: 200,
  light: 300,
  normal: 400,
  regular: 400,
  book: 400,
  medium: 500,
  semibold: 600,
  "semi-bold": 600,
  demibold: 600,
  bold: 700,
  extrabold: 800,
  "extra-bold": 800,
  ultrabold: 800,
  black: 900,
  heavy: 900
};

const DTCG_DIMENSION_UNITS = new Set(["px", "rem"]);

export type InferredTokenType =
  | "color"
  | "dimension"
  | "duration"
  | "fontFamily"
  | "fontWeight"
  | "number"
  | "cubicBezier"
  | "shadow"
  | "gradient"
  | "typography"
  | "strokeStyle"
  | "border"
  | "transition";

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function parsePercentOrNumber(raw: string, percentScale = 100): number {
  const trimmed = raw.trim();
  if (trimmed.endsWith("%")) {
    return clamp01(Number.parseFloat(trimmed) / percentScale);
  }
  const num = Number.parseFloat(trimmed);

  return num > 1 ? clamp01(num / 255) : clamp01(num);
}

function expandHex(hex: string): string {
  const raw = hex.slice(1);
  if (raw.length === 3 || raw.length === 4) {
    return `#${[...raw].map(ch => ch + ch).join("")}`;
  }
  return hex.length === 7 || hex.length === 9 ? hex : hex;
}

function hexToColorValue(hex: string) {
  const full = expandHex(hex.toLowerCase());
  const body = full.slice(1);
  const r = Number.parseInt(body.slice(0, 2), 16) / 255;
  const g = Number.parseInt(body.slice(2, 4), 16) / 255;
  const b = Number.parseInt(body.slice(4, 6), 16) / 255;
  const alpha =
    body.length === 8 ? Number.parseInt(body.slice(6, 8), 16) / 255 : undefined;

  return {
    colorSpace: "srgb" as const,
    components: [r, g, b] as [number, number, number],
    ...(alpha === undefined || alpha === 1 ? {} : { alpha }),
    hex: `#${body.slice(0, 6)}`
  };
}

function cssVarToReference(varName: string): string {
  const segments = varName.replace(/^--/, "").split("-").filter(Boolean);

  return `{${segments.join(".")}}`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTokenLeaf(node: Record<string, unknown>): boolean {
  return "$value" in node || "value" in node || "$ref" in node || "ref" in node;
}

/**
 * Infer DTCG `$type` from a path segment chain (e.g. `color.primary`).
 */
export function inferTypeFromPath(
  path: string[]
): InferredTokenType | undefined {
  for (let i = path.length - 1; i >= 0; i--) {
    const segment = path[i]?.toLowerCase();
    if (!segment) {
      continue;
    }
    const hint = TYPE_PATH_HINTS[segment];
    if (hint) {
      return hint as InferredTokenType;
    }
  }
  return undefined;
}

/**
 * Normalize a raw token value into DTCG-friendly shape + optional `$type`.
 */
export function inferValue(
  raw: unknown,
  path: string[] = []
): { value: unknown; type?: InferredTokenType } {
  const pathType = inferTypeFromPath(path);

  if (typeof raw === "string") {
    const trimmed = raw.trim();

    if (CURLY_REF_RE.test(trimmed)) {
      return { value: trimmed, type: pathType };
    }

    const cssVar = trimmed.match(CSS_VAR_RE);
    if (cssVar?.[1]) {
      return { value: cssVarToReference(cssVar[1]), type: pathType };
    }

    if (HEX_COLOR_RE.test(trimmed)) {
      return { value: hexToColorValue(trimmed), type: "color" };
    }

    const rgb = trimmed.match(RGB_COLOR_RE);
    if (rgb) {
      const components: [number, number, number] = [
        parsePercentOrNumber(rgb[1]!),
        parsePercentOrNumber(rgb[2]!),
        parsePercentOrNumber(rgb[3]!)
      ];
      const alpha = rgb[4]
        ? rgb[4].endsWith("%")
          ? clamp01(Number.parseFloat(rgb[4]) / 100)
          : clamp01(Number.parseFloat(rgb[4]))
        : undefined;

      return {
        value: {
          colorSpace: "srgb",
          components,
          ...(alpha === undefined || Number.isNaN(alpha) ? {} : { alpha })
        },
        type: "color"
      };
    }

    const hsl = trimmed.match(HSL_COLOR_RE);
    if (hsl) {
      return {
        value: {
          colorSpace: "hsl",
          components: [
            Number.parseFloat(hsl[1]!),
            Number.parseFloat(hsl[2]!),
            Number.parseFloat(hsl[3]!)
          ],
          ...(hsl[4]
            ? {
                alpha: hsl[4].endsWith("%")
                  ? clamp01(Number.parseFloat(hsl[4]) / 100)
                  : clamp01(Number.parseFloat(hsl[4]))
              }
            : {})
        },
        type: "color"
      };
    }

    const oklch = trimmed.match(OKLCH_COLOR_RE);
    if (oklch) {
      const toComp = (part: string) =>
        part === "none"
          ? "none"
          : part.endsWith("%")
            ? Number.parseFloat(part) / 100
            : Number.parseFloat(part);

      return {
        value: {
          colorSpace: "oklch",
          components: [toComp(oklch[1]!), toComp(oklch[2]!), toComp(oklch[3]!)],
          ...(oklch[4]
            ? {
                alpha: oklch[4].endsWith("%")
                  ? clamp01(Number.parseFloat(oklch[4]) / 100)
                  : clamp01(Number.parseFloat(oklch[4]))
              }
            : {})
        },
        type: "color"
      };
    }

    const dimension = trimmed.match(DIMENSION_RE);
    if (dimension) {
      const unit = dimension[2]!.toLowerCase();
      const value = Number.parseFloat(dimension[1]!);
      if (DTCG_DIMENSION_UNITS.has(unit)) {
        return { value: { value, unit }, type: "dimension" };
      }
      // Keep non-DTCG units as raw strings without forcing `$type: dimension`.
      return {
        value: trimmed,
        type: pathType === "dimension" ? undefined : pathType
      };
    }

    const duration = trimmed.match(DURATION_RE);
    if (duration) {
      return {
        value: {
          value: Number.parseFloat(duration[1]!),
          unit: duration[2]!.toLowerCase()
        },
        type: "duration"
      };
    }

    const bezier = trimmed.match(CUBIC_BEZIER_RE);
    if (bezier) {
      return {
        value: [
          Number.parseFloat(bezier[1]!),
          Number.parseFloat(bezier[2]!),
          Number.parseFloat(bezier[3]!),
          Number.parseFloat(bezier[4]!)
        ],
        type: "cubicBezier"
      };
    }

    const weightName = FONT_WEIGHT_NAMES[trimmed.toLowerCase()];
    if (weightName !== undefined) {
      return { value: weightName, type: "fontWeight" };
    }

    if (
      pathType === "fontFamily" ||
      /family|font|typeface/i.test(path.at(-1) ?? "")
    ) {
      if (trimmed.includes(",")) {
        return {
          value: trimmed
            .split(",")
            .map(part => part.trim().replace(/^["']|["']$/g, "")),
          type: "fontFamily"
        };
      }
      return {
        value: trimmed.replace(/^["']|["']$/g, ""),
        type: "fontFamily"
      };
    }

    if (pathType === "color" && !trimmed.startsWith("{")) {
      // Leave unknown color strings typed only if path strongly suggests color;
      // hex/rgb already handled above.
      return { value: trimmed, type: undefined };
    }

    return { value: trimmed, type: pathType };
  }

  if (typeof raw === "number") {
    if (pathType === "fontWeight") {
      return { value: raw, type: "fontWeight" };
    }
    if (pathType === "duration") {
      return { value: { value: raw, unit: "ms" }, type: "duration" };
    }
    if (pathType === "dimension") {
      return { value: { value: raw, unit: "px" }, type: "dimension" };
    }
    return { value: raw, type: pathType ?? "number" };
  }

  if (Array.isArray(raw)) {
    if (
      raw.length === 4 &&
      raw.every(item => typeof item === "number") &&
      (pathType === "cubicBezier" || path.some(p => /ease|bezier/i.test(p)))
    ) {
      return { value: raw, type: "cubicBezier" };
    }
    if (raw.every(item => typeof item === "string")) {
      return { value: raw, type: pathType ?? "fontFamily" };
    }
    return { value: raw, type: pathType };
  }

  if (isPlainObject(raw)) {
    if ("colorSpace" in raw && "components" in raw) {
      return { value: raw, type: "color" };
    }
    if ("value" in raw && "unit" in raw) {
      const unit = String(raw.unit).toLowerCase();
      if (unit === "ms" || unit === "s") {
        return { value: raw, type: "duration" };
      }
      if (DTCG_DIMENSION_UNITS.has(unit)) {
        return { value: raw, type: "dimension" };
      }
      return { value: raw, type: pathType };
    }
  }

  return { value: raw, type: pathType };
}

function normalizeTokenNode(
  node: Record<string, unknown>,
  path: string[]
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...node };

  if ("value" in next && !("$value" in next)) {
    next.$value = next.value;
    delete next.value;
  }
  if ("type" in next && !("$type" in next)) {
    next.$type = next.type;
    delete next.type;
  }
  if ("comment" in next && !("$description" in next)) {
    next.$description = next.comment;
    delete next.comment;
  }
  if ("description" in next && !("$description" in next)) {
    next.$description = next.description;
    delete next.description;
  }
  if ("ref" in next && !("$ref" in next)) {
    next.$ref = next.ref;
    delete next.ref;
  }

  if ("$value" in next) {
    const inferred = inferValue(next.$value, path);
    next.$value = inferred.value;
    if (!("$type" in next) && inferred.type) {
      next.$type = inferred.type;
    }
  }

  return next;
}

/**
 * Walk a token tree: promote legacy keys to DTCG and infer `$type` / `$value` shapes.
 */
export function normalizeTokenTree(
  input: unknown,
  path: string[] = []
): unknown {
  if (Array.isArray(input)) {
    return input.map((item, index) =>
      normalizeTokenTree(item, [...path, String(index)])
    );
  }

  if (!isPlainObject(input)) {
    return input;
  }

  if (isTokenLeaf(input)) {
    return normalizeTokenNode(input, path);
  }

  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (key.startsWith("$")) {
      output[key] = value;
      continue;
    }
    output[key] = normalizeTokenTree(value, [...path, key]);
  }

  // Promote group `$type` from path when children look uniformly typed.
  if (!("$type" in output)) {
    const groupType = inferTypeFromPath(path);
    if (groupType && path.length > 0) {
      output.$type = groupType;
    }
  }

  return output;
}

/**
 * Nest a flat map of dashed keys into a token tree.
 * `--color-primary-500` / `color-primary-500` → `color.primary.500`.
 */
export function nestFlatTokens(
  flat: Record<string, unknown>
): Record<string, unknown> {
  const root: Record<string, unknown> = {};

  for (const [rawKey, rawValue] of Object.entries(flat)) {
    const key = rawKey.replace(/^--/, "");
    const segments = key.split(/[-./]/).filter(Boolean);
    if (segments.length === 0) {
      continue;
    }

    let cursor = root;
    for (let i = 0; i < segments.length - 1; i++) {
      const segment = segments[i]!;
      const existing = cursor[segment];
      if (!isPlainObject(existing) || isTokenLeaf(existing)) {
        cursor[segment] = {};
      }
      cursor = cursor[segment] as Record<string, unknown>;
    }

    const leafKey = segments.at(-1)!;
    const inferred = inferValue(rawValue, segments);
    cursor[leafKey] = {
      $value: inferred.value,
      ...(inferred.type ? { $type: inferred.type } : {})
    };
  }

  return normalizeTokenTree(root) as Record<string, unknown>;
}
