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

/*
 * CSS value parsing shared by the token rules: splitting values into parts,
 * spotting literals (colors, lengths, durations, easings) and normalizing
 * them so a literal can be matched against the schema's token values.
 */

/** Root font size used to compare `rem` / `em` literals with `px` tokens. */
const ROOT_FONT_SIZE = 16;

/** Global keywords and resets that never need a token. */
export const VALUE_KEYWORDS = new Set([
  "inherit",
  "initial",
  "unset",
  "revert",
  "revert-layer",
  "auto",
  "none",
  "normal",
  "transparent",
  "currentcolor"
]);

/** CSS Color 4 named colors (`transparent` / `currentColor` are keywords). */
export const NAMED_COLORS: Readonly<Record<string, string>> = {
  aliceblue: "#f0f8ff",
  antiquewhite: "#faebd7",
  aqua: "#00ffff",
  aquamarine: "#7fffd4",
  azure: "#f0ffff",
  beige: "#f5f5dc",
  bisque: "#ffe4c4",
  black: "#000000",
  blanchedalmond: "#ffebcd",
  blue: "#0000ff",
  blueviolet: "#8a2be2",
  brown: "#a52a2a",
  burlywood: "#deb887",
  cadetblue: "#5f9ea0",
  chartreuse: "#7fff00",
  chocolate: "#d2691e",
  coral: "#ff7f50",
  cornflowerblue: "#6495ed",
  cornsilk: "#fff8dc",
  crimson: "#dc143c",
  cyan: "#00ffff",
  darkblue: "#00008b",
  darkcyan: "#008b8b",
  darkgoldenrod: "#b8860b",
  darkgray: "#a9a9a9",
  darkgreen: "#006400",
  darkgrey: "#a9a9a9",
  darkkhaki: "#bdb76b",
  darkmagenta: "#8b008b",
  darkolivegreen: "#556b2f",
  darkorange: "#ff8c00",
  darkorchid: "#9932cc",
  darkred: "#8b0000",
  darksalmon: "#e9967a",
  darkseagreen: "#8fbc8f",
  darkslateblue: "#483d8b",
  darkslategray: "#2f4f4f",
  darkslategrey: "#2f4f4f",
  darkturquoise: "#00ced1",
  darkviolet: "#9400d3",
  deeppink: "#ff1493",
  deepskyblue: "#00bfff",
  dimgray: "#696969",
  dimgrey: "#696969",
  dodgerblue: "#1e90ff",
  firebrick: "#b22222",
  floralwhite: "#fffaf0",
  forestgreen: "#228b22",
  fuchsia: "#ff00ff",
  gainsboro: "#dcdcdc",
  ghostwhite: "#f8f8ff",
  gold: "#ffd700",
  goldenrod: "#daa520",
  gray: "#808080",
  green: "#008000",
  greenyellow: "#adff2f",
  grey: "#808080",
  honeydew: "#f0fff0",
  hotpink: "#ff69b4",
  indianred: "#cd5c5c",
  indigo: "#4b0082",
  ivory: "#fffff0",
  khaki: "#f0e68c",
  lavender: "#e6e6fa",
  lavenderblush: "#fff0f5",
  lawngreen: "#7cfc00",
  lemonchiffon: "#fffacd",
  lightblue: "#add8e6",
  lightcoral: "#f08080",
  lightcyan: "#e0ffff",
  lightgoldenrodyellow: "#fafad2",
  lightgray: "#d3d3d3",
  lightgreen: "#90ee90",
  lightgrey: "#d3d3d3",
  lightpink: "#ffb6c1",
  lightsalmon: "#ffa07a",
  lightseagreen: "#20b2aa",
  lightskyblue: "#87cefa",
  lightslategray: "#778899",
  lightslategrey: "#778899",
  lightsteelblue: "#b0c4de",
  lightyellow: "#ffffe0",
  lime: "#00ff00",
  limegreen: "#32cd32",
  linen: "#faf0e6",
  magenta: "#ff00ff",
  maroon: "#800000",
  mediumaquamarine: "#66cdaa",
  mediumblue: "#0000cd",
  mediumorchid: "#ba55d3",
  mediumpurple: "#9370db",
  mediumseagreen: "#3cb371",
  mediumslateblue: "#7b68ee",
  mediumspringgreen: "#00fa9a",
  mediumturquoise: "#48d1cc",
  mediumvioletred: "#c71585",
  midnightblue: "#191970",
  mintcream: "#f5fffa",
  mistyrose: "#ffe4e1",
  moccasin: "#ffe4b5",
  navajowhite: "#ffdead",
  navy: "#000080",
  oldlace: "#fdf5e6",
  olive: "#808000",
  olivedrab: "#6b8e23",
  orange: "#ffa500",
  orangered: "#ff4500",
  orchid: "#da70d6",
  palegoldenrod: "#eee8aa",
  palegreen: "#98fb98",
  paleturquoise: "#afeeee",
  palevioletred: "#db7093",
  papayawhip: "#ffefd5",
  peachpuff: "#ffdab9",
  peru: "#cd853f",
  pink: "#ffc0cb",
  plum: "#dda0dd",
  powderblue: "#b0e0e6",
  purple: "#800080",
  rebeccapurple: "#663399",
  red: "#ff0000",
  rosybrown: "#bc8f8f",
  royalblue: "#4169e1",
  saddlebrown: "#8b4513",
  salmon: "#fa8072",
  sandybrown: "#f4a460",
  seagreen: "#2e8b57",
  seashell: "#fff5ee",
  sienna: "#a0522d",
  silver: "#c0c0c0",
  skyblue: "#87ceeb",
  slateblue: "#6a5acd",
  slategray: "#708090",
  slategrey: "#708090",
  snow: "#fffafa",
  springgreen: "#00ff7f",
  steelblue: "#4682b4",
  tan: "#d2b48c",
  teal: "#008080",
  thistle: "#d8bfd8",
  tomato: "#ff6347",
  turquoise: "#40e0d0",
  violet: "#ee82ee",
  wheat: "#f5deb3",
  white: "#ffffff",
  whitesmoke: "#f5f5f5",
  yellow: "#ffff00",
  yellowgreen: "#9acd32"
};

/**
 * Physical properties and their logical equivalents.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_logical_properties_and_values
 */
export const PHYSICAL_PROPERTIES: Readonly<Record<string, string>> = {
  borderBottom: "borderBlockEnd",
  borderBottomColor: "borderBlockEndColor",
  borderBottomStyle: "borderBlockEndStyle",
  borderBottomWidth: "borderBlockEndWidth",
  borderTop: "borderBlockStart",
  borderTopColor: "borderBlockStartColor",
  borderTopStyle: "borderBlockStartStyle",
  borderTopWidth: "borderBlockStartWidth",
  borderRight: "borderInlineEnd",
  borderRightColor: "borderInlineEndColor",
  borderRightStyle: "borderInlineEndStyle",
  borderRightWidth: "borderInlineEndWidth",
  borderLeft: "borderInlineStart",
  borderLeftColor: "borderInlineStartColor",
  borderLeftStyle: "borderInlineStartStyle",
  borderLeftWidth: "borderInlineStartWidth",
  borderTopLeftRadius: "borderStartStartRadius",
  borderBottomLeftRadius: "borderEndStartRadius",
  borderTopRightRadius: "borderStartEndRadius",
  borderBottomRightRadius: "borderEndEndRadius",
  marginBottom: "marginBlockEnd",
  marginTop: "marginBlockStart",
  marginRight: "marginInlineEnd",
  marginLeft: "marginInlineStart",
  paddingBottom: "paddingBlockEnd",
  paddingTop: "paddingBlockStart",
  paddingRight: "paddingInlineEnd",
  paddingLeft: "paddingInlineStart",
  left: "insetInlineStart",
  right: "insetInlineEnd",
  top: "insetBlockStart",
  bottom: "insetBlockEnd"
};

/** Properties whose `left` / `right` values have logical equivalents. */
export const PHYSICAL_VALUES: Readonly<
  Record<string, Readonly<Record<string, string>>>
> = {
  textAlign: { left: "start", right: "end" },
  float: { left: "inline-start", right: "inline-end" },
  clear: { left: "inline-start", right: "inline-end" }
};

/** `background-color` → `backgroundColor`; custom properties are kept. */
export function toCamelCase(property: string): string {
  if (property.startsWith("--")) {
    return property;
  }

  return property
    .replace(/^-ms-/, "ms-")
    .replace(/-([a-z])/g, (_, char: string) => char.toUpperCase());
}

/** `backgroundColor` → `background-color`. */
export function toKebabCase(property: string): string {
  if (property.startsWith("--")) {
    return property;
  }

  return property
    .replace(/[A-Z]/g, char => `-${char.toLowerCase()}`)
    .replace(/^ms-/, "-ms-");
}

/** A whitespace / comma separated part of a value, with its offset. */
export interface ValuePart {
  text: string;
  start: number;
}

/** Split a value on whitespace and commas outside parentheses and quotes. */
export function splitParts(value: string): ValuePart[] {
  const parts: ValuePart[] = [];
  let depth = 0;
  let quote: string | undefined;
  let start = -1;

  const flush = (end: number) => {
    if (start >= 0) {
      parts.push({ text: value.slice(start, end), start });
      start = -1;
    }
  };

  for (let index = 0; index < value.length; index++) {
    const char = value[index]!;
    if (quote) {
      if (char === quote) {
        quote = undefined;
      }
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === "(") {
      depth++;
    } else if (char === ")") {
      depth = Math.max(depth - 1, 0);
    } else if (depth === 0 && (/\s/.test(char) || char === ",")) {
      flush(index);
      continue;
    }
    if (start < 0) {
      start = index;
    }
  }
  flush(value.length);

  return parts;
}

/** Split a value into comma-separated layers (`transition: a 1s, b 2s`). */
export function splitLayers(value: string): string[] {
  const layers: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of value) {
    if (char === "(") {
      depth++;
    } else if (char === ")") {
      depth = Math.max(depth - 1, 0);
    }
    if (char === "," && depth === 0) {
      layers.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  layers.push(current.trim());

  return layers.filter(Boolean);
}

export function isFunctionCall(part: string): boolean {
  return /^-?[a-z][\w-]*\(/i.test(part);
}

export function isKeyword(part: string): boolean {
  return VALUE_KEYWORDS.has(part.toLowerCase());
}

/** `var(--x)` / `env(--x)` — a reference, never a literal. */
export function isReference(part: string): boolean {
  return /^(?:var|env)\(/i.test(part);
}

const DIMENSION = /^(-?(?:\d+(?:\.\d*)?|\.\d+))([a-z%]*)$/i;

export interface Dimension {
  value: number;
  unit: string;
}

export function parseDimension(part: string): Dimension | undefined {
  const match = DIMENSION.exec(part.trim());
  if (!match) {
    return undefined;
  }

  return { value: Number(match[1]), unit: match[2]!.toLowerCase() };
}

const LENGTH_UNITS = new Set([
  "px",
  "rem",
  "em",
  "pt",
  "ch",
  "ex",
  "vh",
  "vw",
  "vmin",
  "vmax",
  "dvh",
  "dvw",
  "svh",
  "svw",
  "lvh",
  "lvw"
]);

/** A non-zero length (`13px`, `1.5rem`) or a unitless non-zero number. */
export function isLengthLiteral(part: string): boolean {
  const dimension = parseDimension(part);

  return (
    !!dimension &&
    dimension.value !== 0 &&
    (dimension.unit === "" || LENGTH_UNITS.has(dimension.unit))
  );
}

function formatNumber(value: number): string {
  return String(Number(value.toFixed(4)));
}

/**
 * Normalize a length to pixels (`1rem` → `16px`); unitless numbers are
 * React-style pixel values.
 */
export function normalizeLength(input: string | number): string | undefined {
  if (typeof input === "number") {
    return `${formatNumber(input)}px`;
  }

  const dimension = parseDimension(input);
  if (!dimension) {
    return undefined;
  }
  if (dimension.value === 0) {
    return "0px";
  }

  switch (dimension.unit) {
    case "":
    case "px":
      return `${formatNumber(dimension.value)}px`;
    case "rem":
    case "em":
      return `${formatNumber(dimension.value * ROOT_FONT_SIZE)}px`;
    default:
      return `${formatNumber(dimension.value)}${dimension.unit}`;
  }
}

export function normalizeNumber(input: string | number): string | undefined {
  const value = typeof input === "number" ? input : Number(input);

  return Number.isFinite(value) && String(input).trim() !== ""
    ? formatNumber(value)
    : undefined;
}

/** `200ms` / `.2s` → milliseconds. */
export function parseDuration(part: string): number | undefined {
  const dimension = parseDimension(part);
  if (!dimension) {
    return undefined;
  }
  if (dimension.unit === "ms") {
    return dimension.value;
  }
  if (dimension.unit === "s") {
    return dimension.value * 1000;
  }

  return undefined;
}

export function normalizeDuration(input: string | number): string | undefined {
  const ms = typeof input === "number" ? input : parseDuration(input);

  return ms === undefined ? undefined : `${formatNumber(ms)}ms`;
}

const EASING_KEYWORDS = new Set([
  "ease",
  "ease-in",
  "ease-out",
  "ease-in-out",
  "linear",
  "step-start",
  "step-end"
]);

export function isEasingLiteral(part: string): boolean {
  return (
    EASING_KEYWORDS.has(part.toLowerCase()) ||
    /^(?:cubic-bezier|steps|linear)\(/i.test(part)
  );
}

export function normalizeEasing(input: string): string {
  return input.toLowerCase().replaceAll(/\s+/g, "").replaceAll(",", ", ");
}

const FONT_WEIGHT_KEYWORDS: Readonly<Record<string, string>> = {
  normal: "400",
  bold: "700"
};

export function normalizeFontWeight(
  input: string | number
): string | undefined {
  const text = String(input).trim().toLowerCase();

  return FONT_WEIGHT_KEYWORDS[text] ?? normalizeNumber(text);
}

/** First family of a `font-family` list, unquoted and lowercased. */
export function normalizeFontFamily(input: string): string {
  const [first = ""] = input.split(",");

  return first
    .trim()
    .replaceAll(/^["']|["']$/g, "")
    .toLowerCase();
}

export function normalizeWhitespace(input: string): string {
  return input.trim().toLowerCase().replaceAll(/\s+/g, " ");
}

function clampByte(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)));
}

function toHex(channels: number[], alpha: number): string {
  return `#${[...channels, alpha * 255]
    .map(channel => clampByte(channel).toString(16).padStart(2, "0"))
    .join("")}`;
}

function parseChannel(text: string, scale: number): number {
  return text.endsWith("%")
    ? (Number.parseFloat(text) / 100) * scale
    : Number.parseFloat(text);
}

function parseAlpha(text: string | undefined): number {
  if (text === undefined) {
    return 1;
  }

  return text.endsWith("%")
    ? Number.parseFloat(text) / 100
    : Number.parseFloat(text);
}

function hslToRgb(h: number, s: number, l: number): number[] {
  const hue = (((h % 360) + 360) % 360) / 360;
  const sat = s / 100;
  const light = l / 100;
  if (sat === 0) {
    return [light * 255, light * 255, light * 255];
  }

  const q = light < 0.5 ? light * (1 + sat) : light + sat - light * sat;
  const p = 2 * light - q;
  const channel = (t: number) => {
    const n = t < 0 ? t + 1 : t > 1 ? t - 1 : t;
    if (n < 1 / 6) {
      return p + (q - p) * 6 * n;
    }
    if (n < 1 / 2) {
      return q;
    }
    if (n < 2 / 3) {
      return p + (q - p) * (2 / 3 - n) * 6;
    }
    return p;
  };

  return [
    channel(hue + 1 / 3) * 255,
    channel(hue) * 255,
    channel(hue - 1 / 3) * 255
  ];
}

/**
 * Normalize a CSS color to `#rrggbbaa` (hex, `rgb()`, `hsl()`, named colors);
 * other color spaces are compared as lowercased, whitespace-collapsed text.
 */
export function normalizeColor(input: string): string | undefined {
  const text = input.trim().toLowerCase();
  if (!text) {
    return undefined;
  }

  const named = NAMED_COLORS[text];
  if (named) {
    return `${named}ff`;
  }

  const hex = /^#([0-9a-f]{3,8})$/.exec(text)?.[1];
  if (hex) {
    if (hex.length === 3 || hex.length === 4) {
      const expanded = [...hex].map(char => char + char).join("");

      return `#${expanded.padEnd(8, "f")}`;
    }
    if (hex.length === 6 || hex.length === 8) {
      return `#${hex.padEnd(8, "f")}`;
    }
    return undefined;
  }

  const fn = /^(rgba?|hsla?)\((.*)\)$/.exec(text);
  if (fn) {
    const [channels = "", alpha] = fn[2]!.split("/").map(part => part.trim());
    const values = channels.split(/[\s,]+/).filter(Boolean);
    const alphaText = alpha ?? values[3];
    if (values.length < 3) {
      return undefined;
    }
    if (fn[1]!.startsWith("rgb")) {
      return toHex(
        values.slice(0, 3).map(value => parseChannel(value, 255)),
        parseAlpha(alphaText)
      );
    }
    return toHex(
      hslToRgb(
        Number.parseFloat(values[0]!),
        Number.parseFloat(values[1]!),
        Number.parseFloat(values[2]!)
      ),
      parseAlpha(alphaText)
    );
  }

  return text.replaceAll(/\s+/g, " ").replaceAll(/\s*,\s*/g, ", ");
}

/** A color literal found inside a value. */
export interface ColorMatch {
  text: string;
  start: number;
  end: number;
}

const COLOR_PATTERN = new RegExp(
  [
    String.raw`#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b`,
    String.raw`\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\((?:[^()]|\([^()]*\))*\)`,
    String.raw`(?<![\w-])(?:${Object.keys(NAMED_COLORS).join("|")})(?![\w-])`
  ].join("|"),
  "gi"
);

/** Ranges of `var()` / `env()` / `url()` calls, whose contents are skipped. */
function referenceRanges(value: string): [number, number][] {
  const ranges: [number, number][] = [];
  for (const match of value.matchAll(/\b(?:var|env|url)\(/gi)) {
    let depth = 0;
    for (let index = match.index; index < value.length; index++) {
      if (value[index] === "(") {
        depth++;
      } else if (value[index] === ")" && --depth === 0) {
        ranges.push([match.index, index + 1]);
        break;
      }
    }
  }

  return ranges;
}

/**
 * Color literals in a value (hex, color functions, named colors), skipping
 * `var()` fallbacks and `url()` contents.
 */
export function findColorLiterals(value: string): ColorMatch[] {
  const skip = referenceRanges(value);

  return [...value.matchAll(COLOR_PATTERN)]
    .filter(
      match =>
        !skip.some(([start, end]) => match.index >= start && match.index < end)
    )
    .map(match => ({
      text: match[0],
      start: match.index,
      end: match.index + match[0].length
    }));
}
