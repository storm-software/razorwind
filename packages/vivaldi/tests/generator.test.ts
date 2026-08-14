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
  generateVivaldiTheme,
  normalizeThemes,
  renderSettingsJson,
  toVivaldiColor
} from "../src/generate";
import { renderInstallMd } from "../src/install";
import vivaldi, { type VivaldiTheme } from "../src/index";

const tokens = {
  color: {
    $type: "color",
    bg: {
      $value: {
        colorSpace: "srgb",
        components: [0.157, 0.165, 0.212],
        hex: "#282a36"
      }
    },
    fg: {
      $value: "#f8f8f2"
    },
    accent: {
      $value: "#44475a"
    },
    highlight: {
      $value: "#6590fd"
    },
    window: {
      $value: "#6272a4"
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
      accent: { $value: "#e0e0e0" },
      highlight: { $value: "#0066cc" },
      window: { $value: "#cccccc" }
    }
  }
} satisfies Record<string, Tokens>;

const spec = {
  components: {},
  icons: {},
  fonts: {},
  tokens
} as Schema;

function mapDraculaTheme(): VivaldiTheme {
  return {
    id: "84ab4b62-f96f-42bf-8dba-07a9cb2329cf",
    name: "Dracula Official",
    colorBg: "#282a36",
    colorFg: "#f8f8f2",
    colorAccentBg: "#44475a",
    colorHighlightBg: "#6590fd",
    colorWindowBg: "#6272a4",
    backgroundImage: "background.png"
  };
}

describe("formatTokenValue", () => {
  it("formats DTCG color values to hex", () => {
    expect(
      formatTokenValue(
        {
          colorSpace: "srgb",
          components: [0.157, 0.165, 0.212],
          hex: "#282a36"
        },
        "color"
      )
    ).toBe("#282a36");
  });
});

describe("toVivaldiColor", () => {
  it("normalizes hex colors", () => {
    expect(toVivaldiColor("282A36")).toBe("#282a36");
    expect(toVivaldiColor("#F8F8F2")).toBe("#f8f8f2");
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
        "color.highlight",
        "color.window"
      ])
    );
    expect(flat.find(token => token.path === "color.bg")?.cssValue).toBe(
      "#282a36"
    );
  });

  it("splits multi-theme records", () => {
    const sets = resolveTokenSets(multiThemeTokens);
    expect(sets.map(set => set.id).sort()).toEqual(["dark", "light"]);
  });
});

describe("normalizeThemes", () => {
  it("accepts a single theme, array, or record", () => {
    const single = mapDraculaTheme();
    expect(normalizeThemes(single)).toHaveLength(1);
    expect(
      normalizeThemes([
        single,
        { ...single, name: "Dracula Light", colorBg: "#ffffff" }
      ])
    ).toHaveLength(2);
    expect(
      normalizeThemes({
        dark: single,
        light: { ...single, name: "Dracula Light", colorBg: "#ffffff" }
      })
    ).toHaveLength(2);
  });

  it("rejects themes without required fields", () => {
    expect(() =>
      normalizeThemes([
        { name: "incomplete" } as unknown as VivaldiTheme
      ])
    ).toThrow(/must be a VivaldiTheme/);
    expect(() =>
      normalizeThemes({
        bad: { name: "incomplete" } as unknown as VivaldiTheme
      })
    ).toThrow(/must be a VivaldiTheme/);
  });
});

describe("renderSettingsJson", () => {
  it("writes Vivaldi settings.json with Dracula-like defaults", () => {
    const json = JSON.parse(renderSettingsJson(mapDraculaTheme()));
    expect(json.name).toBe("Dracula Official");
    expect(json.id).toBe("84ab4b62-f96f-42bf-8dba-07a9cb2329cf");
    expect(json.colorBg).toBe("#282a36");
    expect(json.colorFg).toBe("#f8f8f2");
    expect(json.colorAccentBg).toBe("#44475a");
    expect(json.colorHighlightBg).toBe("#6590fd");
    expect(json.colorWindowBg).toBe("#6272a4");
    expect(json.backgroundImage).toBe("background.png");
    expect(json.backgroundPosition).toBe("stretch");
    expect(json.engineVersion).toBe(1);
    expect(json.version).toBe(3);
    expect(json.transparencyTabBar).toBe(true);
  });

  it("generates a UUID when id is omitted", () => {
    const json = JSON.parse(
      renderSettingsJson({
        name: "Untitled",
        colorBg: "#000000",
        colorFg: "#ffffff"
      })
    );
    expect(json.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });
});

describe("renderInstallMd", () => {
  it("mentions theme folders and Vivaldi setup steps", () => {
    const md = renderInstallMd({
      themes: [
        {
          name: "Dracula Official",
          displayName: "Dracula Official",
          folderName: "dracula-official",
          backgroundImage: "background.png"
        }
      ]
    });

    expect(md).toContain("dracula-official/settings.json");
    expect(md).toContain("background.png");
    expect(md).toContain("Open Theme");
    expect(md).toContain("@razorwind/vivaldi");
  });
});

describe("vivaldi plugin", () => {
  it("is a Razorwind Plugin", () => {
    const plugin = vivaldi({ mapTheme: mapDraculaTheme });
    expect(plugin.name).toBe("vivaldi");
    expect(typeof plugin.generate).toBe("function");
  });

  it("requires options", async () => {
    const plugin = vivaldi();
    await expect(plugin.generate!(spec, {} as never)).rejects.toThrow(
      /requires options/
    );
  });

  it("requires mapTheme", () => {
    expect(() =>
      generateVivaldiTheme(spec, {} as never)
    ).toThrow(/requires options.mapTheme/);
  });

  it("generates Vivaldi theme folders", async () => {
    const plugin = vivaldi({
      outputPath: "out/vivaldi",
      mapTheme: input => {
        const flat = flattenTokens(input);
        const color = (path: string) =>
          flat.find(token => token.path === path)?.cssValue ?? "#000000";

        return {
          id: "test-theme-id",
          name: "Demo Theme",
          colorBg: color("color.bg"),
          colorFg: color("color.fg"),
          colorAccentBg: color("color.accent"),
          colorHighlightBg: color("color.highlight"),
          colorWindowBg: color("color.window")
        };
      }
    });

    const documents = await plugin.generate!(spec, {} as never);
    const paths = Object.keys(documents).sort();

    expect(paths).toEqual([
      "out/vivaldi/INSTALL.md",
      "out/vivaldi/demo-theme/settings.json"
    ]);

    const settings = JSON.parse(
      documents["out/vivaldi/demo-theme/settings.json"]!.chunks![0]!.content
    );
    expect(settings.name).toBe("Demo Theme");
    expect(settings.colorBg).toBe("#282a36");
    expect(settings.colorFg).toBe("#f8f8f2");
    expect(documents["out/vivaldi/INSTALL.md"]!.chunks![0]!.content).toContain(
      "demo-theme"
    );
  });

  it("generateVivaldiTheme mirrors plugin generate output", () => {
    const documents = generateVivaldiTheme(spec, {
      mapTheme: mapDraculaTheme
    });

    expect(documents["vivaldi-themes/dracula-official/settings.json"]).toBeDefined();
    expect(documents["vivaldi-themes/INSTALL.md"]).toBeDefined();
    const settings = JSON.parse(
      documents["vivaldi-themes/dracula-official/settings.json"]!.chunks![0]!
        .content
    );
    expect(settings.name).toBe("Dracula Official");
  });

  it("emits one folder per mapped theme", () => {
    const documents = generateVivaldiTheme(
      { ...spec, tokens: multiThemeTokens } as Schema,
      {
        mapTheme: input => {
          const sets = resolveTokenSets(input);
          return sets.map(set => {
            const flat = flattenTokens(set.tokens);
            const color = (path: string) =>
              flat.find(token => token.path === path)?.cssValue ?? "#000000";
            return {
              id: `00000000-0000-4000-8000-${set.id.padEnd(12, "0")}`,
              name: `Demo ${set.id}`,
              colorBg: color("color.bg"),
              colorFg: color("color.fg"),
              colorAccentBg: color("color.accent"),
              colorHighlightBg: color("color.highlight"),
              colorWindowBg: color("color.window")
            };
          });
        }
      }
    );

    expect(Object.keys(documents).sort()).toEqual([
      "vivaldi-themes/INSTALL.md",
      "vivaldi-themes/demo-dark/settings.json",
      "vivaldi-themes/demo-light/settings.json"
    ]);
  });
});
