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

import type { Schema, Tokens } from "@razorwind/core/schema";
import { describe, expect, it } from "vitest";
import { flattenTokens, resolveTokenSets } from "../src/flatten";
import { formatTokenValue } from "../src/format";
import {
  generateShikiTheme,
  normalizeThemes,
  renderThemeJson
} from "../src/generate";
import shiki, { type ShikiTheme } from "../src/index";

const tokens = {
  color: {
    $type: "color",
    bg: {
      $value: {
        colorSpace: "srgb",
        components: [0.05, 0.05, 0.07],
        hex: "#0d0d12"
      }
    },
    fg: {
      $value: "#e8e8ed"
    },
    accent: {
      $value: "#0066cc"
    },
    muted: {
      $value: "#6a6a7a"
    }
  }
} satisfies Tokens;

const multiThemeTokens = {
  dark: tokens,
  light: {
    color: {
      $type: "color",
      bg: { $value: "#ffffff" },
      fg: { $value: "#111111" },
      accent: { $value: "#0066cc" },
      muted: { $value: "#888888" }
    }
  }
} satisfies Record<string, Tokens>;

const spec = {
  components: {},
  icons: {}, fonts: {},
  tokens
} as Schema;

function mapDarkTheme(): ShikiTheme {
  return {
    name: "demo-dark",
    displayName: "Demo Dark",
    type: "dark",
    bg: "#0d0d12",
    fg: "#e8e8ed",
    colors: {
      "editor.background": "#0d0d12",
      "editor.foreground": "#e8e8ed"
    },
    settings: [
      {
        scope: ["comment"],
        settings: { foreground: "#6a6a7a", fontStyle: "italic" }
      },
      {
        scope: ["string"],
        settings: { foreground: "#0066cc" }
      }
    ]
  };
}

describe("formatTokenValue", () => {
  it("formats DTCG color values to hex", () => {
    expect(
      formatTokenValue(
        {
          colorSpace: "srgb",
          components: [0.05, 0.05, 0.07],
          hex: "#0d0d12"
        },
        "color"
      )
    ).toBe("#0d0d12");
  });
});

describe("flattenTokens / resolveTokenSets", () => {
  it("walks nested DTCG tokens", () => {
    const flat = flattenTokens(tokens);
    expect(flat.map(token => token.path)).toEqual(
      expect.arrayContaining([
        "color.bg",
        "color.fg",
        "color.accent",
        "color.muted"
      ])
    );
    expect(flat.find(token => token.path === "color.bg")?.cssValue).toBe(
      "#0d0d12"
    );
  });

  it("splits multi-theme records", () => {
    const sets = resolveTokenSets(multiThemeTokens);
    expect(sets.map(set => set.id).sort()).toEqual(["dark", "light"]);
  });
});

describe("normalizeThemes", () => {
  it("accepts a single theme, array, or record", () => {
    const single = mapDarkTheme();
    expect(normalizeThemes(single)).toHaveLength(1);
    expect(
      normalizeThemes([
        single,
        { ...single, name: "demo-light", type: "light" }
      ])
    ).toHaveLength(2);
    expect(
      normalizeThemes({
        dark: single,
        light: { ...single, name: "demo-light", type: "light" }
      })
    ).toHaveLength(2);
  });

  it("rejects themes without name", () => {
    expect(() => normalizeThemes([{ settings: [] } as unknown as ShikiTheme])).toThrow(
      /must be a ShikiTheme/
    );
    expect(() =>
      normalizeThemes({ bad: { settings: [] } as unknown as ShikiTheme })
    ).toThrow(/must be a ShikiTheme/);
  });
});

describe("renderThemeJson", () => {
  it("writes Shiki TextMate theme JSON with settings", () => {
    const json = JSON.parse(renderThemeJson(mapDarkTheme()));
    expect(json.name).toBe("demo-dark");
    expect(json.type).toBe("dark");
    expect(json.bg).toBe("#0d0d12");
    expect(json.fg).toBe("#e8e8ed");
    expect(json.settings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          scope: ["comment"],
          settings: expect.objectContaining({ foreground: "#6a6a7a" })
        })
      ])
    );
  });

  it("falls back tokenColors to settings when settings omitted", () => {
    const json = JSON.parse(
      renderThemeJson({
        name: "token-colors-only",
        tokenColors: [
          { scope: ["keyword"], settings: { foreground: "#ff0000" } }
        ]
      })
    );
    expect(json.settings).toEqual([
      { scope: ["keyword"], settings: { foreground: "#ff0000" } }
    ]);
    expect(json.tokenColors).toBeUndefined();
  });
});

describe("shiki plugin", () => {
  it("is a Razorwind Plugin", () => {
    const plugin = shiki({ mapTheme: mapDarkTheme });
    expect(plugin.name).toBe("shiki");
    expect(typeof plugin.generate).toBe("function");
  });

  it("requires options", async () => {
    const plugin = shiki();
    await expect(plugin.generate!(spec, {} as never)).rejects.toThrow(
      /requires options/
    );
  });

  it("requires mapTheme", () => {
    expect(() =>
      generateShikiTheme(spec, {} as never)
    ).toThrow(/requires options.mapTheme/);
  });

  it("generates Shiki theme JSON files", async () => {
    const plugin = shiki({
      outputPath: "out/shiki",
      mapTheme: input => {
        const flat = flattenTokens(input);
        const color = (path: string) =>
          flat.find(token => token.path === path)?.cssValue ?? "#000000";

        return {
          name: "demo-theme",
          type: "dark",
          bg: color("color.bg"),
          fg: color("color.fg"),
          settings: [
            {
              scope: ["comment"],
              settings: { foreground: color("color.muted") }
            },
            {
              scope: ["string"],
              settings: { foreground: color("color.accent") }
            }
          ]
        };
      }
    });

    const documents = await plugin.generate!(spec, {} as never);
    const paths = Object.keys(documents).sort();

    expect(paths).toEqual([
      "out/shiki/INSTALL.md",
      "out/shiki/demo-theme.json"
    ]);

    const theme = JSON.parse(
      documents["out/shiki/demo-theme.json"]!.chunks![0]!.content
    );
    expect(theme.name).toBe("demo-theme");
    expect(theme.bg).toBe("#0d0d12");
    expect(theme.fg).toBe("#e8e8ed");
    expect(theme.settings).toEqual([
      {
        scope: ["comment"],
        settings: { foreground: "#6a6a7a" }
      },
      {
        scope: ["string"],
        settings: { foreground: "#0066cc" }
      }
    ]);
  });

  it("generateShikiTheme mirrors plugin generate output", () => {
    const documents = generateShikiTheme(spec, {
      mapTheme: mapDarkTheme
    });

    expect(documents["shiki-themes/demo-dark.json"]).toBeDefined();
    expect(documents["shiki-themes/INSTALL.md"]).toBeDefined();
    const theme = JSON.parse(
      documents["shiki-themes/demo-dark.json"]!.chunks![0]!.content
    );
    expect(theme.name).toBe("demo-dark");
  });

  it("emits one file per mapped theme", () => {
    const documents = generateShikiTheme(
      { ...spec, tokens: multiThemeTokens } as Schema,
      {
        mapTheme: input => {
          const sets = resolveTokenSets(input);
          return sets.map(set => {
            const flat = flattenTokens(set.tokens);
            const color = (path: string) =>
              flat.find(token => token.path === path)?.cssValue ?? "#000000";
            return {
              name: `demo-${set.id}`,
              type: set.id === "light" ? ("light" as const) : ("dark" as const),
              bg: color("color.bg"),
              fg: color("color.fg"),
              settings: []
            };
          });
        }
      }
    );

    expect(Object.keys(documents).sort()).toEqual([
      "shiki-themes/INSTALL.md",
      "shiki-themes/demo-dark.json",
      "shiki-themes/demo-light.json"
    ]);
  });
});
