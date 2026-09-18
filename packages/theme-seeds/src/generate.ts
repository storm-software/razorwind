import type { Token, Tokens } from "@razorwind/core/schema";
import type { NormalizedThemeSeeds, ThemeSeeds } from "./types";
import { SEED_RANGES } from "./types";

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

function lerp(start: number, end: number, amount: number): number {
  return start + (end - start) * amount;
}

function round(value: number, precision: number): number {
  return Number(value.toFixed(precision));
}

function requireFiniteSeed(name: keyof ThemeSeeds, value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`Theme seed "${name}" must be a finite number.`);
  }

  return value;
}

function normalizeSeeds(seeds: ThemeSeeds): NormalizedThemeSeeds {
  const hue = requireFiniteSeed("hue", seeds.hue);
  const chroma = requireFiniteSeed("chroma", seeds.chroma);
  const warmth = requireFiniteSeed("warmth", seeds.warmth);
  const energy = requireFiniteSeed("energy", seeds.energy);
  const density = requireFiniteSeed("density", seeds.density);
  const lightness = requireFiniteSeed(
    "lightness",
    seeds.lightness === undefined ? 0 : seeds.lightness
  );

  if (seeds.appearance !== "dark" && seeds.appearance !== "light") {
    throw new TypeError('Theme seed "appearance" must be "dark" or "light".');
  }

  return {
    hue: ((hue % 360) + 360) % 360,
    chroma: clamp(chroma, ...SEED_RANGES.chroma),
    warmth: clamp(warmth, ...SEED_RANGES.warmth),
    energy: clamp(energy, ...SEED_RANGES.energy),
    density: clamp(density, ...SEED_RANGES.density),
    appearance: seeds.appearance,
    lightness: clamp(lightness, ...SEED_RANGES.lightness)
  };
}

function color(
  lightness: number,
  chroma: number,
  hue: number,
  alpha?: number
): Token {
  return {
    $type: "color",
    $value: {
      colorSpace: "oklch",
      components: [round(lightness, 4), round(chroma, 4), round(hue, 4)],
      ...(alpha === undefined ? {} : { alpha: round(alpha, 4) })
    }
  } as Token;
}

function duration(value: number): Token {
  return {
    $type: "duration",
    $value: { value: Math.round(value), unit: "ms" }
  } as Token;
}

function dimension(value: number, precision = 3): Token {
  return {
    $type: "dimension",
    $value: { value: round(value, precision), unit: "rem" }
  } as Token;
}

export function generateThemeTokens(seeds: ThemeSeeds): Tokens {
  const normalized = normalizeSeeds(seeds);
  const { hue, chroma, warmth, energy, density, appearance, lightness } =
    normalized;
  const mono = 1 - clamp(chroma / 0.04, 0, 1);
  const neutralHue =
    warmth >= 0 ? lerp(200, 85, warmth) : lerp(200, 250, -warmth);
  const neutralChroma = 0.006 + Math.abs(warmth) * 0.014;

  let surface: Record<string, Token>;
  let ink: Record<string, Token>;
  let accent: Record<string, Token>;
  let line: Record<string, Token>;
  let focus: Record<string, Token>;
  let status: Record<string, Record<string, Token>>;
  let shadow: Record<string, Token>;

  if (appearance === "dark") {
    const pageLightness = 0.17 + lightness * 0.1;
    const accentLightness =
      lerp(lerp(0.84, 0.78, chroma / 0.25), 0.93, mono) +
      0.04 * Math.max(0, lightness);

    surface = {
      page: color(pageLightness, neutralChroma, neutralHue),
      sunken: color(
        Math.max(0.04, pageLightness - 0.03),
        neutralChroma * 0.9,
        neutralHue
      ),
      raised: color(pageLightness + 0.04, neutralChroma * 1.1, neutralHue),
      overlay: color(pageLightness + 0.07, neutralChroma * 1.2, neutralHue),
      veil: color(
        Math.max(0.03, pageLightness - 0.07),
        neutralChroma,
        neutralHue,
        0.62
      )
    };
    ink = {
      DEFAULT: color(0.94, 0.008, neutralHue),
      muted: color(0.72, 0.012, neutralHue),
      faint: color(Math.min(0.66, pageLightness + 0.51), 0.012, neutralHue),
      inverse: color(0.16, 0.01, neutralHue)
    };
    accent = {
      DEFAULT: color(accentLightness, chroma, hue),
      strong: color(accentLightness + 0.06, chroma * 1.1, hue),
      ink: color(0.16, Math.min(chroma * 0.35, 0.06), hue),
      soft: color(accentLightness, chroma, hue, 0.14),
      line: color(accentLightness, chroma, hue, 0.45)
    };
    line = {
      DEFAULT: color(0.94, 0.008, neutralHue, 0.12),
      strong: color(0.94, 0.008, neutralHue, 0.24)
    };
    focus = { ring: color(accentLightness, chroma, hue, 0.7) };
    status = {
      positive: {
        DEFAULT: color(0.78, 0.16, 150),
        soft: color(0.78, 0.16, 150, 0.15)
      },
      warning: {
        DEFAULT: color(0.82, 0.15, 80),
        soft: color(0.82, 0.15, 80, 0.15)
      },
      danger: {
        DEFAULT: color(0.68, 0.19, 22),
        soft: color(0.68, 0.19, 22, 0.15)
      }
    };
    shadow = { color: color(0.05, 0.01, neutralHue, 0.5) };
  } else {
    const pageLightness =
      0.97 + (lightness < 0 ? lightness * 0.09 : lightness * 0.015);
    const accentLightness =
      lerp(lerp(0.58, 0.52, chroma / 0.25), 0.3, mono) -
      0.06 * Math.max(0, -lightness);
    const accentChroma = chroma * 0.87;
    const statusFloor = 0.07 * Math.max(0, -lightness);

    surface = {
      page: color(pageLightness, neutralChroma, neutralHue),
      sunken: color(pageLightness - 0.03, neutralChroma * 1.1, neutralHue),
      raised: color(
        Math.min(0.995, pageLightness + 0.025),
        neutralChroma * 0.5,
        neutralHue
      ),
      overlay: color(Math.min(1, pageLightness + 0.03), 0, 0),
      veil: color(0.3, 0.01, neutralHue, 0.4)
    };
    ink = {
      DEFAULT: color(0.24, 0.015, neutralHue),
      muted: color(0.45, 0.015, neutralHue),
      faint: color(Math.max(0.51, pageLightness - 0.46), 0.012, neutralHue),
      inverse: color(0.97, 0.005, neutralHue)
    };
    accent = {
      DEFAULT: color(accentLightness, accentChroma, hue),
      strong: color(accentLightness - 0.08, accentChroma, hue),
      ink: color(0.98, 0.01, hue),
      soft: color(accentLightness, accentChroma, hue, 0.12),
      line: color(accentLightness, accentChroma, hue, 0.4)
    };
    line = {
      DEFAULT: color(0.24, 0.015, neutralHue, 0.13),
      strong: color(0.24, 0.015, neutralHue, 0.28)
    };
    focus = { ring: color(accentLightness, accentChroma, hue, 0.65) };
    status = {
      positive: {
        DEFAULT: color(0.6 - statusFloor, 0.15, 150),
        soft: color(0.6 - statusFloor, 0.15, 150, 0.13)
      },
      warning: {
        DEFAULT: color(0.63 - statusFloor * 1.07, 0.14, 75),
        soft: color(0.63 - statusFloor * 1.07, 0.14, 75, 0.15)
      },
      danger: {
        DEFAULT: color(0.55, 0.19, 22),
        soft: color(0.55, 0.19, 22, 0.12)
      }
    };
    shadow = { color: color(0.3, 0.02, neutralHue, 0.18) };
  }

  const speed = lerp(1.5, 0.65, energy);
  const radius = lerp(0.375, 0.75, energy);

  return {
    surface: {
      ...surface,
      padding: dimension(1.5 * density, 4)
    },
    ink,
    accent,
    line,
    focus,
    status,
    shadow,
    motion: {
      instant: duration(80 * speed),
      fast: duration(160 * speed),
      base: duration(260 * speed),
      slow: duration(480 * speed)
    },
    density: {
      $type: "number",
      $value: round(density, 3)
    },
    radius: {
      interactive: dimension(radius),
      surface: dimension(radius * 1.5),
      overlay: dimension(radius * 2.4)
    },
    control: {
      height: {
        sm: dimension(2 * density, 4),
        md: dimension(2.5 * density, 4),
        lg: dimension(3 * density, 4)
      },
      padding: {
        x: dimension(density, 4)
      }
    },
    stack: {
      gap: dimension(density, 4)
    }
  } satisfies Tokens;
}
