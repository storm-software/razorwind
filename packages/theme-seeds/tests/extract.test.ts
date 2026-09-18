import type { Schema, Tokens } from "@razorwind/core/schema";
import { describe, expect, it } from "vitest";
import themeSeeds from "../src/extract";

const seeds = {
  hue: 220,
  chroma: 0.1,
  warmth: -0.8,
  energy: 0.2,
  density: 1.05,
  appearance: "light"
} as const;

function schema(tokens: Tokens | Record<string, Tokens> = {}): Schema {
  return { tokens, components: {}, icons: {}, fonts: {} } as Schema;
}

describe("theme-seeds extractor", () => {
  it("defines the theme-seeds extraction plugin", () => {
    const plugin = themeSeeds(seeds);

    expect(plugin.name).toBe("theme-seeds");
    expect(typeof plugin.extract).toBe("function");
  });

  it("generates the complete base when existing tokens are empty", async () => {
    const plugin = themeSeeds(seeds);
    const result = await plugin.extract!(schema(), {} as never);

    expect((result.tokens as any).surface.page.$type).toBe("color");
    expect((result.tokens as any).motion.fast.$type).toBe("duration");
  });

  it("keeps existing leaves and metadata without losing generated siblings", async () => {
    const existing = {
      surface: {
        $description: "Product surfaces",
        page: { $value: "#123456", $description: "Owned" }
      }
    } as unknown as Tokens;
    const before = structuredClone(existing);
    const plugin = themeSeeds(seeds);
    const result = await plugin.extract!(schema(existing), {} as never);
    const tokens = result.tokens as any;

    expect(tokens.surface.$description).toBe("Product surfaces");
    expect(tokens.surface.page).toEqual(existing.surface.page);
    expect(tokens.surface.page.$type).toBeUndefined();
    expect(tokens.surface.raised.$type).toBe("color");
    expect(existing).toEqual(before);
    expect(result.tokens).not.toBe(existing);
  });

  it("merges the generated base beneath every existing theme", async () => {
    const dark = {
      accent: { DEFAULT: { $value: "#111111" } }
    } as unknown as Tokens;
    const light = {
      surface: { page: { $value: "#fafafa" } }
    } as unknown as Tokens;
    const input = { dark, light };
    const before = structuredClone(input);
    const plugin = themeSeeds(seeds);
    const result = await plugin.extract!(schema(input), {} as never);
    const tokens = result.tokens as Record<string, any>;

    expect(tokens.dark.accent.DEFAULT.$value).toBe("#111111");
    expect(tokens.dark.accent.DEFAULT.$type).toBeUndefined();
    expect(tokens.dark.surface.page.$type).toBe("color");
    expect(tokens.light.surface.page.$value).toBe("#fafafa");
    expect(tokens.light.motion.fast.$type).toBe("duration");
    expect(input).toEqual(before);
    expect(tokens.dark).not.toBe(dark);
    expect(tokens.light).not.toBe(light);
  });

  it("treats ordinary top-level token groups as one tree", async () => {
    const input = {
      color: { brand: { $value: "#123456" } }
    } as unknown as Tokens;
    const plugin = themeSeeds(seeds);
    const result = await plugin.extract!(schema(input), {} as never);

    expect((result.tokens as any).color.brand.$value).toBe("#123456");
    expect((result.tokens as any).surface.page.$type).toBe("color");
  });
});
