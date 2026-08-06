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
  generateZedExtension,
  normalizeThemes,
  renderExtensionToml,
  renderInstallMd,
  renderThemeJson
} from "../src/generate";
import zed, { type ZedTheme } from "../src/index";

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
  icons: {},
  tokens
} as Schema;

function mapDarkCollection(): ZedTheme {
  return {
    name: "Demo Theme",
    themes: [
      {
        name: "Demo Dark",
        appearance: "dark",
        style: {
          "editor.background": "#0d0d12",
          "editor.foreground": "#e8e8ed",
          syntax: {
            comment: { color: "#6a6a7a", font_style: "italic" }
          }
        }
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
    const single = mapDarkCollection();
    expect(normalizeThemes(single)).toHaveLength(1);
    expect(
      normalizeThemes([
        single,
        {
          name: "Demo Light",
          themes: [
            {
              name: "Demo Light",
              appearance: "light",
              style: { "editor.background": "#ffffff" }
            }
          ]
        }
      ])
    ).toHaveLength(2);
    expect(
      normalizeThemes({
        dark: single,
        light: {
          name: "Demo Light",
          themes: [
            {
              name: "Demo Light",
              appearance: "light",
              style: { "editor.background": "#ffffff" }
            }
          ]
        }
      })
    ).toHaveLength(2);
  });

  it("rejects invalid themes", () => {
    expect(() => normalizeThemes("nope" as never)).toThrow(/must return a theme/);
    expect(() =>
      normalizeThemes({ bad: { name: "x" } as never })
    ).toThrow(/must be a ZedTheme/);
  });
});

describe("renderThemeJson / renderExtensionToml", () => {
  it("writes theme collection JSON with schema", () => {
    const json = JSON.parse(renderThemeJson(mapDarkCollection()));
    expect(json.name).toBe("Demo Theme");
    expect(json.$schema).toBe("https://zed.dev/schema/themes/v0.2.0.json");
    expect(json.themes[0].appearance).toBe("dark");
    expect(json.themes[0].style["editor.background"]).toBe("#0d0d12");
    expect(json.themes[0].style.syntax.comment.color).toBe("#6a6a7a");
  });

  it("writes extension.toml manifest", () => {
    const toml = renderExtensionToml({
      id: "demo-theme",
      name: "Demo Theme",
      authors: ["Acme <themes@acme.com>"],
      repository: "https://github.com/acme/demo-theme",
      mapTheme: mapDarkCollection
    });

    expect(toml).toContain("id = \"demo-theme\"");
    expect(toml).toContain("name = \"Demo Theme\"");
    expect(toml).toContain("authors = [\"Acme <themes@acme.com>\"]");
    expect(toml).toContain(
      "repository = \"https://github.com/acme/demo-theme\""
    );
  });
});

describe("renderInstallMd", () => {
  it("documents Zed install steps", () => {
    const md = renderInstallMd({
      displayName: "Demo Theme",
      extensionId: "demo-theme",
      themes: [
        {
          label: "Demo Dark",
          path: "themes/demo-theme.json",
          slug: "demo-theme",
          fileName: "demo-theme.json"
        }
      ]
    });

    expect(md).toContain("Installing Demo Theme");
    expect(md).toContain("~/.config/zed/themes");
    expect(md).toContain("demo-theme");
    expect(md).toContain("Demo Dark");
    expect(md).toContain("themes/demo-theme.json");
  });
});

describe("zed plugin", () => {
  it("is a Razorwind Plugin", () => {
    const plugin = zed({
      id: "demo",
      mapTheme: mapDarkCollection
    });
    expect(plugin.name).toBe("zed");
    expect(typeof plugin.generate).toBe("function");
  });

  it("requires options", async () => {
    const plugin = zed();
    await expect(plugin.generate!(spec, {} as never)).rejects.toThrow(
      /requires options/
    );
  });

  it("generates a Zed extension package with INSTALL.md", async () => {
    const plugin = zed({
      id: "demo-theme",
      name: "Demo Theme",
      authors: ["Acme <themes@acme.com>"],
      outputPath: "out/zed",
      mapTheme: tokensInput => {
        const flat = flattenTokens(tokensInput);
        const color = (path: string) =>
          flat.find(token => token.path === path)?.cssValue ?? "#000000";

        return {
          name: "Demo Theme",
          themes: [
            {
              name: "Demo Theme Dark",
              appearance: "dark",
              style: {
                "editor.background": color("color.bg"),
                "editor.foreground": color("color.fg"),
                text: color("color.accent"),
                syntax: {
                  comment: { color: color("color.muted") }
                }
              }
            }
          ]
        };
      }
    });

    const documents = await plugin.generate!(spec, {} as never);
    const paths = Object.keys(documents);

    expect(paths).toEqual(
      expect.arrayContaining([
        "out/zed/extension.toml",
        "out/zed/README.md",
        "out/zed/INSTALL.md",
        "out/zed/themes/demo-theme.json"
      ])
    );

    const theme = JSON.parse(
      documents["out/zed/themes/demo-theme.json"]!.chunks![0]!.content
    );
    expect(theme.themes[0].style["editor.background"]).toBe("#0d0d12");
    expect(theme.themes[0].style.text).toBe("#0066cc");
    expect(theme.themes[0].style.syntax.comment.color).toBe("#6a6a7a");

    const toml =
      documents["out/zed/extension.toml"]!.chunks![0]!.content;
    expect(toml).toContain("id = \"demo-theme\"");
    expect(toml).toContain("name = \"Demo Theme\"");

    const install = documents["out/zed/INSTALL.md"]!.chunks![0]!.content;
    expect(install).toContain("Demo Theme");
    expect(install).toContain("~/.config/zed/themes");
    expect(install).toContain("demo-theme.json");
  });

  it("honors installGuide override", () => {
    const documents = generateZedExtension(spec, {
      id: "demo",
      installGuide: "# Custom install\n",
      mapTheme: mapDarkCollection
    });

    expect(
      documents["zed-extension/INSTALL.md"]!.chunks![0]!.content
    ).toBe("# Custom install\n");
  });

  it("generateZedExtension mirrors plugin generate output", () => {
    const documents = generateZedExtension(spec, {
      id: "demo",
      mapTheme: mapDarkCollection
    });

    expect(documents["zed-extension/themes/demo-theme.json"]).toBeDefined();
    expect(documents["zed-extension/extension.toml"]).toBeDefined();
    expect(documents["zed-extension/INSTALL.md"]).toBeDefined();
  });
});
