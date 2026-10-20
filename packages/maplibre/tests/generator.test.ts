import type { Schema, Tokens } from "@razorwind/core/schema";
import { describe, expect, it } from "vitest";
import maplibre, {
  flattenTokens,
  generateMapLibreStyle,
  normalizeStyles,
  resolveTokenSets
} from "../src/index";

const tokens = {
  color: {
    canvas: { $type: "color", $value: "#101820" },
    water: { $type: "color", $value: "#1357a6" }
  }
} as Tokens;

const spec = { components: {}, icons: {}, fonts: {}, tokens } as Schema;

const style = {
  version: 8 as const,
  name: "Harbor Dark",
  sources: {
    places: {
      type: "geojson" as const,
      data: {
        type: "FeatureCollection" as const,
        features: []
      }
    }
  },
  layers: [
    {
      id: "background",
      type: "background" as const,
      paint: { "background-color": "#101820" }
    },
    {
      id: "water",
      type: "circle" as const,
      source: "places",
      paint: { "circle-color": "#1357a6" }
    }
  ]
};

describe("maplibre plugin", () => {
  it("maps tokens into a complete MapLibre style without changing style fields", async () => {
    const plugin = maplibre({
      outputPath: "out/maps",
      mapTheme: input => {
        const flat = flattenTokens(input);
        const color = (path: string) =>
          flat.find(token => token.path === path)?.cssValue;
        return {
          ...style,
          layers: [
            {
              ...style.layers[0]!,
              paint: { "background-color": color("color.canvas")! }
            },
            {
              ...style.layers[1]!,
              paint: { "circle-color": color("color.water")! }
            }
          ]
        };
      }
    });

    const documents = await plugin.generate!(spec, {} as never);
    expect(Object.keys(documents).sort()).toEqual([
      "out/maps/INSTALL.md",
      "out/maps/harbor-dark.json"
    ]);
    expect(
      JSON.parse(documents["out/maps/harbor-dark.json"]!.chunks![0]!.content!)
    ).toEqual(style);
    expect(documents["out/maps/INSTALL.md"]!.chunks![0]!.content).toContain(
      "map.setStyle(style)"
    );
  });

  it("emits separate files for mapped styles and handles colliding names", () => {
    const documents = generateMapLibreStyle(spec, {
      mapTheme: () => [style, { ...style, name: "Harbor-Dark" }]
    });
    expect(Object.keys(documents).sort()).toEqual([
      "maplibre-styles/INSTALL.md",
      "maplibre-styles/harbor-dark-2.json",
      "maplibre-styles/harbor-dark.json"
    ]);
  });

  it("uses record keys as names for unnamed styles", () => {
    const documents = generateMapLibreStyle(spec, {
      mapTheme: () => ({ dark: { version: 8, sources: {}, layers: [] } })
    });
    expect(documents["maplibre-styles/dark.json"]).toBeDefined();
    expect(
      JSON.parse(documents["maplibre-styles/dark.json"]!.chunks![0]!.content!)
    ).toMatchObject({ name: "dark" });
  });

  it("requires a complete valid style and a mapping", () => {
    expect(() => generateMapLibreStyle(spec, {} as never)).toThrow(
      /requires options.mapTheme/
    );
    expect(() => generateMapLibreStyle(spec, { mapTheme: () => [] })).toThrow(
      /returned no styles/
    );
    expect(() => normalizeStyles([{ ...style, name: "" }])).toThrow(/name/);
    expect(() =>
      generateMapLibreStyle(spec, {
        mapTheme: () => ({ ...style, version: 9 }) as never
      })
    ).toThrow(/invalid MapLibre style/);
    expect(() =>
      generateMapLibreStyle(spec, {
        mapTheme: () =>
          ({
            ...style,
            layers: [{ id: "bad", type: "fill", source: "missing" }]
          }) as never
      })
    ).toThrow(/invalid MapLibre style/);
  });

  it("passes token sets through helpers and preserves the full token record", () => {
    const multi = { light: tokens, dark: tokens } as Record<string, Tokens>;
    expect(resolveTokenSets(multi)).toHaveLength(2);
    const documents = generateMapLibreStyle(
      { ...spec, tokens: multi } as Schema,
      {
        mapTheme: input => {
          expect(input).toBe(multi);
          return style;
        }
      }
    );
    expect(documents["maplibre-styles/harbor-dark.json"]).toBeDefined();
  });
});
