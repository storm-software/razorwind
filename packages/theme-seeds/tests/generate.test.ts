import { describe, expect, it } from "vitest";
import { generateThemeTokens } from "../src/generate";

const darkSeeds = {
  hue: 250,
  chroma: 0.12,
  warmth: -0.4,
  energy: 0.6,
  density: 1,
  appearance: "dark",
  lightness: 0
} as const;

describe("generateThemeTokens", () => {
  it("generates self-contained dark DTCG tokens", () => {
    const tokens = generateThemeTokens(darkSeeds) as any;

    expect(tokens.surface.page).toEqual({
      $type: "color",
      $value: { colorSpace: "oklch", components: [0.17, 0.0116, 220] }
    });
    expect(tokens.surface.veil.$value).toEqual({
      colorSpace: "oklch",
      components: [0.1, 0.0116, 220],
      alpha: 0.62
    });
    expect(tokens.ink.faint.$value.components).toEqual([0.66, 0.012, 220]);
    expect(tokens.accent.DEFAULT.$value.components).toEqual([
      0.8112, 0.12, 250
    ]);
    expect(tokens.accent.strong.$value.components).toEqual([
      0.8712, 0.132, 250
    ]);
    expect(tokens.status.warning.soft.$value.alpha).toBe(0.15);
    expect(tokens.shadow.color.$value).toEqual({
      colorSpace: "oklch",
      components: [0.05, 0.01, 220],
      alpha: 0.5
    });
    expect(tokens.motion).toMatchObject({
      instant: { $value: { value: 79, unit: "ms" } },
      fast: { $value: { value: 158, unit: "ms" } },
      base: { $value: { value: 257, unit: "ms" } },
      slow: { $value: { value: 475, unit: "ms" } }
    });
    expect(tokens.radius).toMatchObject({
      interactive: { $value: { value: 0.6, unit: "rem" } },
      surface: { $value: { value: 0.9, unit: "rem" } },
      overlay: { $value: { value: 1.44, unit: "rem" } }
    });
    expect(tokens.control.height.md.$value).toEqual({
      value: 2.5,
      unit: "rem"
    });
    expect(tokens.surface.padding.$value).toEqual({ value: 1.5, unit: "rem" });
    expect(tokens.density).toEqual({ $type: "number", $value: 1 });
    expect(JSON.stringify(tokens)).not.toMatch(/var\(|strata|"\{[^"]+\}"/i);
  });

  it("generates self-contained light DTCG tokens", () => {
    const tokens = generateThemeTokens({
      hue: 40,
      chroma: 0.2,
      warmth: 0.8,
      energy: 0.75,
      density: 1.1,
      appearance: "light"
    }) as any;

    expect(tokens.surface.page.$value.components).toEqual([0.97, 0.0172, 108]);
    expect(tokens.accent.DEFAULT.$value.components).toEqual([0.532, 0.174, 40]);
    expect(tokens.status.warning.DEFAULT.$value.components).toEqual([
      0.63, 0.14, 75
    ]);
    expect([
      tokens.motion.instant.$value.value,
      tokens.motion.fast.$value.value,
      tokens.motion.base.$value.value,
      tokens.motion.slow.$value.value
    ]).toEqual([69, 138, 224, 414]);
    expect(tokens.radius.interactive.$value).toEqual({
      value: 0.656,
      unit: "rem"
    });
    expect(tokens.surface.padding.$value).toEqual({
      value: 1.65,
      unit: "rem"
    });
  });

  it.each([
    [-110, 250],
    [610, 250]
  ])("wraps hue %s to %s", (hue, expectedHue) => {
    const tokens = generateThemeTokens({ ...darkSeeds, hue }) as any;
    expect(tokens.accent.DEFAULT.$value.components[2]).toBe(expectedHue);
  });

  it("clamps finite seeds and defaults lightness to zero", () => {
    const tokens = generateThemeTokens({
      hue: 250,
      chroma: 1,
      warmth: -2,
      energy: 2,
      density: 0,
      appearance: "dark"
    }) as any;

    expect(tokens.accent.DEFAULT.$value.components[1]).toBe(0.25);
    expect(tokens.density.$value).toBe(0.85);
    expect(tokens.radius.interactive.$value.value).toBe(0.75);
    expect(tokens.surface.page.$value.components[0]).toBe(0.17);
  });

  it("keeps monochrome accents readable", () => {
    const dark = generateThemeTokens({ ...darkSeeds, chroma: 0 }) as any;
    const light = generateThemeTokens({
      ...darkSeeds,
      chroma: 0,
      appearance: "light"
    }) as any;

    expect(dark.accent.DEFAULT.$value.components[0]).toBe(0.93);
    expect(light.accent.DEFAULT.$value.components[0]).toBe(0.3);
  });

  it.each([
    ["hue", Number.NaN],
    ["chroma", Number.POSITIVE_INFINITY],
    ["warmth", "warm"],
    ["energy", undefined],
    ["density", null],
    ["lightness", Number.NEGATIVE_INFINITY]
  ])("rejects an invalid %s seed", (key, value) => {
    const input = { ...darkSeeds, [key]: value } as unknown as typeof darkSeeds;

    expect(() => generateThemeTokens(input)).toThrow(
      `Theme seed "${key}" must be a finite number.`
    );
  });

  it("rejects an invalid appearance", () => {
    const input = {
      ...darkSeeds,
      appearance: "dim"
    } as unknown as typeof darkSeeds;

    expect(() => generateThemeTokens(input)).toThrow(
      'Theme seed "appearance" must be "dark" or "light".'
    );
  });
});
