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
  generateChromeTheme,
  normalizeThemes,
  renderManifestJson,
  toChromeRgb
} from "../src/generate";
import { renderInstallMd } from "../src/install";
import chrome, { type ChromeTheme } from "../src/index";

const tokens = {
  color: {
    $type: "color",
    frame: {
      $value: {
        colorSpace: "srgb",
        components: [0.09, 0.094, 0.118],
        hex: "#17181e"
      }
    },
    toolbar: {
      $value: "#44475a"
    },
    fg: {
      $value: "#f8f8f2"
    },
    muted: {
      $value: "#6272a4"
    },
    omniboxBg: {
      $value: "#21222c"
    },
    ntpBg: {
      $value: "#282a36"
    },
    link: {
      $value: "#8be9fd"
    }
  }
} satisfies Tokens;

const multiThemeTokens = {
  dark: tokens,
  light: {
    color: {
      $type: "color",
      frame: { $value: "#ffffff" },
      toolbar: { $value: "#e0e0e0" },
      fg: { $value: "#111111" },
      muted: { $value: "#888888" },
      omniboxBg: { $value: "#f5f5f5" },
      ntpBg: { $value: "#fafafa" },
      link: { $value: "#0066cc" }
    }
  }
} satisfies Record<string, Tokens>;

const spec = {
  components: {},
  icons: {},
  fonts: {},
  tokens
} as Schema;

function mapDraculaTheme(): ChromeTheme {
  return {
    name: "Dracula Chrome Theme",
    description: "A dark and minimal color theme for Google Chrome.",
    version: "3.2",
    icons: {
      "16": "images/icon16.png",
      "48": "images/icon48.png",
      "128": "images/icon128.png"
    },
    colors: {
      frame: [23, 24, 30],
      frame_inactive: [23, 24, 30],
      frame_incognito: [25, 26, 33],
      frame_incognito_inactive: [25, 26, 33],
      bookmark_text: "#f8f8f2",
      tab_background_text: "#6272a4",
      tab_background_text_inactive: "#6272a4",
      tab_background_text_incognito: "#6272a4",
      tab_background_text_incognito_inactive: "#6272a4",
      tab_text: "#f8f8f2",
      toolbar: "#44475a",
      toolbar_button_icon: "#f8f8f2",
      omnibox_text: "#f8f8f2",
      omnibox_background: "#21222c",
      ntp_background: "#282a36",
      ntp_link: "#8be9fd",
      ntp_text: "#f8f8f2"
    },
    images: {
      theme_toolbar: "images/theme_toolbar_transparent.png",
      theme_tab_background: "images/theme_toolbar.png"
    }
  };
}

describe("formatTokenValue", () => {
  it("formats DTCG color values to hex", () => {
    expect(
      formatTokenValue(
        {
          colorSpace: "srgb",
          components: [0.09, 0.094, 0.118],
          hex: "#17181e"
        },
        "color"
      )
    ).toBe("#17181e");
  });
});

describe("toChromeRgb", () => {
  it("converts hex strings to RGB tuples", () => {
    expect(toChromeRgb("#f8f8f2")).toEqual([248, 248, 242]);
    expect(toChromeRgb("44475a")).toEqual([68, 71, 90]);
  });

  it("clamps RGB tuple channels", () => {
    expect(toChromeRgb([300, -5, 128.4])).toEqual([255, 0, 128]);
  });

  it("rejects invalid color strings", () => {
    expect(() => toChromeRgb("not-a-color")).toThrow(/cannot convert color/);
  });
});

describe("flattenTokens / resolveTokenSets", () => {
  it("walks nested DTCG tokens", () => {
    const flat = flattenTokens(tokens);
    expect(flat.map(token => token.path)).toEqual(
      expect.arrayContaining([
        "color.frame",
        "color.toolbar",
        "color.fg",
        "color.muted",
        "color.ntpBg",
        "color.link"
      ])
    );
    expect(flat.find(token => token.path === "color.frame")?.cssValue).toBe(
      "#17181e"
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
        { ...single, name: "Dracula Light", colors: { frame: "#ffffff" } }
      ])
    ).toHaveLength(2);
    expect(
      normalizeThemes({
        dark: single,
        light: { ...single, name: "Dracula Light", colors: { frame: "#ffffff" } }
      })
    ).toHaveLength(2);
  });

  it("rejects themes without name or colors", () => {
    expect(() =>
      normalizeThemes([{ colors: { frame: "#000000" } } as unknown as ChromeTheme])
    ).toThrow(/must be a ChromeTheme/);
    expect(() =>
      normalizeThemes({ bad: { name: "x" } as unknown as ChromeTheme })
    ).toThrow(/must be a ChromeTheme/);
  });
});

describe("renderManifestJson", () => {
  it("writes Chrome MV3 manifest JSON with RGB colors", () => {
    const manifest = JSON.parse(renderManifestJson(mapDraculaTheme()));
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.name).toBe("Dracula Chrome Theme");
    expect(manifest.version).toBe("3.2");
    expect(manifest.theme.colors.frame).toEqual([23, 24, 30]);
    expect(manifest.theme.colors.toolbar).toEqual([68, 71, 90]);
    expect(manifest.theme.colors.ntp_link).toEqual([139, 233, 253]);
    expect(manifest.icons["128"]).toBe("images/icon128.png");
    expect(manifest.theme.images.theme_toolbar).toBe(
      "images/theme_toolbar_transparent.png"
    );
  });
});

describe("renderInstallMd", () => {
  it("mentions theme folders and chrome://extensions", () => {
    const body = renderInstallMd({
      themes: [
        {
          name: "Dracula Chrome Theme",
          displayName: "Dracula Chrome Theme",
          folderName: "dracula-chrome-theme",
          imagePaths: ["images/theme_toolbar.png"],
          iconPaths: ["images/icon128.png"]
        }
      ]
    });
    expect(body).toContain("dracula-chrome-theme/manifest.json");
    expect(body).toContain("chrome://extensions");
    expect(body).toContain("Load unpacked");
  });
});

describe("chrome plugin", () => {
  it("is a Razorwind Plugin", () => {
    const plugin = chrome({ mapTheme: mapDraculaTheme });
    expect(plugin.name).toBe("chrome");
    expect(typeof plugin.generate).toBe("function");
  });

  it("requires options", async () => {
    const plugin = chrome();
    await expect(plugin.generate!(spec, {} as never)).rejects.toThrow(
      /requires options/
    );
  });

  it("requires mapTheme", () => {
    expect(() => generateChromeTheme(spec, {} as never)).toThrow(
      /requires options.mapTheme/
    );
  });

  it("generates Chrome theme manifest folders", async () => {
    const plugin = chrome({
      outputPath: "out/chrome",
      mapTheme: input => {
        const flat = flattenTokens(input);
        const rgb = (path: string) =>
          toChromeRgb(
            flat.find(token => token.path === path)?.cssValue ?? "#000000"
          );

        return {
          name: "demo-theme",
          colors: {
            frame: rgb("color.frame"),
            toolbar: rgb("color.toolbar"),
            tab_text: rgb("color.fg"),
            ntp_background: rgb("color.ntpBg"),
            ntp_link: rgb("color.link")
          }
        };
      }
    });

    const documents = await plugin.generate!(spec, {} as never);
    const paths = Object.keys(documents).sort();

    expect(paths).toEqual([
      "out/chrome/INSTALL.md",
      "out/chrome/demo-theme/manifest.json"
    ]);

    const manifest = JSON.parse(
      documents["out/chrome/demo-theme/manifest.json"]!.chunks![0]!.content
    );
    expect(manifest.name).toBe("Demo Theme");
    expect(manifest.theme.colors.frame).toEqual([23, 24, 30]);
    expect(manifest.theme.colors.toolbar).toEqual([68, 71, 90]);
    expect(manifest.theme.colors.ntp_link).toEqual([139, 233, 253]);

    const install = documents["out/chrome/INSTALL.md"]!.chunks![0]!.content;
    expect(install).toContain("demo-theme/manifest.json");
  });

  it("generateChromeTheme mirrors plugin generate output", () => {
    const documents = generateChromeTheme(spec, {
      mapTheme: mapDraculaTheme
    });

    expect(
      documents["chrome-themes/dracula-chrome-theme/manifest.json"]
    ).toBeDefined();
    expect(documents["chrome-themes/INSTALL.md"]).toBeDefined();
    const manifest = JSON.parse(
      documents["chrome-themes/dracula-chrome-theme/manifest.json"]!.chunks![0]!
        .content
    );
    expect(manifest.name).toBe("Dracula Chrome Theme");
  });

  it("emits one folder per mapped theme", () => {
    const documents = generateChromeTheme(
      { ...spec, tokens: multiThemeTokens } as Schema,
      {
        mapTheme: input => {
          const sets = resolveTokenSets(input);
          return sets.map(set => {
            const flat = flattenTokens(set.tokens);
            const rgb = (path: string) =>
              toChromeRgb(
                flat.find(token => token.path === path)?.cssValue ?? "#000000"
              );
            return {
              name: `demo-${set.id}`,
              colors: {
                frame: rgb("color.frame"),
                toolbar: rgb("color.toolbar"),
                tab_text: rgb("color.fg"),
                ntp_background: rgb("color.ntpBg")
              }
            };
          });
        }
      }
    );

    expect(Object.keys(documents).sort()).toEqual([
      "chrome-themes/INSTALL.md",
      "chrome-themes/demo-dark/manifest.json",
      "chrome-themes/demo-light/manifest.json"
    ]);
  });
});
