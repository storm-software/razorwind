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
  isPaletteGroup,
  resolveTokenCategory,
  toTokenKey
} from "../src/flatten";
import { formatTokenValue, toTamaguiValue } from "../src/format";
import { generateTamaguiConfig, renderTamaguiConfig } from "../src/generate";
import tamagui from "../src/index";
import type { TamaguiPluginOptions } from "../src/types";

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

function renderConfig(
  schema: Schema,
  options: TamaguiPluginOptions = {},
  extraFonts?: Schema["fonts"]
): string {
  return renderTamaguiConfig(
    extraFonts ? { ...schema, fonts: extraFonts } : schema,
    flattenTokens(schema.tokens),
    options
  );
}

function createFontBlock(content: string, varName: string): string {
  const start = content.indexOf(`const ${varName} = createFont(`);
  expect(start).toBeGreaterThan(-1);
  const end = content.indexOf("});", start);

  return content.slice(start, end);
}

function createThemeBlock(content: string, name: string): string {
  const start = content.indexOf(`const ${name} = createTheme(`);
  if (start < 0) {
    return "";
  }

  const end = content.indexOf("});", start);

  return end < 0 ? content.slice(start) : content.slice(start, end + 3);
}

function tokensSource(content: string): string {
  const start = content.indexOf("const tokens = createTokens(");
  if (start < 0) {
    return "";
  }

  const end = content.indexOf("\nconst ", start + 1);

  return end < 0 ? content.slice(start) : content.slice(start, end);
}

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

  it("formats shadow objects as CSS box-shadow strings", () => {
    expect(
      toTamaguiValue(
        {
          color: { hex: "#000000", alpha: 0.05 },
          offsetX: { value: 0, unit: "px" },
          offsetY: { value: 1, unit: "px" },
          blur: { value: 0, unit: "px" },
          spread: { value: 0, unit: "px" },
          inset: true
        },
        "shadow"
      )
    ).toBe("inset 0px 1px 0px 0px #0000000d");
  });
});

describe("flattenTokens", () => {
  it("maps paths onto Tamagui categories and keys", () => {
    expect(resolveTokenCategory("color.primary", "color")).toBe("color");
    expect(resolveTokenCategory("spacing.sm", "dimension")).toBe("space");
    expect(resolveTokenCategory("inset.sm", "dimension")).toBe("space");
    expect(resolveTokenCategory("font-size.sm", "dimension")).toBe("fontSize");
    expect(resolveTokenCategory("font-weight.bold", "fontWeight")).toBe(
      "fontWeight"
    );
    expect(resolveTokenCategory("size.sm", "dimension")).toBe("size");
    expect(resolveTokenCategory("inset-shadow.xs", "shadow")).toBe(
      "insetShadow"
    );
    expect(resolveTokenCategory("drop-shadow.sm", "shadow")).toBe("dropShadow");
    expect(resolveTokenCategory("text-shadow.md", "shadow")).toBe("textShadow");
    expect(resolveTokenCategory("shadow.2xs", "shadow")).toBe("shadow");
    expect(toTokenKey("font-size.sm")).toBe("sm");
    expect(toTokenKey("font-weight.bold")).toBe("bold");
    expect(toTokenKey("inset-shadow.2xs")).toBe("2xs");
    expect(toTokenKey("drop-shadow.lg")).toBe("lg");
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

  it("captures token theme properties as childTheme without clobbering the set id", () => {
    const themed = {
      light: {
        color: {
          $type: "color",
          danger: {
            $value: "{color.red.7}",
            theme: "danger"
          },
          warning: {
            $value: "{color.yellow.4}",
            $theme: "warning"
          }
        }
      }
    };

    const flat = flattenTokens(themed);
    expect(flat.find(token => token.path === "color.danger")).toMatchObject({
      theme: "light",
      childTheme: "danger"
    });
    expect(flat.find(token => token.path === "color.warning")).toMatchObject({
      theme: "light",
      childTheme: "warning"
    });
  });

  it("inherits theme from an ancestor group", () => {
    const themed = {
      color: {
        $type: "color",
        accent: {
          theme: "accent",
          foreground: { $value: "#00ccaa" },
          background: { $value: "#003d33" }
        }
      }
    };

    const flat = flattenTokens(themed);
    expect(
      flat.find(token => token.path === "color.accent.foreground")?.childTheme
    ).toBe("accent");
    expect(
      flat.find(token => token.path === "color.accent.background")?.childTheme
    ).toBe("accent");
  });

  it("captures theme properties on shadow tokens", () => {
    const themed = {
      light: {
        ring: {
          primary: {
            $type: "shadow",
            $value: {
              color: "#0066cc",
              offsetX: { value: 0, unit: "px" },
              offsetY: { value: 0, unit: "px" },
              blur: { value: 0, unit: "px" },
              spread: { value: 3, unit: "px" }
            },
            theme: "primary"
          }
        },
        shadow: {
          accent: {
            $type: "shadow",
            $value: {
              color: "#00ccaa",
              offsetX: { value: 0, unit: "px" },
              offsetY: { value: 1, unit: "px" },
              blur: { value: 2, unit: "px" },
              spread: { value: 0, unit: "px" }
            },
            theme: "accent"
          }
        }
      }
    };

    const flat = flattenTokens(themed);
    expect(flat.find(token => token.path === "ring.primary")).toMatchObject({
      theme: "light",
      childTheme: "primary",
      category: "shadow"
    });
    expect(flat.find(token => token.path === "shadow.accent")).toMatchObject({
      theme: "light",
      childTheme: "accent",
      category: "shadow"
    });
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

  it("generates a Tamagui config from schema tokens", async () => {
    const plugin = tamagui({ outputPath: "src/tamagui.config.ts" });
    const documents = await plugin.generate!(spec, {} as never);

    expect(Object.keys(documents)).toEqual([
      "src/tamagui.config.ts",
      "src/INSTALL.md"
    ]);
    const content = documents["src/tamagui.config.ts"]?.chunks?.[0]?.content;
    expect(content).not.toContain("createV5Theme");
    expect(content).not.toContain("@tamagui/config/v5\"");
    expect(content).not.toContain("defaultConfig");
    expect(content).toContain(
      `import { animations } from "@tamagui/config/v5-css"`
    );
    expect(content).toContain(`from "@tamagui/core"`);
    expect(content).toContain("createTamagui");
    expect(content).toContain("createTokens");
    expect(content).toContain("createTheme");
    expect(content).toContain("createTokens({");
    expect(content).toContain("primary: \"#0066cc\"");
    expect(content).toContain("backgroundAccent:");
    expect(content).toContain("backgroundAccentSubtle:");
    expect(content).not.toContain("backgroundaccent");
    expect(content).not.toContain("backgroundaccent-subtle");
    expect(content).not.toContain('"colorSpace"');
    expect(content).toContain("sm: 8");
    expect(content).toContain("true: 4");
    expect(content).toContain("const light = createTheme(");
    expect(content).toContain("const dark = createTheme(");
    expect(content).not.toContain("childrenThemes:");
    expect(content).not.toContain("getTheme:");
    expect(content).toContain("export const config = createTamagui({");
    expect(content).toContain("declare module \"@tamagui/core\"");
  });

  it("merges defaultConfig when useDefaultConfig is true", async () => {
    const plugin = tamagui({
      outputPath: "src/tamagui.config.ts",
      useDefaultConfig: true
    });
    const documents = await plugin.generate!(spec, {} as never);
    const content = documents["src/tamagui.config.ts"]?.chunks?.[0]?.content;

    expect(content).toContain(
      `import { defaultConfig } from "@tamagui/config/v5"`
    );
    expect(content).not.toContain("createV5Theme");
    expect(content).toContain("...defaultConfig");
  });

  it("generateTamaguiConfig mirrors the plugin generate output", () => {
    const documents = generateTamaguiConfig(spec, {
      outputPath: "out/tamagui.config.ts",
      animations: false
    });

    const content = documents["out/tamagui.config.ts"]?.chunks?.[0]?.content;
    expect(content).not.toContain(`from "@tamagui/config/v5"`);
    expect(content).not.toContain("createV5Theme");
    expect(content).toContain("createTheme");
    expect(content).not.toContain("defaultConfig");
    expect(content).not.toContain("animations");
    expect(content).toContain("createTokens({");
    expect(documents["out/INSTALL.md"]).toBeDefined();
  });

  it("renderTamaguiConfig can omit type augmentation", () => {
    const content = renderConfig(spec, {
      includeTypeAugmentation: false
    });
    expect(content).not.toContain("declare module");
  });

  it("emits createFont from spec.fonts", () => {
    const content = renderConfig(
      spec,
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

  it("emits createFont from typography tokens", () => {
    const spec = {
      components: {},
      icons: {},
      fonts: {},
      tokens: {
        font: {
          $type: "fontFamily",
          sans: { $value: ["Inter", "system-ui", "sans-serif"] },
          mono: { $value: ["JetBrains Mono", "ui-monospace", "monospace"] }
        },
        fontWeight: {
          $type: "fontWeight",
          regular: { $value: 400 },
          bold: { $value: 700 }
        },
        typography: {
          $type: "typography",
          body: {
            $value: {
              fontFamily: "{font.sans}",
              fontSize: { value: 1, unit: "rem" },
              fontWeight: "{fontWeight.regular}",
              lineHeight: 1.5,
              letterSpacing: { value: 0, unit: "px" }
            }
          },
          heading: {
            $value: {
              fontFamily: "{font.sans}",
              fontSize: { value: 1.5, unit: "rem" },
              fontWeight: "{fontWeight.bold}",
              lineHeight: 1.25,
              letterSpacing: { value: -0.02, unit: "rem" }
            }
          },
          body_cn: {
            $value: {
              fontFamily: "Noto Sans SC, sans-serif",
              fontSize: { value: 1, unit: "rem" },
              fontWeight: 400,
              lineHeight: 1.5
            }
          }
        }
      }
    } as Schema;

    const flat = flattenTokens(spec.tokens);
    expect(flat.find(token => token.path === "typography.body")?.type).toBe(
      "typography"
    );
    expect(flat.find(token => token.path === "fontWeight.bold")?.category).toBe(
      "fontWeight"
    );

    const content = renderConfig(spec, {
      useDefaultConfig: false,
      animations: false,
      includeTypeAugmentation: false
    });

    expect(content).toContain("createFont");
    expect(content).toContain("const bodyFont = createFont({");
    expect(content).toContain("const headingFont = createFont({");
    expect(content).toContain("const body_cnFont = createFont({");
    expect(content).toContain("body: bodyFont");
    expect(content).toContain("heading: headingFont");
    expect(content).toContain("body_cn: body_cnFont");
    expect(content).toContain("mono: monoFont");
    expect(content).toContain("Inter, system-ui, sans-serif");
    expect(content).toContain("Noto Sans SC, sans-serif");
    expect(content).toContain("JetBrains Mono, ui-monospace, monospace");
    expect(content).toContain("true: 16");
    expect(content).toContain("true: 24");
    expect(content).toContain('true: "400"');
    expect(content).toContain('true: "700"');
    expect(content).toContain("true: -0.32");
    expect(content).not.toContain('"fontFamily"');
    expect(content).not.toContain("[object Object]");

    const body = createFontBlock(content, "bodyFont");
    const heading = createFontBlock(content, "headingFont");
    expect(body).toContain("true: 16");
    expect(body).toContain("true: 24");
    expect(body).toContain('true: "400"');
    expect(heading).toContain("true: 24");
    expect(heading).toContain("true: 30");
    expect(heading).toContain('true: "700"');
    expect(heading).not.toContain("true: 16");
    expect(body).not.toContain("true: 30");
  });

  it("keeps each typography token as its own font with that token's metrics", () => {
    const spec = {
      components: {},
      icons: {},
      fonts: {},
      tokens: {
        "font-size": {
          $type: "dimension",
          xs: { $value: { value: 0.75, unit: "rem" } },
          md: { $value: { value: 1, unit: "rem" } },
          lg: { $value: { value: 1.125, unit: "rem" } },
          "5xl": { $value: { value: 3, unit: "rem" } }
        },
        "font-weight": {
          $type: "fontWeight",
          light: { $value: 300 },
          normal: { $value: 400 },
          semibold: { $value: 600 }
        },
        "line-height": {
          xs: { $type: "number", $value: 1.333333 },
          md: { $type: "number", $value: 1.5 },
          lg: { $type: "number", $value: 1.555556 },
          "5xl": { $type: "number", $value: 1 }
        },
        typography: {
          $type: "typography",
          body: {
            $value: {
              fontFamily: "Space Grotesk",
              fontWeight: "{font-weight.light}",
              fontSize: "{font-size.md}",
              lineHeight: "{line-height.md}"
            }
          },
          "heading-md": {
            $value: {
              fontFamily: "Space Grotesk",
              fontWeight: "{font-weight.semibold}",
              fontSize: "{font-size.lg}",
              lineHeight: "{line-height.lg}"
            }
          },
          "heading-sm": {
            $value: {
              fontFamily: "Space Grotesk",
              fontWeight: "{font-weight.semibold}",
              fontSize: "{font-size.md}",
              lineHeight: "{line-height.md}"
            }
          },
          "display-lg": {
            $value: {
              fontFamily: "Permanent Marker",
              fontWeight: "{font-weight.normal}",
              fontSize: "{font-size.5xl}",
              lineHeight: "{line-height.5xl}"
            }
          }
        }
      }
    } as Schema;

    const content = renderConfig(spec, {
      useDefaultConfig: false,
      animations: false,
      includeTypeAugmentation: false
    });

    expect(content).toContain("body: bodyFont");
    expect(content).toContain('"heading-md": headingMdFont');
    expect(content).toContain('"heading-sm": headingSmFont');
    expect(content).toContain('"display-lg": displayLgFont');

    const body = createFontBlock(content, "bodyFont");
    const headingMd = createFontBlock(content, "headingMdFont");
    const headingSm = createFontBlock(content, "headingSmFont");
    const displayLg = createFontBlock(content, "displayLgFont");

    expect(body).toContain("true: 16");
    expect(body).toContain("md: 16");
    expect(body).toContain("true: 24");
    expect(body).toContain('true: "300"');
    expect(body).toContain('light: "300"');
    expect(body).not.toContain('"5xl"');
    expect(body).not.toContain("true: 48");

    expect(headingMd).toContain("true: 18");
    expect(headingMd).toContain("lg: 18");
    expect(headingMd).toContain("true: 28");
    expect(headingMd).toContain('true: "600"');
    expect(headingMd).toContain('semibold: "600"');
    expect(headingMd).not.toContain('"5xl"');
    expect(headingMd).not.toContain('true: "300"');

    expect(headingSm).toContain("true: 16");
    expect(headingSm).toContain('true: "600"');
    expect(headingSm).not.toContain('true: "300"');
    expect(headingSm).not.toContain("true: 18");

    expect(displayLg).toContain("true: 48");
    expect(displayLg).toContain('"5xl": 48');
    expect(displayLg).toContain('true: "400"');
    expect(displayLg).toContain("Permanent Marker");
    expect(displayLg).not.toContain("Space Grotesk");
  });

  it("maps nested typography language segments onto FontLanguage keys", () => {
    const nested = {
      components: {},
      icons: {},
      fonts: {},
      tokens: {
        typography: {
          $type: "typography",
          body: {
            cn: {
              $value: {
                fontFamily: "Inter-CN",
                fontSize: { value: 16, unit: "px" }
              }
            }
          }
        }
      }
    } as Schema;

    const content = renderConfig(nested, {
      useDefaultConfig: false,
      animations: false,
      includeTypeAugmentation: false
    });

    expect(content).toContain("const body_cnFont = createFont({");
    expect(content).toContain("body_cn: body_cnFont");
    expect(content).toContain("Inter-CN");
  });

  it("merges spec.fonts face data into typography createFont output", () => {
    const spec = {
      components: {},
      icons: {},
      fonts: {},
      tokens: {
        typography: {
          $type: "typography",
          body: {
            $value: {
              fontFamily: "Inter",
              fontSize: { value: 16, unit: "px" },
              fontWeight: 400
            }
          }
        }
      }
    } as Schema;

    const content = renderConfig(
      spec,
      {
        useDefaultConfig: false,
        animations: false,
        includeTypeAugmentation: false
      },
      {
        inter: {
          name: "inter",
          title: "Inter",
          source: "local",
          family: "Inter",
          role: "sans",
          files: [
            { path: "fonts/Inter-Regular.ttf", weight: 400, style: "normal" },
            { path: "fonts/Inter-Italic.ttf", weight: 400, style: "italic" }
          ]
        }
      }
    );

    expect(content).toContain("const bodyFont = createFont({");
    expect(content).toContain("face:");
    expect(content).toContain('400: { normal: "Inter-Regular", italic: "Inter-Italic" }');
    expect(content).toContain("true: 16");
    expect(content).toContain('true: "400"');
  });

  it("emits light and dark createTheme configs from scheme token sets", () => {
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
    expect(content).toContain("const light = createTheme(");
    expect(content).toContain("const dark = createTheme(");
    expect(content).not.toContain("createV5Theme");
    expect(content).not.toContain("lightPalette:");
    expect(content).not.toContain("childrenThemes:");
    expect(content).not.toContain("getTheme:");
    expect(content).toContain("primary: tokens.color.primary.val");
    expect(content).toContain('primary: "#66b3ff"');
    expect(content).not.toContain("#99c2e6");
    expect(content).toContain("sm: 8");

    const install = documents["INSTALL.md"]?.chunks?.[0]?.content ?? "";
    expect(install).toContain("light, dark, and nested semantic themes");
    expect(install).toContain("defaultTheme=\"light\"");
    expect(install).toContain("boxShadow=\"$ringAccent\"");
  });

  it("keeps primitive palettes on createTokens and out of createTheme", () => {
    function nestedScale(
      hex: (step: number) => string,
      steps = 9
    ): Record<string, unknown> {
      const scale: Record<string, unknown> = { primitive: true };
      for (let step = 1; step <= steps; step++) {
        scale[String(step)] = { $value: hex(step) };
      }
      return scale;
    }

    const spec = {
      components: {},
      icons: {},
      fonts: {},
      tokens: {
        light: {
          color: {
            $type: "color",
            brand: {
              1: { $value: "#00ccaa" },
              2: { $value: "#006655" }
            },
            red: nestedScale(step => `#ff${(step * 10).toString(16).padStart(2, "0")}00`),
            base: nestedScale(step => `#f${step}f${step}f${step}`)
          }
        },
        dark: {
          color: {
            $type: "color",
            red: nestedScale(step => `#aa${(step * 10).toString(16).padStart(2, "0")}00`),
            base: nestedScale(step => `#1${step}1${step}1${step}`)
          }
        }
      }
    } as Schema;

    const flat = flattenTokens(spec.tokens);
    expect(flat.find(token => token.path === "color.red.1")?.primitive).toBe(true);
    expect(flat.find(token => token.path === "color.base.9")?.primitive).toBe(true);
    expect(flat.find(token => token.path === "color.brand.1")?.primitive).toBeUndefined();
    expect(
      isPaletteGroup({ palette: true, 1: { $value: "#fff" } })
    ).toBe(true);

    const content = renderConfig(spec, {
      useDefaultConfig: false,
      animations: false,
      includeTypeAugmentation: false
    });

    expect(content).not.toContain("childrenThemes:");
    expect(content).not.toContain("lightPalette:");
    expect(content).toContain("lightRed1:");
    expect(content).toContain("darkBase9:");
    expect(content).toContain('"#f1f1f1"');
    expect(content).toContain('"#191919"');
    const light = createThemeBlock(content, "light");
    expect(light).toContain("brand1:");
    expect(light).not.toContain("red1:");
    expect(content).not.toContain("const light_red");
  });

  it("maps token theme properties onto nested createTheme objects", () => {
    function nestedScale(
      hex: (step: number) => string,
      steps = 9
    ): Record<string, unknown> {
      const scale: Record<string, unknown> = { primitive: true };
      for (let step = 1; step <= steps; step++) {
        scale[String(step)] = { $value: hex(step) };
      }
      return scale;
    }

    const spec = {
      components: {},
      icons: {},
      fonts: {},
      tokens: {
        light: {
          color: {
            $type: "color",
            base: nestedScale(step => `#f${step}f${step}f${step}`),
            red: nestedScale(
              step => `#ff${(step * 10).toString(16).padStart(2, "0")}00`
            ),
            yellow: nestedScale(
              step => `#ffff${(step * 10).toString(16).padStart(2, "0")}`
            ),
            green: nestedScale(
              step => `#00ff${(step * 10).toString(16).padStart(2, "0")}`
            ),
            sky: nestedScale(
              step => `#00${(step * 10).toString(16).padStart(2, "0")}ff`
            ),
            purple: nestedScale(
              step => `#${(step * 10).toString(16).padStart(2, "0")}00ff`
            ),
            brand: {
              1: { $value: "#00ccaa" },
              2: { $value: "#006655" }
            },
            foreground: {
              danger: { $value: "{color.red.7}", theme: "danger" },
              warning: { $value: "{color.yellow.4}", theme: "warning" },
              success: { $value: "{color.green.6}", theme: "success" },
              info: { $value: "{color.sky.3}", theme: "info" },
              discovery: { $value: "{color.purple.7}", theme: "discovery" },
              accent: { $value: "{color.brand.1}", theme: "accent" },
              positive: { $value: "{color.green.4}", theme: "positive" },
              "on-danger": { $value: "{color.base.1}", theme: "danger" },
              "on-success": { $value: "{color.base.1}", theme: "success" }
            },
            background: {
              success: { $value: "{color.green.6}", theme: "success" },
              "success-subtle": { $value: "{color.green.9}", theme: "success" },
              "primary-subtle": {
                $value: "{color.base.2}",
                theme: "primary"
              }
            }
          }
        },
        dark: {
          color: {
            $type: "color",
            base: nestedScale(step => `#1${step}1${step}1${step}`),
            red: nestedScale(
              step => `#aa${(step * 10).toString(16).padStart(2, "0")}00`
            ),
            yellow: nestedScale(
              step => `#aaaa${(step * 10).toString(16).padStart(2, "0")}`
            ),
            green: nestedScale(
              step => `#00aa${(step * 10).toString(16).padStart(2, "0")}`
            ),
            sky: nestedScale(
              step => `#00${(step * 10).toString(16).padStart(2, "0")}aa`
            ),
            purple: nestedScale(
              step => `#${(step * 10).toString(16).padStart(2, "0")}00aa`
            ),
            brand: {
              1: { $value: "#00aa88" },
              2: { $value: "#003322" }
            },
            foreground: {
              danger: { $value: "{color.red.7}", theme: "danger" },
              warning: { $value: "{color.yellow.4}", theme: "warning" },
              success: { $value: "{color.green.6}", theme: "success" },
              info: { $value: "{color.sky.3}", theme: "info" },
              discovery: { $value: "{color.purple.7}", theme: "discovery" },
              accent: { $value: "{color.brand.1}", theme: "accent" },
              positive: { $value: "{color.green.4}", theme: "positive" },
              "on-danger": { $value: "{color.base.1}", theme: "danger" },
              "on-success": { $value: "{color.base.1}", theme: "success" }
            },
            background: {
              success: { $value: "{color.green.6}", theme: "success" },
              "success-subtle": { $value: "{color.green.9}", theme: "success" },
              "primary-subtle": {
                $value: "{color.base.2}",
                theme: "primary"
              }
            }
          }
        }
      }
    } as Schema;

    const content = renderConfig(spec, {
      useDefaultConfig: false,
      animations: false,
      includeTypeAugmentation: false
    });

    expect(content).toContain("const light_danger = createTheme(");
    expect(content).toContain("const dark_danger = createTheme(");
    expect(content).toContain("const light_warning = createTheme(");
    expect(content).toContain("const light_success = createTheme(");
    expect(content).toContain("const light_accent = createTheme(");
    expect(content).toContain("const light_primary = createTheme(");
    expect(content).toContain("light_primary");
    expect(content).toContain("dark_success");

    const danger = createThemeBlock(content, "light_danger");
    expect(danger).toContain("foreground:");
    expect(danger).toContain("foregroundOn:");
    expect(danger).not.toContain("foregroundDanger");

    const success = createThemeBlock(content, "light_success");
    expect(success).toContain("background:");
    expect(success).toContain("backgroundSubtle:");
    expect(success).toContain("foreground:");
    expect(success).toContain("foregroundOn:");

    const primary = createThemeBlock(content, "light_primary");
    expect(primary).toContain("backgroundSubtle:");
    expect(primary).not.toContain("backgroundPrimarySubtle");

    expect(content).toContain("tokens.color.lightRed7.val");
    expect(content).toContain("tokens.color.darkRed7.val");
    expect(content).toContain('"#00ccaa"');
    expect(content).toContain('"#00aa88"');
    expect(content).not.toContain("childrenThemes:");
    expect(content).not.toContain("getTheme:");
    expect(content).not.toContain("const light_red");
  });

  it("strips the theme name from semantic keys on the named theme", () => {
    const spec = {
      components: {},
      icons: {},
      fonts: {},
      tokens: {
        light: {
          color: {
            $type: "color",
            foreground: {
              primary: { $value: "#111111", theme: "primary" },
              secondary: { $value: "#444444", theme: "secondary" },
              tertiary: { $value: "#777777", theme: "tertiary" },
              "on-primary": { $value: "#fafafa", theme: "primary" }
            },
            background: {
              primary: { $value: "#ffffff", theme: "primary" },
              "primary-subtle": { $value: "#f5f5f5", theme: "primary" },
              secondary: { $value: "#eeeeee", theme: "secondary" },
              page: { $value: "#fafafa" }
            },
            border: {
              primary: { $value: "#cccccc", theme: "primary" },
              secondary: { $value: "#bbbbbb", theme: "secondary" }
            }
          }
        },
        dark: {
          color: {
            $type: "color",
            foreground: {
              primary: { $value: "#f5f5f5", theme: "primary" },
              secondary: { $value: "#aaaaaa", theme: "secondary" },
              tertiary: { $value: "#888888", theme: "tertiary" },
              "on-primary": { $value: "#0a0a0a", theme: "primary" }
            },
            background: {
              primary: { $value: "#111111", theme: "primary" },
              "primary-subtle": { $value: "#1a1a1a", theme: "primary" },
              secondary: { $value: "#222222", theme: "secondary" },
              page: { $value: "#0a0a0a" }
            },
            border: {
              primary: { $value: "#444444", theme: "primary" },
              secondary: { $value: "#555555", theme: "secondary" }
            }
          }
        }
      }
    } as Schema;

    const content = renderConfig(spec, {
      useDefaultConfig: false,
      animations: false,
      includeTypeAugmentation: false
    });

    const light = createThemeBlock(content, "light");
    expect(light).toContain("backgroundPage:");
    expect(light).not.toContain("backgroundPrimary:");
    expect(light).not.toContain("foregroundPrimary:");

    const lightPrimary = createThemeBlock(content, "light_primary");
    expect(lightPrimary).toMatch(/^\s*foreground:/m);
    expect(lightPrimary).toMatch(/^\s*foregroundOn:/m);
    expect(lightPrimary).toMatch(/^\s*background:/m);
    expect(lightPrimary).toMatch(/^\s*backgroundSubtle:/m);
    expect(lightPrimary).toMatch(/^\s*border:/m);
    expect(lightPrimary).not.toMatch(/^\s*backgroundPrimary/m);
    expect(lightPrimary).not.toMatch(/^\s*foregroundPrimary/m);

    const lightSecondary = createThemeBlock(content, "light_secondary");
    expect(lightSecondary).toContain("foreground:");
    expect(lightSecondary).toContain("background:");
    expect(lightSecondary).toContain("border:");

    const darkPrimary = createThemeBlock(content, "dark_primary");
    expect(darkPrimary).toContain("background:");
    expect(darkPrimary).toContain("backgroundSubtle:");
    expect(content).toContain("light_primary");
    expect(content).toContain("dark_tertiary");
  });

  it("puts untagged semantic colors on the light and dark base themes", () => {
    function nestedScale(
      hex: (step: number) => string,
      steps = 6
    ): Record<string, unknown> {
      const scale: Record<string, unknown> = { primitive: true };
      for (let step = 1; step <= steps; step++) {
        scale[String(step)] = { $value: hex(step) };
      }
      return scale;
    }

    const spec = {
      components: {},
      icons: {},
      fonts: {},
      tokens: {
        light: {
          color: {
            $type: "color",
            base: nestedScale(step => `#f${step}f${step}f${step}`),
            blue: nestedScale(step => `#0000f${step}`),
            yellow: nestedScale(step => `#ffff${step}${step}`),
            primary: { $value: "{color.blue.6}" },
            background: { $value: "{color.base.1}" },
            accent: { $value: "#00ccaa" },
            foreground: {
              warning: { $value: "{color.yellow.4}", theme: "warning" }
            }
          }
        },
        dark: {
          color: {
            $type: "color",
            base: nestedScale(step => `#1${step}1${step}1${step}`),
            blue: nestedScale(step => `#0000a${step}`),
            yellow: nestedScale(step => `#aaaa${step}${step}`),
            primary: { $value: "{color.blue.6}" },
            background: { $value: "{color.base.1}" },
            accent: { $value: "#00aa88" },
            foreground: {
              warning: { $value: "{color.yellow.4}", theme: "warning" }
            }
          }
        }
      }
    } as Schema;

    const content = renderConfig(spec, {
      useDefaultConfig: false,
      animations: false,
      includeTypeAugmentation: false
    });

    const light = createThemeBlock(content, "light");
    expect(light).toContain("background: tokens.color.lightBase1.val");
    expect(light).toContain("primary: tokens.color.lightBlue6.val");
    expect(light).toContain("accent: tokens.color.accent.val");
    expect(light).not.toContain("foregroundWarning");

    const dark = createThemeBlock(content, "dark");
    expect(dark).toContain("background: tokens.color.darkBase1.val");
    expect(dark).toContain("primary: tokens.color.darkBlue6.val");
    expect(dark).toContain('accent: "#00aa88"');

    const warning = createThemeBlock(content, "light_warning");
    expect(warning).toContain("foreground:");
    expect(warning).not.toContain("foregroundWarning");
    expect(content).not.toContain("var(--");
    expect(content).not.toContain("{color.");
    expect(content).toContain("export interface AppTheme {");
    expect(content).toContain("primary: string;");
    expect(content).toContain("background: string;");
    expect(content).toContain("accent: string;");
    expect(content).toContain("foreground: string;");
  });

  it("emits AppTheme from semantic createTheme keys", () => {
    const content = renderConfig(spec, {
      animations: false,
      includeTypeAugmentation: false
    });

    expect(content).not.toContain("interface V5Theme");
    expect(content).toContain("export interface AppTheme {");
    expect(content).toContain("backgroundAccent: string;");
    expect(content).toContain("blue1: string;");
    expect(content).not.toContain("gray1: string;");
  });

  it("emits CSS color strings and box-shadow strings in createTokens", () => {
    const insetLayer = {
      color: {
        colorSpace: "srgb",
        components: [0, 0, 0],
        alpha: 0.05,
        hex: "#000000"
      },
      offsetX: { value: 0, unit: "px" },
      offsetY: { value: 1, unit: "px" },
      blur: { value: 1, unit: "px" },
      spread: { value: 0, unit: "px" },
      inset: true
    };

    const spec = {
      components: {},
      icons: {},
      fonts: {},
      tokens: {
        light: {
          color: {
            $type: "color",
            brand: {
              primitive: true,
              1: { $value: "#00ccaa" },
              2: { $value: "#006655" }
            },
            primary: {
              $value: {
                colorSpace: "srgb",
                components: [0, 0.4, 0.8],
                hex: "#0066cc"
              }
            },
            foreground: {
              accent: { $value: "{color.brand.1}" }
            }
          },
          "inset-shadow": {
            xs: { $type: "shadow", $value: insetLayer }
          },
          shadow: {
            sm: {
              $type: "shadow",
              $value: { ...insetLayer, inset: false, offsetY: { value: 2, unit: "px" } }
            }
          }
        },
        dark: {
          color: {
            $type: "color",
            brand: {
              primitive: true,
              1: { $value: "#00aa88" },
              2: { $value: "#003322" }
            },
            foreground: {
              accent: { $value: "{color.brand.1}" }
            }
          }
        }
      }
    } as Schema;

    const flat = flattenTokens(spec.tokens);
    expect(
      flat.find(token => token.path === "inset-shadow.xs")?.category
    ).toBe("insetShadow");
    expect(flat.find(token => token.path === "inset-shadow.xs")?.tokenKey).toBe(
      "xs"
    );
    expect(flat.find(token => token.path === "inset-shadow.xs")?.tamaguiValue).toBe(
      "inset 0px 1px 1px 0px #0000000d"
    );

    const content = renderConfig(spec, {
      useDefaultConfig: false,
      animations: false,
      includeTypeAugmentation: false
    });

    expect(content).toContain("color: {");
    expect(content).toContain('primary: "#0066cc"');
    expect(content).toContain('lightBrand1: "#00ccaa"');
    expect(content).toContain('darkBrand1: "#00aa88"');
    expect(content).not.toContain("colorSpace");
    expect(content).toContain("shadow: {");
    expect(content).toContain("insetShadow: {");
    expect(content).toContain("xs:");
    expect(content).toContain("inset 0px 1px 1px 0px #0000000d");
    expect(content).not.toContain("insetShadowXs:");
    expect(content).not.toContain("[object Object]");
    expect(content).not.toMatch(/space:\s*\{[^}]*insetShadow/s);
  });

  it("resolves ring shadow color aliases to color constants", () => {
    const spec = {
      components: {},
      icons: {},
      fonts: {},
      tokens: {
        light: {
          color: {
            $type: "color",
            brand: {
              primitive: true,
              1: { $value: "#00ccaa" }
            },
            border: {
              accent: { $value: "{color.brand.1}" }
            }
          },
          ring: {
            accent: {
              $type: "shadow",
              $value: {
                color: "{color.border.accent}",
                offsetX: { value: 0, unit: "px" },
                offsetY: { value: 0, unit: "px" },
                blur: { value: 0, unit: "px" },
                spread: { value: 3, unit: "px" }
              }
            },
            "accent-subtle": {
              $type: "shadow",
              $value: {
                color: "{color.border.accent}",
                offsetX: { value: 0, unit: "px" },
                offsetY: { value: 0, unit: "px" },
                blur: { value: 0, unit: "px" },
                spread: { value: 1, unit: "px" }
              }
            }
          }
        }
      }
    } as Schema;

    const content = renderConfig(spec, {
      useDefaultConfig: false,
      animations: false,
      includeTypeAugmentation: false
    });

    const tokensBlock = tokensSource(content);
    const light = createThemeBlock(content, "light");

    expect(tokensBlock).not.toContain("ringAccent");
    expect(light).toContain('ringAccent: "0px 0px 0px 3px #00ccaa"');
    expect(light).toContain('ringAccentSubtle: "0px 0px 0px 1px #00ccaa"');
    expect(content).not.toContain("var(--color-border-accent)");
    expect(content).not.toContain("{color.border.accent}");
  });

  it("emits ring shadows on light and dark createTheme objects", () => {
    function nestedScale(
      hex: (step: number) => string,
      steps = 9
    ): Record<string, unknown> {
      const scale: Record<string, unknown> = { primitive: true };
      for (let step = 1; step <= steps; step++) {
        scale[String(step)] = { $value: hex(step) };
      }
      return scale;
    }

    const ringLayer = (color: string, spread: number) => ({
      $type: "shadow",
      $value: {
        color,
        offsetX: { value: 0, unit: "px" },
        offsetY: { value: 0, unit: "px" },
        blur: { value: 0, unit: "px" },
        spread: { value: spread, unit: "px" }
      }
    });

    const spec = {
      components: {},
      icons: {},
      fonts: {},
      tokens: {
        light: {
          color: {
            $type: "color",
            base: nestedScale(step => `#f${step}f${step}f${step}`),
            brand: {
              primitive: true,
              1: { $value: "#00ccaa" }
            },
            border: {
              primary: { $value: "{color.base.7}" },
              accent: { $value: "{color.brand.1}" }
            }
          },
          ring: {
            primary: ringLayer("{color.border.primary}", 3),
            accent: ringLayer("{color.border.accent}", 3)
          }
        },
        dark: {
          color: {
            $type: "color",
            base: nestedScale(step => `#1${step}1${step}1${step}`),
            brand: {
              primitive: true,
              1: { $value: "#00aa88" }
            },
            border: {
              primary: { $value: "{color.base.7}" },
              accent: { $value: "{color.brand.1}" }
            }
          },
          ring: {
            primary: ringLayer("{color.border.primary}", 3),
            accent: ringLayer("{color.border.accent}", 3)
          }
        }
      }
    } as Schema;

    const content = renderConfig(spec, {
      useDefaultConfig: false,
      animations: false,
      includeTypeAugmentation: false
    });

    const tokensBlock = tokensSource(content);
    const light = createThemeBlock(content, "light");
    const dark = createThemeBlock(content, "dark");

    expect(tokensBlock).not.toContain("ringPrimary");
    expect(tokensBlock).not.toContain("ringAccent");
    expect(light).toContain('ringPrimary: "0px 0px 0px 3px #f7f7f7"');
    expect(light).toContain('ringAccent: "0px 0px 0px 3px #00ccaa"');
    expect(dark).toContain('ringPrimary: "0px 0px 0px 3px #171717"');
    expect(dark).toContain('ringAccent: "0px 0px 0px 3px #00aa88"');
    expect(content).toContain("ringAccent: string;");
    expect(content).toContain("ringPrimary: string;");
    expect(content).not.toContain("var(--");
    expect(content).not.toContain("{color.");
  });

  it("maps themed shadow tokens onto nested createTheme objects", () => {
    const ringLayer = (color: string, spread: number) => ({
      $type: "shadow" as const,
      $value: {
        color,
        offsetX: { value: 0, unit: "px" },
        offsetY: { value: 0, unit: "px" },
        blur: { value: 0, unit: "px" },
        spread: { value: spread, unit: "px" }
      }
    });

    const spec = {
      components: {},
      icons: {},
      fonts: {},
      tokens: {
        light: {
          color: {
            $type: "color",
            brand: { primitive: true, 1: { $value: "#00ccaa" } },
            background: {
              primary: { $value: "#ffffff", theme: "primary" }
            }
          },
          ring: {
            primary: { ...ringLayer("#111111", 3), theme: "primary" },
            "primary-subtle": { ...ringLayer("#222222", 1), theme: "primary" },
            accent: { ...ringLayer("{color.brand.1}", 3), theme: "accent" }
          },
          shadow: {
            primary: {
              $type: "shadow",
              theme: "primary",
              $value: {
                color: "#00000026",
                offsetX: { value: 0, unit: "px" },
                offsetY: { value: 1, unit: "px" },
                blur: { value: 2, unit: "px" },
                spread: { value: 0, unit: "px" }
              }
            },
            "accent-subtle": {
              $type: "shadow",
              theme: "accent",
              $value: {
                color: "#00ccaa33",
                offsetX: { value: 0, unit: "px" },
                offsetY: { value: 4, unit: "px" },
                blur: { value: 8, unit: "px" },
                spread: { value: 0, unit: "px" }
              }
            }
          }
        }
      }
    } as Schema;

    const content = renderConfig(spec, {
      useDefaultConfig: false,
      animations: false,
      includeTypeAugmentation: false
    });

    const light = createThemeBlock(content, "light");
    expect(light).not.toMatch(/^\s*ringPrimary:/m);
    expect(light).not.toMatch(/^\s*ringAccent:/m);

    const primary = createThemeBlock(content, "light_primary");
    expect(primary).toMatch(/^\s*background:/m);
    expect(primary).toMatch(/^\s*ring:/m);
    expect(primary).toMatch(/^\s*ringSubtle:/m);
    expect(primary).toMatch(/^\s*shadow:/m);
    expect(primary).toContain('ring: "0px 0px 0px 3px #111111"');
    expect(primary).toContain('ringSubtle: "0px 0px 0px 1px #222222"');
    expect(primary).toContain('shadow: "0px 1px 2px 0px #00000026"');
    expect(primary).not.toMatch(/^\s*ringPrimary:/m);
    expect(primary).not.toMatch(/^\s*shadowPrimary:/m);

    const accent = createThemeBlock(content, "light_accent");
    expect(accent).toMatch(/^\s*ring:/m);
    expect(accent).toMatch(/^\s*shadowSubtle:/m);
    expect(accent).toContain('ring: "0px 0px 0px 3px #00ccaa"');
    expect(accent).toContain('shadowSubtle: "0px 4px 8px 0px #00ccaa33"');
  });

  it("emits fontSize, dropShadow, and textShadow as createTokens categories", () => {
    const shadowLayer = {
      color: {
        colorSpace: "srgb",
        components: [0, 0, 0],
        alpha: 0.15,
        hex: "#000000"
      },
      offsetX: { value: 0, unit: "px" },
      offsetY: { value: 1, unit: "px" },
      blur: { value: 2, unit: "px" },
      spread: { value: 0, unit: "px" }
    };

    const spec = {
      components: {},
      icons: {},
      fonts: {},
      tokens: {
        size: {
          $type: "dimension",
          sm: { $value: { value: 8, unit: "px" } }
        },
        "font-size": {
          $type: "dimension",
          sm: { $value: { value: 0.875, unit: "rem" } },
          base: { $value: { value: 1, unit: "rem" } }
        },
        "drop-shadow": {
          sm: { $type: "shadow", $value: shadowLayer }
        },
        "text-shadow": {
          xs: { $type: "shadow", $value: shadowLayer }
        }
      }
    } as Schema;

    const content = renderConfig(spec, {
      useDefaultConfig: false,
      animations: false,
      includeTypeAugmentation: false
    });

    expect(content).toContain("fontSize: {");
    expect(content).toContain("sm: px(14)");
    expect(content).toContain("base: px(16)");
    expect(content).not.toContain("fontSizeSm:");
    expect(content).toMatch(/size:\s*\{[^}]*sm:\s*8/s);
    expect(content).toContain("dropShadow: {");
    expect(content).toContain("drop-shadow(0px 1px 2px #00000026)");
    expect(content).toContain("textShadow: {");
    expect(content).not.toContain("dropShadowSm:");
    expect(content).not.toContain("textShadowXs:");
  });

  it("resolves semantic border-radius aliases into createTokens radius", () => {
    const spec = {
      components: {},
      icons: {},
      fonts: {},
      tokens: {
        "border-radius": {
          $type: "dimension",
          lg: { $value: { value: 0.5, unit: "rem" } },
          md: { $value: { value: 0.375, unit: "rem" } },
          sm: { $value: { value: 0.25, unit: "rem" } },
          xs: { $value: { value: 0.125, unit: "rem" } },
          container: { $value: "{border-radius.lg}" },
          card: { $value: "{border-radius.md}" },
          trigger: { $value: "{border-radius.sm}" },
          control: { $value: "{border-radius.xs}" },
          dialog: { $value: "{border-radius.xs}" },
          popover: { $value: "{border-radius.xs}" },
          tooltip: { $value: "{border-radius.xs}" }
        }
      }
    } as Schema;

    const content = renderConfig(spec, {
      useDefaultConfig: false,
      animations: false,
      includeTypeAugmentation: false
    });

    const tokensBlock = tokensSource(content);

    expect(tokensBlock).toContain("radius: {");
    expect(tokensBlock).toContain("lg: 8");
    expect(tokensBlock).toContain("md: 6");
    expect(tokensBlock).toContain("sm: 4");
    expect(tokensBlock).toContain("xs: 2");
    expect(tokensBlock).toContain("container: 8");
    expect(tokensBlock).toContain("card: 6");
    expect(tokensBlock).toContain("trigger: 4");
    expect(tokensBlock).toContain("control: 2");
    expect(tokensBlock).toContain("dialog: 2");
    expect(tokensBlock).toContain("popover: 2");
    expect(tokensBlock).toContain("tooltip: 2");
    expect(tokensBlock).not.toContain("{border-radius");
    expect(tokensBlock).not.toContain("var(--border-radius");
  });
});
