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

import type { Schema } from "@razorwind/core/schema";
import { describe, expect, it } from "vitest";
import {
  flattenTokens,
  resolveTokenCategory,
  toTokenKey
} from "../src/flatten";
import { formatTokenValue, toTamaguiValue } from "../src/format";
import { generateTamaguiConfig, renderTamaguiConfig } from "../src/generate";
import tamagui from "../src/index";

const tokens = {
  color: {
    $type: "color",
    primary: {
      $value: {
        colorSpace: "srgb",
        components: [0, 0.4, 0.8],
        hex: "#0066cc"
      },
      $description: "Brand primary"
    },
    secondary: {
      $value: "#663399"
    },
    background: {
      accent: { $value: "#0066cc" },
      "accent-subtle": { $value: "#003d7a" }
    },
    blue1: { $value: "#e6f0ff" },
    blue2: { $value: "#cce0ff" },
    blue3: { $value: "#99c2ff" },
    blue4: { $value: "#66a3ff" },
    blue5: { $value: "#3385ff" },
    blue6: { $value: "#0066cc" },
    blue7: { $value: "#0052a3" },
    blue8: { $value: "#003d7a" },
    blue9: { $value: "#002952" },
    blue10: { $value: "#001429" },
    blue11: { $value: "#000a14" },
    blue12: { $value: "#00050a" }
  },
  spacing: {
    $type: "dimension",
    sm: { $value: { value: 8, unit: "px" } },
    md: { $value: { value: 0.5, unit: "rem" } }
  },
  radius: {
    $type: "dimension",
    DEFAULT: { $value: { value: 4, unit: "px" } },
    lg: { $value: { value: 12, unit: "px" } }
  },
  size: {
    $type: "dimension",
    sm: { $value: { value: 32, unit: "px" } }
  },
  zIndex: {
    $type: "number",
    modal: { $value: 1000 }
  }
} satisfies Schema["tokens"];

const spec = {
  components: {},
  icons: {}, fonts: {},
  tokens
} as Schema;

describe("format helpers", () => {
  it("formats DTCG color values to hex", () => {
    expect(
      formatTokenValue(
        {
          colorSpace: "srgb",
          components: [0, 0.4, 0.8],
          hex: "#0066cc"
        },
        "color"
      )
    ).toBe("#0066cc");
  });

  it("converts dimensions into Tamagui numbers", () => {
    expect(toTamaguiValue({ value: 8, unit: "px" }, "dimension")).toBe(8);
    expect(toTamaguiValue({ value: 0.5, unit: "rem" }, "dimension")).toBe(8);
  });
});

describe("flattenTokens", () => {
  it("maps paths onto Tamagui categories and keys", () => {
    expect(resolveTokenCategory("color.primary", "color")).toBe("color");
    expect(resolveTokenCategory("spacing.sm", "dimension")).toBe("space");
    expect(toTokenKey("radius.DEFAULT")).toBe("true");
    expect(toTokenKey("color.blue1")).toBe("blue1");
    expect(toTokenKey("color.blue.1")).toBe("blue1");
    expect(toTokenKey("color.background.accent")).toBe("backgroundAccent");
    expect(toTokenKey("color.background.accent-subtle")).toBe(
      "backgroundAccentSubtle"
    );
    expect(toTokenKey("color.foreground.on-primary")).toBe(
      "foregroundOnPrimary"
    );
    expect(toTokenKey("color.button.accent-ghost.background")).toBe(
      "buttonAccentGhostBackground"
    );

    const flat = flattenTokens(spec.tokens);
    expect(flat.map(token => token.path)).toEqual(
      expect.arrayContaining([
        "color.primary",
        "color.blue1",
        "color.background.accent",
        "color.background.accent-subtle",
        "spacing.sm",
        "radius.DEFAULT",
        "size.sm",
        "zIndex.modal"
      ])
    );

    expect(flat.find(token => token.path === "color.primary")?.cssValue).toBe(
      "#0066cc"
    );
    expect(flat.find(token => token.path === "spacing.sm")?.tamaguiValue).toBe(
      8
    );
    expect(
      flat.find(token => token.path === "radius.DEFAULT")?.tokenKey
    ).toBe("true");
    expect(
      flat.find(token => token.path === "color.background.accent-subtle")
        ?.tokenKey
    ).toBe("backgroundAccentSubtle");
  });
});

describe("tamagui plugin", () => {
  it("is a Razorwind Plugin", () => {
    const plugin = tamagui({});
    expect(plugin.name).toBe("tamagui");
    expect(plugin).toEqual(
      expect.objectContaining({ themeGeneration: "combined" })
    );
    expect(typeof plugin.generate).toBe("function");
  });

  it("generates a Tamagui v5 config from schema tokens", async () => {
    const plugin = tamagui({ outputPath: "src/tamagui.config.ts" });
    const documents = await plugin.generate!(spec, {} as never);

    expect(Object.keys(documents)).toEqual([
      "src/tamagui.config.ts",
      "src/INSTALL.md"
    ]);
    const content = documents["src/tamagui.config.ts"]?.chunks?.[0]?.content;
    expect(content).toContain(
      `import { createV5Theme, defaultConfig } from "@tamagui/config/v5"`
    );
    expect(content).toContain(
      `import { animations } from "@tamagui/config/v5-css"`
    );
    expect(content).toContain(
      `import { createTamagui, createTokens } from "tamagui"`
    );
    expect(content).toContain("createTokens({");
    expect(content).toContain("primary: \"#0066cc\"");
    expect(content).toContain("backgroundAccent:");
    expect(content).toContain("backgroundAccentSubtle:");
    expect(content).not.toContain("backgroundaccent");
    expect(content).not.toContain("backgroundaccent-subtle");
    expect(content).toContain("sm: 8");
    expect(content).toContain("true: 4");
    expect(content).toContain("createV5Theme({");
    expect(content).toContain("childrenThemes:");
    expect(content).toContain("blue:");
    expect(content).toContain("getTheme:");
    expect(content).toContain("export const config = createTamagui({");
    expect(content).toContain("declare module \"tamagui\"");
  });

  it("generateTamaguiConfig mirrors the plugin generate output", () => {
    const documents = generateTamaguiConfig(spec, {
      outputPath: "out/tamagui.config.ts",
      animations: false,
      useDefaultConfig: false
    });

    const content = documents["out/tamagui.config.ts"]?.chunks?.[0]?.content;
    expect(content).toContain(
      `import { createV5Theme } from "@tamagui/config/v5"`
    );
    expect(content).not.toContain("defaultConfig");
    expect(content).not.toContain("animations");
    expect(content).toContain("createTokens({");
    expect(documents["out/INSTALL.md"]).toBeDefined();
  });

  it("renderTamaguiConfig can omit type augmentation", () => {
    const content = renderTamaguiConfig(flattenTokens(spec.tokens), {
      includeTypeAugmentation: false
    });
    expect(content).not.toContain("declare module");
  });

  it("emits createFont from spec.fonts", () => {
    const content = renderTamaguiConfig(
      flattenTokens(spec.tokens),
      { useDefaultConfig: false, animations: false },
      {
        inter: {
          name: "inter",
          title: "Inter",
          source: "google",
          family: "Inter",
          role: "sans"
        }
      }
    );

    expect(content).toContain("createFont");
    expect(content).toContain("isWeb");
    expect(content).toContain("bodyFont");
    expect(content).toContain("fonts: {");
    expect(content).toContain("body: bodyFont");
  });

  it("emits one createV5Theme config with both light and dark palettes", () => {
    function stepped(
      name: string,
      channel: (step: number) => string
    ): Record<string, { $value: string }> {
      return Object.fromEntries(
        Array.from({ length: 12 }, (_, index) => {
          const step = index + 1;
          return [`${name}${step}`, { $value: channel(step) }];
        })
      );
    }

    const themedSpec = {
      components: {},
      icons: {},
      fonts: {},
      tokens: {
        base: {
          spacing: {
            $type: "dimension",
            sm: { $value: { value: 8, unit: "px" } }
          }
        },
        light: {
          color: {
            $type: "color",
            primary: { $value: "#0066cc" },
            ...stepped("blue", step => `#cce0${(step * 10).toString(16).padStart(2, "0")}`),
            ...stepped("gray", step => `#f${step.toString(16)}f${step.toString(16)}f${step.toString(16)}`)
          }
        },
        dark: {
          color: {
            $type: "color",
            primary: { $value: "#66b3ff" },
            ...stepped("blue", step => `#003d${(step * 10).toString(16).padStart(2, "0")}`),
            ...stepped("gray", step => `#1${step.toString(16)}1${step.toString(16)}1${step.toString(16)}`)
          }
        },
        lightDimmed: {
          color: {
            $type: "color",
            primary: { $value: "#99c2e6" }
          }
        }
      }
    } as Schema;

    const documents = generateTamaguiConfig(themedSpec, {
      outputPath: "tamagui.config.ts",
      animations: false,
      useDefaultConfig: false
    });

    expect(Object.keys(documents).sort()).toEqual([
      "INSTALL.md",
      "tamagui.config.ts"
    ]);
    expect(documents["tamagui.config.ts"]?.meta?.data?.appendTheme).toBe(false);

    const content = documents["tamagui.config.ts"]?.chunks?.[0]?.content ?? "";
    expect(content).toContain("createV5Theme({");
    expect(content).toContain("lightPalette:");
    expect(content).toContain("darkPalette:");
    expect(content).toContain("childrenThemes:");
    expect(content).toContain("blue:");
    expect(content).toContain("light:");
    expect(content).toContain("dark:");
    expect(content).toContain("primary: \"#0066cc\"");
    expect(content).toContain("primary: \"#66b3ff\"");
    expect(content).not.toContain("#99c2e6");
    expect(content).toContain("scheme === \"dark\"");
    expect(content).toContain("sm: 8");

    const install = documents["INSTALL.md"]?.chunks?.[0]?.content ?? "";
    expect(install).toContain("both `light` and `dark` themes");
    expect(install).toContain("defaultTheme=\"light\"");
  });
});
