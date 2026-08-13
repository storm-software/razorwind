/* -------------------------------------------------------------------

                    🗲 Storm Software - Razorwind

 This code was released as part of the Razorwind project. Razorwind
 is maintained by Storm Software under the Apache-2.0 license, and is
 free for commercial and private use. For more information, please visit
 our licensing page at https://stormsoftware.com/licenses/projects/razorwind.

    10| Website:                  https://stormsoftware.com
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
  generateVsceExtension,
  normalizeThemes,
  renderPackageJson,
  renderThemeJson
} from "../src/generate";
import vsce, { type VsCodeTheme } from "../src/index";

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
      accent: { $value: "#0066cc" }
    }
  }
} satisfies Record<string, Tokens>;

const spec = {
  components: {},
  icons: {}, fonts: {},
  tokens
} as Schema;

function mapDarkTheme(): VsCodeTheme {
  return {
    name: "demo-dark",
    displayName: "Demo Dark",
    type: "dark",
    colors: {
      "editor.background": "#0d0d12",
      "editor.foreground": "#e8e8ed"
    },
    tokenColors: [
      {
        scope: ["comment"],
        settings: { foreground: "#6a6a7a", fontStyle: "italic" }
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
      expect.arrayContaining(["color.bg", "color.fg", "color.accent"])
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
    expect(normalizeThemes([single, { ...single, name: "demo-light", type: "light" }])).toHaveLength(
      2
    );
    expect(
      normalizeThemes({
        dark: single,
        light: { ...single, name: "demo-light", type: "light" }
      })
    ).toHaveLength(2);
  });
});

describe("renderThemeJson / renderPackageJson", () => {
  it("writes theme JSON with light|dark type", () => {
    const json = JSON.parse(renderThemeJson(mapDarkTheme()));
    expect(json.name).toBe("demo-dark");
    expect(json.type).toBe("dark");
    expect(json.colors["editor.background"]).toBe("#0d0d12");
  });

  it("maps hc types to uiTheme while keeping theme JSON light|dark", () => {
    const theme: VsCodeTheme = {
      name: "demo-hc",
      type: "hc",
      colors: { "editor.background": "#000000" }
    };
    expect(JSON.parse(renderThemeJson(theme)).type).toBe("dark");

    const pkg = JSON.parse(
      renderPackageJson(
        {
          name: "demo",
          publisher: "acme",
          mapTheme: () => theme
        },
        [theme]
      )
    );
    expect(pkg.contributes.themes[0].uiTheme).toBe("hc-black");
  });

  it("includes package/publish scripts by default", () => {
    const pkg = JSON.parse(
      renderPackageJson(
        {
          name: "demo",
          publisher: "acme",
          mapTheme: mapDarkTheme
        },
        [mapDarkTheme()]
      )
    );
    expect(pkg.scripts["package-vsix"]).toContain("buildVsCodePackage.ts");
    expect(pkg.scripts["publish-vsce"]).toContain("publishVsce.ts");
    expect(pkg.scripts["publish-ovsx"]).toContain("publishOvsx.ts");
  });
});

describe("vsce plugin", () => {
  it("is a Razorwind Plugin", () => {
    const plugin = vsce({
      name: "demo",
      publisher: "acme",
      mapTheme: mapDarkTheme
    });
    expect(plugin.name).toBe("vsce");
    expect(typeof plugin.generate).toBe("function");
  });

  it("requires options", async () => {
    const plugin = vsce();
    await expect(plugin.generate!(spec, {} as never)).rejects.toThrow(
      /requires options/
    );
  });

  it("generates a VS Code extension package", async () => {
    const plugin = vsce({
      name: "demo-theme",
      publisher: "acme",
      displayName: "Demo Theme",
      outputPath: "out/vscode",
      mapTheme: tokens => {
        const flat = flattenTokens(tokens);
        const color = (path: string) =>
          flat.find(token => token.path === path)?.cssValue ?? "#000000";

        return {
          name: "demo-theme-dark",
          displayName: "Demo Theme Dark",
          type: "dark",
          colors: {
            "editor.background": color("color.bg"),
            "editor.foreground": color("color.fg"),
            focusBorder: color("color.accent")
          }
        };
      }
    });

    const documents = await plugin.generate!(spec, {} as never);
    const paths = Object.keys(documents);

    expect(paths).toEqual(
      expect.arrayContaining([
        "out/vscode/package.json",
        "out/vscode/README.md",
        "out/vscode/INSTALL.md",
        "out/vscode/.vscodeignore",
        "out/vscode/themes/demo-theme-dark.json",
        "out/vscode/scripts/vsixPackageShim.ts",
        "out/vscode/scripts/buildVsCodePackage.ts",
        "out/vscode/scripts/publishVsce.ts",
        "out/vscode/scripts/publishOvsx.ts",
        "out/vscode/scripts/README.package.md"
      ])
    );

    const theme = JSON.parse(
      documents["out/vscode/themes/demo-theme-dark.json"]!.chunks![0]!.content
    );
    expect(theme.colors["editor.background"]).toBe("#0d0d12");
    expect(theme.colors.focusBorder).toBe("#0066cc");

    const pkg = JSON.parse(
      documents["out/vscode/package.json"]!.chunks![0]!.content
    );
    expect(pkg.name).toBe("demo-theme");
    expect(pkg.publisher).toBe("acme");
    expect(pkg.contributes.themes).toEqual([
      {
        label: "Demo Theme Dark",
        uiTheme: "vs-dark",
        path: "./themes/demo-theme-dark.json"
      }
    ]);
    expect(pkg.scripts["package-vsix"]).toBeDefined();

    const shim = documents["out/vscode/scripts/vsixPackageShim.ts"]!.chunks![0]!
      .content;
    expect(shim).toContain('const extensionName = "demo-theme"');
    expect(shim).toContain("withVsixPackageShim");
  });

  it("generateVsceExtension mirrors plugin generate output", () => {
    const documents = generateVsceExtension(spec, {
      name: "demo",
      publisher: "acme",
      includeScripts: false,
      mapTheme: mapDarkTheme
    });

    expect(documents["vscode-extension/themes/demo-dark.json"]).toBeDefined();
    expect(documents["vscode-extension/INSTALL.md"]).toBeDefined();
    expect(documents["vscode-extension/scripts/publishVsce.ts"]).toBeUndefined();
    expect(
      JSON.parse(documents["vscode-extension/package.json"]!.chunks![0]!.content)
        .scripts
    ).toBeUndefined();
  });
});
