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
  generateThunderbirdTheme,
  normalizeThemes,
  renderManifestJson,
  toThunderbirdRgb,
  toThunderbirdRgbString
} from "../src/generate";
import { renderInstallMd } from "../src/install";
import thunderbird, { type ThunderbirdTheme } from "../src/index";

const tokens = {
  color: {
    $type: "color",
    bg: {
      $value: "#282a36"
    },
    accent: {
      $value: "#44475a"
    },
    fg: {
      $value: "#f8f8f2"
    },
    muted: {
      $value: "#6272a4"
    },
    fieldBg: {
      $value: "#353956"
    },
    purple: {
      $value: "#714ba5"
    },
    tabLine: {
      $value: "#8b69be"
    },
    attention: {
      $value: "#bd93f9"
    },
    tabText: {
      $value: "#c7cad2"
    }
  }
} satisfies Tokens;

const multiThemeTokens = {
  dark: tokens,
  light: {
    color: {
      $type: "color",
      bg: { $value: "#ffffff" },
      accent: { $value: "#e0e0e0" },
      fg: { $value: "#111111" },
      muted: { $value: "#888888" },
      fieldBg: { $value: "#f5f5f5" },
      purple: { $value: "#663399" },
      tabLine: { $value: "#9966cc" },
      attention: { $value: "#7744aa" },
      tabText: { $value: "#333333" }
    }
  }
} satisfies Record<string, Tokens>;

const spec = {
  components: {},
  icons: {},
  fonts: {},
  tokens
} as Schema;

function mapDraculaTheme(): ThunderbirdTheme {
  return {
    name: "Dracula theme",
    displayName: "Dracula theme",
    description: "Dracula theme.",
    version: "1.0",
    gecko: {
      id: "maxfrei@web.de",
      strictMinVersion: "60.0"
    },
    icons: {
      "200": "icon.png"
    },
    colors: {
      button_background_active: [40, 42, 54],
      button_background_hover: [98, 114, 164],
      frame: [40, 42, 54],
      icons: [248, 248, 242],
      icons_attention: [189, 147, 249],
      ntp_background: [40, 42, 54],
      ntp_text: [248, 248, 242],
      popup: [40, 42, 54],
      popup_border: [113, 75, 165],
      popup_highlight: [68, 71, 90],
      popup_highlight_text: [248, 248, 242],
      popup_text: [255, 255, 255],
      sidebar: [40, 42, 54],
      sidebar_border: [98, 114, 164],
      sidebar_highlight: [68, 71, 90],
      sidebar_highlight_text: [248, 248, 242],
      sidebar_text: [248, 248, 242],
      tab_background_separator: [98, 114, 164],
      tab_background_text: [199, 202, 210],
      tab_line: [139, 105, 190],
      tab_loading: [98, 114, 164],
      tab_selected: [68, 71, 90],
      tab_text: [248, 248, 242],
      toolbar: [68, 71, 90],
      toolbar_bottom_separator: [68, 71, 90],
      toolbar_field: [53, 57, 86],
      toolbar_field_border: [98, 114, 164],
      toolbar_field_border_focus: [113, 75, 165],
      toolbar_field_highlight: [98, 114, 164],
      toolbar_field_highlight_text: [248, 248, 242],
      toolbar_field_separator: [98, 114, 164],
      toolbar_field_text: [255, 255, 255],
      toolbar_text: [255, 255, 255],
      toolbar_top_separator: [40, 42, 54],
      toolbar_vertical_separator: [98, 114, 164]
    }
  };
}

describe("formatTokenValue", () => {
  it("formats DTCG color values to hex", () => {
    expect(formatTokenValue("#282a36", "color")).toBe("#282a36");
  });
});

describe("toThunderbirdRgb / toThunderbirdRgbString", () => {
  it("converts hex strings to RGB tuples", () => {
    expect(toThunderbirdRgb("#f8f8f2")).toEqual([248, 248, 242]);
    expect(toThunderbirdRgb("44475a")).toEqual([68, 71, 90]);
  });

  it("formats RGB as Thunderbird rgb() strings", () => {
    expect(toThunderbirdRgbString("#282a36")).toBe("rgb(40, 42, 54)");
    expect(toThunderbirdRgbString([68, 71, 90])).toBe("rgb(68, 71, 90)");
  });

  it("clamps RGB tuple channels", () => {
    expect(toThunderbirdRgb([300, -5, 128.4])).toEqual([255, 0, 128]);
  });

  it("rejects invalid color strings", () => {
    expect(() => toThunderbirdRgb("not-a-color")).toThrow(/cannot convert color/);
  });
});

describe("flattenTokens / resolveTokenSets", () => {
  it("walks nested DTCG tokens", () => {
    const flat = flattenTokens(tokens);
    expect(flat.map(token => token.path)).toEqual(
      expect.arrayContaining([
        "color.bg",
        "color.accent",
        "color.fg",
        "color.muted",
        "color.fieldBg"
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
        {
          ...single,
          name: "Dracula Light",
          gecko: { id: "light@example.com" },
          colors: { frame: "#ffffff" }
        }
      ])
    ).toHaveLength(2);
    expect(
      normalizeThemes({
        dark: single,
        light: {
          ...single,
          name: "Dracula Light",
          gecko: { id: "light@example.com" },
          colors: { frame: "#ffffff" }
        }
      })
    ).toHaveLength(2);
  });

  it("rejects themes without name, gecko.id, or colors", () => {
    expect(() =>
      normalizeThemes([
        {
          gecko: { id: "x@example.com" },
          colors: { frame: "#000000" }
        } as unknown as ThunderbirdTheme
      ])
    ).toThrow(/must be a ThunderbirdTheme/);
    expect(() =>
      normalizeThemes({
        bad: {
          name: "x",
          gecko: { id: "x@example.com" }
        } as unknown as ThunderbirdTheme
      })
    ).toThrow(/must be a ThunderbirdTheme/);
    expect(() =>
      normalizeThemes({
        bad: {
          name: "x",
          colors: { frame: "#000000" }
        } as unknown as ThunderbirdTheme
      })
    ).toThrow(/must be a ThunderbirdTheme/);
  });
});

describe("renderManifestJson", () => {
  it("writes Thunderbird MV2 manifest JSON with rgb() color strings", () => {
    const manifest = JSON.parse(renderManifestJson(mapDraculaTheme()));
    expect(manifest.manifest_version).toBe(2);
    expect(manifest.name).toBe("Dracula theme");
    expect(manifest.version).toBe("1.0");
    expect(manifest.applications.gecko).toEqual({
      id: "maxfrei@web.de",
      strict_min_version: "60.0"
    });
    expect(manifest.theme.colors.frame).toBe("rgb(40, 42, 54)");
    expect(manifest.theme.colors.toolbar).toBe("rgb(68, 71, 90)");
    expect(manifest.theme.colors.tab_line).toBe("rgb(139, 105, 190)");
    expect(manifest.icons["200"]).toBe("icon.png");
  });
});

describe("renderInstallMd", () => {
  it("mentions theme folders and Add-ons manager steps", () => {
    const body = renderInstallMd({
      themes: [
        {
          name: "Dracula theme",
          displayName: "Dracula theme",
          folderName: "dracula-theme",
          iconPaths: ["icon.png"]
        }
      ]
    });
    expect(body).toContain("dracula-theme/manifest.json");
    expect(body).toContain("Add-ons and Themes");
    expect(body).toContain("Install Add-on From File");
    expect(body).toContain("Fonts & Colors");
  });
});

describe("thunderbird plugin", () => {
  it("is a Razorwind Plugin", () => {
    const plugin = thunderbird({ mapTheme: mapDraculaTheme });
    expect(plugin.name).toBe("thunderbird");
    expect(typeof plugin.generate).toBe("function");
  });

  it("requires options", async () => {
    const plugin = thunderbird();
    await expect(plugin.generate!(spec, {} as never)).rejects.toThrow(
      /requires options/
    );
  });

  it("requires mapTheme", () => {
    expect(() => generateThunderbirdTheme(spec, {} as never)).toThrow(
      /requires options.mapTheme/
    );
  });

  it("generates Thunderbird theme manifest folders", async () => {
    const plugin = thunderbird({
      outputPath: "out/thunderbird",
      mapTheme: input => {
        const flat = flattenTokens(input);
        const color = (path: string) =>
          toThunderbirdRgbString(
            flat.find(token => token.path === path)?.cssValue ?? "#000000"
          );

        return {
          name: "demo-theme",
          gecko: { id: "demo@example.com" },
          colors: {
            frame: color("color.bg"),
            toolbar: color("color.accent"),
            tab_text: color("color.fg"),
            sidebar: color("color.bg"),
            toolbar_field: color("color.fieldBg")
          }
        };
      }
    });

    const documents = await plugin.generate!(spec, {} as never);
    const paths = Object.keys(documents).sort();

    expect(paths).toEqual([
      "out/thunderbird/INSTALL.md",
      "out/thunderbird/demo-theme/manifest.json"
    ]);

    const manifest = JSON.parse(
      documents["out/thunderbird/demo-theme/manifest.json"]!.chunks![0]!.content
    );
    expect(manifest.name).toBe("Demo Theme");
    expect(manifest.applications.gecko.id).toBe("demo@example.com");
    expect(manifest.theme.colors.frame).toBe("rgb(40, 42, 54)");
    expect(manifest.theme.colors.toolbar).toBe("rgb(68, 71, 90)");

    const install = documents["out/thunderbird/INSTALL.md"]!.chunks![0]!.content;
    expect(install).toContain("demo-theme/manifest.json");
  });

  it("generateThunderbirdTheme mirrors plugin generate output", () => {
    const documents = generateThunderbirdTheme(spec, {
      mapTheme: mapDraculaTheme
    });

    expect(
      documents["thunderbird-themes/dracula-theme/manifest.json"]
    ).toBeDefined();
    expect(documents["thunderbird-themes/INSTALL.md"]).toBeDefined();
    const manifest = JSON.parse(
      documents["thunderbird-themes/dracula-theme/manifest.json"]!.chunks![0]!
        .content
    );
    expect(manifest.name).toBe("Dracula theme");
  });

  it("emits one folder per mapped theme", () => {
    const documents = generateThunderbirdTheme(
      { ...spec, tokens: multiThemeTokens } as Schema,
      {
        mapTheme: input => {
          const sets = resolveTokenSets(input);
          return sets.map(set => {
            const flat = flattenTokens(set.tokens);
            const color = (path: string) =>
              toThunderbirdRgbString(
                flat.find(token => token.path === path)?.cssValue ?? "#000000"
              );
            return {
              name: `demo-${set.id}`,
              gecko: { id: `${set.id}@example.com` },
              colors: {
                frame: color("color.bg"),
                toolbar: color("color.accent"),
                tab_text: color("color.fg"),
                sidebar: color("color.bg")
              }
            };
          });
        }
      }
    );

    expect(Object.keys(documents).sort()).toEqual([
      "thunderbird-themes/INSTALL.md",
      "thunderbird-themes/demo-dark/manifest.json",
      "thunderbird-themes/demo-light/manifest.json"
    ]);
  });
});
