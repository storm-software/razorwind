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
  generateGhosttyTheme,
  normalizeThemes,
  renderGhosttyTheme,
  renderInstallMd,
  toGhosttyColor
} from "../src/generate";
import ghostty, { type GhosttyTheme } from "../src/index";

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
    selection: {
      $value: "#44475a"
    },
    ansi: {
      black: { $value: "#21222c" },
      red: { $value: "#ff5555" },
      green: { $value: "#50fa7b" },
      yellow: { $value: "#f1fa8c" },
      blue: { $value: "#bd93f9" },
      magenta: { $value: "#ff79c6" },
      cyan: { $value: "#8be9fd" },
      white: { $value: "#f8f8f2" }
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
      selection: { $value: "#dddddd" },
      ansi: {
        black: { $value: "#000000" },
        red: { $value: "#cc0000" },
        green: { $value: "#00aa00" },
        yellow: { $value: "#aaaa00" },
        blue: { $value: "#0000cc" },
        magenta: { $value: "#cc00cc" },
        cyan: { $value: "#00cccc" },
        white: { $value: "#eeeeee" }
      }
    }
  }
} satisfies Record<string, Tokens>;

const spec = {
  components: {},
  icons: {},
  tokens
} as Schema;

function mapDraculaTheme(): GhosttyTheme {
  return {
    name: "dracula",
    displayName: "Dracula",
    palette: {
      0: "#21222c",
      1: "#ff5555",
      2: "#50fa7b",
      3: "#f1fa8c",
      4: "#bd93f9",
      5: "#ff79c6",
      6: "#8be9fd",
      7: "#f8f8f2",
      8: "#6272a4",
      9: "#ff6e6e",
      10: "#69ff94",
      11: "#ffffa5",
      12: "#d6acff",
      13: "#ff92df",
      14: "#a4ffff",
      15: "#ffffff"
    },
    background: "#282a36",
    foreground: "#f8f8f2",
    cursorColor: "#f8f8f2",
    cursorText: "#282a36",
    selectionForeground: "#f8f8f2",
    selectionBackground: "#44475a"
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

describe("toGhosttyColor", () => {
  it("lowercases hex colors", () => {
    expect(toGhosttyColor("#282A36")).toBe("#282a36");
  });

  it("adds # to 6-digit hex without prefix", () => {
    expect(toGhosttyColor("282a36")).toBe("#282a36");
  });
});

describe("flattenTokens / resolveTokenSets", () => {
  it("walks nested DTCG tokens", () => {
    const flat = flattenTokens(tokens);
    expect(flat.map(token => token.path)).toEqual(
      expect.arrayContaining([
        "color.bg",
        "color.fg",
        "color.selection",
        "color.ansi.red"
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
      normalizeThemes([single, { ...single, name: "dracula-light" }])
    ).toHaveLength(2);
    expect(
      normalizeThemes({
        dark: single,
        light: { ...single, name: "dracula-light" }
      })
    ).toHaveLength(2);
  });

  it("rejects themes without name", () => {
    expect(() =>
      normalizeThemes([{ background: "#000" } as unknown as GhosttyTheme])
    ).toThrow(/must be a GhosttyTheme/);
    expect(() =>
      normalizeThemes({ bad: { background: "#000" } as unknown as GhosttyTheme })
    ).toThrow(/must be a GhosttyTheme/);
  });
});

describe("renderGhosttyTheme", () => {
  it("writes Ghostty palette and color config", () => {
    const body = renderGhosttyTheme(mapDraculaTheme());
    expect(body).toContain("palette = 0=#21222c");
    expect(body).toContain("palette = 15=#ffffff");
    expect(body).toContain("background = #282a36");
    expect(body).toContain("foreground = #f8f8f2");
    expect(body).toContain("cursor-color = #f8f8f2");
    expect(body).toContain("cursor-text = #282a36");
    expect(body).toContain("selection-foreground = #f8f8f2");
    expect(body).toContain("selection-background = #44475a");
  });

  it("supports palette arrays and extra config", () => {
    const body = renderGhosttyTheme({
      name: "custom",
      palette: ["#111111", "#ff0000"],
      background: "1a1a1a",
      config: {
        "cursor-style": "block",
        keybind: ["ctrl+d=new_split:right", "ctrl+z=close_surface"]
      }
    });
    expect(body).toContain("palette = 0=#111111");
    expect(body).toContain("palette = 1=#ff0000");
    expect(body).toContain("background = #1a1a1a");
    expect(body).toContain("cursor-style = block");
    expect(body).toContain("keybind = ctrl+d=new_split:right");
    expect(body).toContain("keybind = ctrl+z=close_surface");
  });

  it("rejects theme config keys reserved by Ghostty", () => {
    expect(() =>
      renderGhosttyTheme({
        name: "bad",
        config: { theme: "other" }
      })
    ).toThrow(/cannot set "theme"/);
  });
});

describe("renderInstallMd", () => {
  it("documents Ghostty copy + theme = steps", () => {
    const md = renderInstallMd({
      themes: [
        {
          name: "dracula",
          displayName: "Dracula",
          fileName: "dracula"
        }
      ]
    });
    expect(md).toContain("Dracula");
    expect(md).toContain("`dracula`");
    expect(md).toContain("theme = dracula");
    expect(md).toContain("~/.config/ghostty/themes");
    expect(md).toContain("draculatheme.com/ghostty");
  });
});

describe("ghostty plugin", () => {
  it("is a Razorwind Plugin", () => {
    const plugin = ghostty({ mapTheme: mapDraculaTheme });
    expect(plugin.name).toBe("ghostty");
    expect(typeof plugin.generate).toBe("function");
  });

  it("requires options", async () => {
    const plugin = ghostty();
    await expect(plugin.generate!(spec, {} as never)).rejects.toThrow(
      /requires options/
    );
  });

  it("requires mapTheme", () => {
    expect(() => generateGhosttyTheme(spec, {} as never)).toThrow(
      /requires options.mapTheme/
    );
  });

  it("generates Ghostty theme files and INSTALL.md", async () => {
    const plugin = ghostty({
      outputPath: "out/ghostty",
      mapTheme: input => {
        const flat = flattenTokens(input);
        const color = (path: string) =>
          flat.find(token => token.path === path)?.cssValue ?? "#000000";

        return {
          name: "demo-theme",
          background: color("color.bg"),
          foreground: color("color.fg"),
          cursorColor: color("color.fg"),
          cursorText: color("color.bg"),
          selectionBackground: color("color.selection"),
          selectionForeground: color("color.fg"),
          palette: {
            0: color("color.ansi.black"),
            1: color("color.ansi.red"),
            2: color("color.ansi.green")
          }
        };
      }
    });

    const documents = await plugin.generate!(spec, {} as never);
    const paths = Object.keys(documents).sort();

    expect(paths).toEqual(["out/ghostty/INSTALL.md", "out/ghostty/demo-theme"]);

    const theme = documents["out/ghostty/demo-theme"]!.chunks![0]!.content;
    expect(theme).toContain("background = #282a36");
    expect(theme).toContain("foreground = #f8f8f2");
    expect(theme).toContain("palette = 1=#ff5555");

    const install = documents["out/ghostty/INSTALL.md"]!.chunks![0]!.content;
    expect(install).toContain("`demo-theme`");
    expect(install).toContain("theme = demo-theme");
    expect(install).toContain("~/.config/ghostty/config");
  });

  it("generateGhosttyTheme mirrors plugin generate output", () => {
    const documents = generateGhosttyTheme(spec, {
      mapTheme: mapDraculaTheme
    });

    expect(documents["ghostty-themes/dracula"]).toBeDefined();
    expect(documents["ghostty-themes/INSTALL.md"]).toBeDefined();
    const theme = documents["ghostty-themes/dracula"]!.chunks![0]!.content;
    expect(theme).toContain("Dracula");
    expect(theme).toContain("background = #282a36");
  });

  it("emits one file per mapped theme", () => {
    const documents = generateGhosttyTheme(
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
              background: color("color.bg"),
              foreground: color("color.fg")
            };
          });
        }
      }
    );

    expect(Object.keys(documents).sort()).toEqual([
      "ghostty-themes/INSTALL.md",
      "ghostty-themes/demo-dark",
      "ghostty-themes/demo-light"
    ]);
  });

  it("uses installGuide override when provided", () => {
    const documents = generateGhosttyTheme(spec, {
      mapTheme: mapDraculaTheme,
      installGuide: "# Custom install\n"
    });
    expect(documents["ghostty-themes/INSTALL.md"]!.chunks![0]!.content).toBe(
      "# Custom install\n"
    );
  });
});
