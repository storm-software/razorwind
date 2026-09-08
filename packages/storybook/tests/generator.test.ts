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
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { flattenTokens } from "../src/flatten";
import { formatTokenValue, toCssVar } from "../src/format";
import {
  generateTokenDocs,
  normalizeThemes,
  renderThemeFile
} from "../src/generate";
import storybook, {
  type StorybookPluginOptions,
  type StorybookTheme
} from "../src/index";

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
    }
  },
  font: {
    family: {
      sans: {
        $type: "fontFamily",
        $value: ["Inter", "system-ui", "sans-serif"]
      }
    },
    size: {
      $type: "dimension",
      sm: { $value: { value: 14, unit: "px" } },
      md: { $value: { value: 16, unit: "px" } },
      lg: { $value: { value: 20, unit: "px" } }
    }
  },
  spacing: {
    $type: "dimension",
    sm: { $value: { value: 8, unit: "px" } }
  }
} satisfies Schema["tokens"];

const spec = {
  components: {},
  icons: {
    home: {
      name: "home",
      title: "Home",
      files: [
        {
          path: "assets/icons/home.svg",
          type: "svg",
          content:
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5V21H3z"/></svg>'
        }
      ]
    }
  },
  fonts: {},
  tokens
} as Schema;

describe("formatTokenValue", () => {
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

  it("formats dimensions", () => {
    expect(formatTokenValue({ value: 8, unit: "px" }, "dimension")).toBe("8px");
  });

  it("builds css vars from paths", () => {
    expect(toCssVar("color.primary", "rw")).toBe("--rw-color-primary");
  });
});

describe("flattenTokens", () => {
  it("walks nested DTCG tokens", () => {
    const flat = flattenTokens(spec.tokens);
    expect(flat.map(token => token.path)).toEqual(
      expect.arrayContaining([
        "color.primary",
        "color.secondary",
        "font.family.sans",
        "font.size.sm",
        "spacing.sm"
      ])
    );
    expect(flat.find(token => token.path === "color.primary")?.cssValue).toBe(
      "#0066cc"
    );
  });

  it("omits tokens marked skipDocs", () => {
    const flat = flattenTokens({
      color: {
        visible: { $type: "color", $value: "#0066cc" },
        hidden: { $type: "color", $value: "#663399", skipDocs: true }
      }
    } as Schema["tokens"]);

    expect(flat.map(token => token.path)).toEqual(["color.visible"]);
  });

  it("preserves palette and semantic color metadata without clobbering token-set themes", () => {
    const flat = flattenTokens({
      dark: {
        color: {
          palette: {
            palette: true,
            1: { $type: "color", $value: "#111111" }
          },
          foreground: {
            danger: {
              $type: "color",
              $value: "{color.palette.1}",
              theme: "danger"
            }
          }
        }
      }
    } as unknown as Schema["tokens"]);

    expect(flat.find(token => token.path === "color.palette.1")).toEqual(
      expect.objectContaining({ theme: "dark", palette: true })
    );
    expect(
      flat.find(token => token.path === "color.foreground.danger")
    ).toEqual(expect.objectContaining({ theme: "dark", childTheme: "danger" }));
  });
});

describe("storybook plugin", () => {
  it("is a Razorwind Plugin", () => {
    const plugin = storybook({});
    expect(plugin.name).toBe("storybook");
    expect(plugin).toEqual(
      expect.objectContaining({ themeGeneration: "combined" })
    );
    expect(typeof plugin.generate).toBe("function");
  });

  it("generates Storybook token doc blocks from the schema", async () => {
    const plugin = storybook({ outputPath: "docs/tokens" });
    const documents = await plugin.generate!(spec, {} as never);

    expect(Object.keys(documents)).toEqual(
      expect.arrayContaining([
        "docs/tokens/blocks/ColorPalette.tsx",
        "docs/tokens/blocks/Typeset.tsx",
        "docs/tokens/blocks/TokenTable.tsx",
        "docs/tokens/blocks/IconGallery.tsx",
        "docs/tokens/blocks/index.ts",
        "docs/tokens/Tokens.mdx",
        "docs/tokens/Colors.mdx",
        "docs/tokens/Typography.mdx",
        "docs/tokens/Icons.mdx",
        "docs/tokens/tokens.json",
        "docs/tokens/INSTALL.md"
      ])
    );

    const colors =
      documents["docs/tokens/blocks/ColorPalette.tsx"]?.chunks?.[0]?.content;
    expect(colors).toContain('from "@storybook/addon-docs/blocks"');
    expect(colors).toContain("ColorPalette");
    expect(colors).toContain("ColorItem");
    expect(colors).toContain("#0066cc");

    const overview = documents["docs/tokens/Tokens.mdx"]?.chunks?.[0]?.content;
    expect(overview).toContain("<ColorPaletteBlock />");
    expect(overview).toContain("<TokenTableBlock />");

    const icons =
      documents["docs/tokens/blocks/IconGallery.tsx"]?.chunks?.[0]?.content;
    expect(icons).toContain("IconGallery");
    expect(icons).toContain("IconItem");
    expect(icons).toContain("home");
    expect(documents["docs/tokens/Icons.mdx"]?.chunks?.[0]?.content).toContain(
      "<IconGalleryBlock />"
    );
  });

  it("renders referenced colors as their underlying literal in token docs", () => {
    const documents = generateTokenDocs(
      {
        ...spec,
        tokens: {
          color: {
            $type: "color",
            red: {
              9: { $value: "#7f0005" }
            },
            danger: { $value: "var(--color-red-9)" },
            warning: { $value: "{color.red.9}" }
          }
        }
      } as Schema,
      { outputPath: "out" }
    );

    const colors =
      documents["out/blocks/ColorPalette.tsx"]?.chunks?.[0]?.content;
    const table = documents["out/blocks/TokenTable.tsx"]?.chunks?.[0]?.content;

    expect(colors).toContain('"danger": "#7f0005"');
    expect(colors).toContain('"warning": "#7f0005"');
    expect(table).toContain('value: "#7f0005"');
    expect(colors).not.toContain("var(--color-red-9)");
    expect(table).not.toContain("var(--color-red-9)");
  });

  it("omits icon documentation when the schema has no icons", () => {
    const documents = generateTokenDocs(
      { ...spec, icons: {} },
      { outputPath: "out" }
    );

    expect(documents["out/Icons.mdx"]).toBeUndefined();
    expect(documents["out/blocks/IconGallery.tsx"]).toBeUndefined();
    expect(
      documents["out/blocks/index.ts"]?.chunks?.[0]?.content
    ).not.toContain("IconGallery");
  });

  it("separates palette, semantic, and unmarked colors into doc sections", () => {
    const documents = generateTokenDocs(
      {
        ...spec,
        tokens: {
          color: {
            yellow: {
              palette: true,
              1: { $type: "color", $value: "#ffee99" }
            },
            foreground: {
              danger: {
                $type: "color",
                $value: "{color.yellow.1}",
                theme: "danger"
              }
            },
            black: { $type: "color", $value: "#000000" }
          }
        }
      } as Schema,
      { outputPath: "out" }
    );

    const colors =
      documents["out/blocks/ColorPalette.tsx"]?.chunks?.[0]?.content;
    expect(colors).toContain("<h2>Color palettes</h2>");
    expect(colors).toContain("<h2>Semantic colors</h2>");
    expect(colors).toContain("<h2>Colors</h2>");
    expect(colors?.match(/<ColorPalette>/g)).toHaveLength(3);
  });

  it("keeps the single color palette block when no color metadata is present", () => {
    const documents = generateTokenDocs(spec, { outputPath: "out" });
    const colors =
      documents["out/blocks/ColorPalette.tsx"]?.chunks?.[0]?.content;

    expect(colors?.match(/<ColorPalette>/g)).toHaveLength(1);
    expect(colors).not.toContain("<h2>");
  });

  it("generateTokenDocs mirrors the plugin generate output", () => {
    const documents = generateTokenDocs(spec, { outputPath: "out" });
    expect(
      documents["out/blocks/TokenTable.tsx"]?.chunks?.[0]?.content
    ).toContain("TokenTableBlock");
  });

  it("writes a Storybook theme when mapTheme is provided", () => {
    const documents = generateTokenDocs(spec, {
      outputPath: "out",
      mapTheme: (tokens: Schema["tokens"]): StorybookTheme => ({
        base: "light",
        colorPrimary: (
          tokens.color as Record<string, { $value?: { hex?: string } }>
        )?.primary?.$value?.hex as string,
        fontBase: (tokens.font as Record<string, Tokens>)?.family
          ?.sans as string,
        brandTitle: "Razorwind"
      })
    }) satisfies StorybookPluginOptions;

    const theme = documents["out/theme.ts"]?.chunks?.[0]?.content;
    expect(theme).toContain('from "storybook/theming"');
    expect(theme).toContain("export default create({");
    expect(theme).toContain('base: "light"');
    expect(theme).toContain('colorPrimary: "#0066cc"');
    expect(theme).toContain('brandTitle: "Razorwind"');
  });

  it("uses spec.fonts for Typeset and theme fontBase when mapTheme omits them", () => {
    const documents = generateTokenDocs(
      {
        ...spec,
        fonts: {
          inter: {
            name: "inter",
            title: "Inter",
            source: "google",
            family: "Inter",
            role: "sans"
          },
          mono: {
            name: "mono",
            title: "JetBrains Mono",
            source: "google",
            family: "JetBrains Mono",
            role: "mono"
          }
        }
      },
      {
        outputPath: "out",
        mapTheme: () => ({ base: "dark" })
      }
    );

    const typeset = documents["out/blocks/Typeset.tsx"]?.chunks?.[0]?.content;
    expect(typeset).toContain("Inter");
    const theme = documents["out/theme.ts"]?.chunks?.[0]?.content;
    expect(theme).toContain("fontBase:");
    expect(theme).toContain("fontCode:");
    expect(theme).toContain("JetBrains Mono");
  });

  it("skips theme.ts when mapTheme is omitted", () => {
    const documents = generateTokenDocs(spec, { outputPath: "out" });
    expect(documents["out/theme.ts"]).toBeUndefined();
  });

  it("writes a single theme.ts combining named mapTheme results", () => {
    const documents = generateTokenDocs(spec, {
      outputPath: "out",
      mapTheme: () => ({
        light: { base: "light", colorPrimary: "#ffffff" },
        dark: { base: "dark", colorPrimary: "#111111" }
      })
    });

    expect(documents["out/theme.ts"]).toBeDefined();
    expect(documents["out/theme-light.ts"]).toBeUndefined();
    expect(documents["out/theme-dark.ts"]).toBeUndefined();

    const theme = documents["out/theme.ts"]?.chunks?.[0]?.content;
    expect(theme).toContain('from "storybook/theming"');
    expect(theme).toContain("export default {");
    expect(theme).toContain("light: create({");
    expect(theme).toContain("dark: create({");
    expect(theme).toContain('base: "light"');
    expect(theme).toContain('base: "dark"');
    expect(theme).toContain('colorPrimary: "#ffffff"');
    expect(theme).toContain('colorPrimary: "#111111"');

    const install = documents["out/INSTALL.md"]?.chunks?.[0]?.content;
    expect(install).toContain("`theme.ts`");
    expect(install).not.toContain("theme-light.ts");
    expect(install).toContain('themes["light"]');
  });

  it("maps each token set into one combined theme.ts record", () => {
    const documents = generateTokenDocs(
      {
        ...spec,
        tokens: {
          light: {
            color: {
              $type: "color",
              primary: { $value: "#eeeeee" }
            }
          },
          dark: {
            color: {
              $type: "color",
              primary: { $value: "#111111" }
            }
          }
        }
      } as Schema,
      {
        outputPath: "out",
        mapTheme: input => ({
          colorPrimary: flattenTokens(input).find(
            token => token.path === "color.primary"
          )?.cssValue
        })
      }
    );

    expect(documents["out/theme.ts"]).toBeDefined();
    expect(documents["out/theme-light.ts"]).toBeUndefined();
    expect(documents["out/theme-dark.ts"]).toBeUndefined();

    const theme = documents["out/theme.ts"]?.chunks?.[0]?.content;
    expect(theme).toContain("export default {");
    expect(theme).toContain("light: create({");
    expect(theme).toContain("dark: create({");
    expect(theme).toContain('base: "light"');
    expect(theme).toContain('base: "dark"');
    expect(theme).toContain('colorPrimary: "#eeeeee"');
    expect(theme).toContain('colorPrimary: "#111111"');
  });

  it("generates token-doc variants that follow Storybook's theme global", () => {
    const documents = generateTokenDocs(
      {
        ...spec,
        tokens: {
          light: {
            color: {
              $type: "color",
              primary: { $value: "#eeeeee" }
            },
            font: {
              size: {
                $type: "dimension",
                md: { $value: { value: 16, unit: "px" } }
              }
            }
          },
          dark: {
            color: {
              $type: "color",
              primary: { $value: "#111111" }
            },
            font: {
              size: {
                $type: "dimension",
                md: { $value: { value: 18, unit: "px" } }
              }
            }
          }
        }
      } as Schema,
      { outputPath: "out" }
    );

    const colors =
      documents["out/blocks/ColorPalette.tsx"]?.chunks?.[0]?.content;
    const typeset = documents["out/blocks/Typeset.tsx"]?.chunks?.[0]?.content;
    const table = documents["out/blocks/TokenTable.tsx"]?.chunks?.[0]?.content;
    const selector =
      documents["out/blocks/ThemeVariant.ts"]?.chunks?.[0]?.content;
    const install = documents["out/INSTALL.md"]?.chunks?.[0]?.content;

    expect(colors).toContain('"light": (');
    expect(colors).toContain('"dark": (');
    expect(colors).toContain('useThemeVariant(COLOR_VARIANTS, "light", theme)');
    expect(typeset).toContain("fontSizes={[16]}");
    expect(typeset).toContain("fontSizes={[18]}");
    expect(table).toContain("TOKEN_VARIANTS");
    expect(selector).toContain("const candidate = theme ?? globals.theme");
    expect(install).toContain("Token-doc variants");

    for (const block of [colors, typeset, table, selector]) {
      expect(block).toBeDefined();
      expect(
        ts.transpile(block!, {
          jsx: ts.JsxEmit.ReactJSX,
          target: ts.ScriptTarget.ESNext
        }).diagnostics ?? []
      ).toEqual([]);
    }
  });

  it("resolves DTCG aliases in mapTheme $value fields to underlying colors", () => {
    const documents = generateTokenDocs(
      {
        ...spec,
        tokens: {
          light: {
            color: {
              $type: "color",
              base: {
                1: { $value: "#ffffff" }
              },
              foreground: {
                primary: { $value: "{color.base.1}" }
              }
            }
          },
          dark: {
            color: {
              $type: "color",
              base: {
                1: { $value: "#111111" }
              },
              foreground: {
                primary: { $value: "{color.base.1}" }
              }
            }
          }
        }
      } as Schema,
      {
        outputPath: "out",
        mapTheme: tokens => {
          const tree = tokens as Record<
            string,
            {
              color?: {
                foreground?: { primary?: { $value?: unknown } };
              };
            }
          >;

          return {
            light: {
              base: "light",
              textColor: tree.light?.color?.foreground?.primary
                ?.$value as string
            },
            dark: {
              base: "dark",
              textColor: tree.dark?.color?.foreground?.primary?.$value as string
            }
          };
        }
      }
    );

    const theme = documents["out/theme.ts"]?.chunks?.[0]?.content;
    expect(theme).toContain('textColor: "#ffffff"');
    expect(theme).toContain('textColor: "#111111"');
    expect(theme).not.toContain("{color.base.1}");
    expect(theme).not.toContain("var(--");
  });

  it("resolves alias chains and formats DTCG color objects in mapTheme values", () => {
    const documents = generateTokenDocs(
      {
        ...spec,
        tokens: {
          color: {
            $type: "color",
            base: {
              1: {
                $value: {
                  colorSpace: "srgb",
                  components: [0.067, 0.067, 0.067],
                  hex: "#111111"
                }
              }
            },
            foreground: {
              primary: { $value: "{color.base.1}" },
              brand: { $value: "{color.foreground.primary}" }
            }
          }
        }
      } as Schema,
      {
        outputPath: "out",
        mapTheme: tokens => {
          const color = (
            tokens as {
              color?: {
                foreground?: {
                  brand?: { $value?: unknown };
                };
                base?: { 1?: { $value?: unknown } };
              };
            }
          ).color;

          return {
            base: "dark" as const,
            textColor: color?.foreground?.brand?.$value as string,
            appBg: color?.base?.[1]?.$value as string
          };
        }
      }
    );

    const theme = documents["out/theme.ts"]?.chunks?.[0]?.content;
    expect(theme).toContain('textColor: "#111111"');
    expect(theme).toContain('appBg: "#111111"');
    expect(theme).not.toContain("{color.");
    expect(theme).not.toContain("colorSpace");
  });

  it("resolves aliases when mapTheme is invoked per token set", () => {
    const documents = generateTokenDocs(
      {
        ...spec,
        tokens: {
          light: {
            color: {
              $type: "color",
              base: { 1: { $value: "#fafafa" } },
              foreground: { primary: { $value: "{color.base.1}" } }
            }
          },
          dark: {
            color: {
              $type: "color",
              base: { 1: { $value: "#0a0a0a" } },
              foreground: { primary: { $value: "{color.base.1}" } }
            }
          }
        }
      } as Schema,
      {
        outputPath: "out",
        mapTheme: input => ({
          textColor: (
            input as {
              color?: { foreground?: { primary?: { $value?: unknown } } };
            }
          ).color?.foreground?.primary?.$value as string
        })
      }
    );

    const theme = documents["out/theme.ts"]?.chunks?.[0]?.content;
    expect(theme).toContain("light: create({");
    expect(theme).toContain("dark: create({");
    expect(theme).toContain('textColor: "#fafafa"');
    expect(theme).toContain('textColor: "#0a0a0a"');
    expect(theme).not.toContain("{color.base.1}");
  });

  it("quotes non-identifier theme names in the combined record", () => {
    const content = renderThemeFile({
      light: { base: "light", colorPrimary: "#fff" },
      "high-contrast": { base: "dark", colorPrimary: "#000" }
    });

    expect(content).toContain("light: create({");
    expect(content).toContain('"high-contrast": create({');
  });
});

describe("normalizeThemes", () => {
  it("keeps a mapTheme record as one named record", () => {
    const themes = normalizeThemes(
      {
        light: { colorPrimary: "#fff" },
        dark: { colorPrimary: "#000" }
      },
      spec,
      { title: "Demo" },
      () => ({ base: "light" })
    );

    expect(Object.keys(themes)).toEqual(["light", "dark"]);
    expect(themes.light?.base).toBe("light");
    expect(themes.dark?.base).toBe("dark");
    expect(themes.light?.brandTitle).toBe("Demo");
  });

  it("returns empty when mapTheme output is not a theme", () => {
    expect(
      normalizeThemes("nope", spec, {}, () => ({ base: "light" }))
    ).toEqual({});
  });
});
