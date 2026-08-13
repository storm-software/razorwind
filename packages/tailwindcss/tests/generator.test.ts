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
import extract from "../src/extract";
import generate, {
  flattenThemeTokens,
  generateTailwindCss,
  renderTailwindCss,
  toThemeCssVar
} from "../src/generate";

const tokens = {
  color: {
    $type: "color",
    primary: {
      $value: {
        colorSpace: "srgb",
        components: [0, 0.4, 0.8],
        hex: "#0066cc"
      }
    },
    secondary: {
      $value: "#663399"
    }
  },
  spacing: {
    $type: "dimension",
    sm: { $value: { value: 0.5, unit: "rem" } }
  },
  radius: {
    $type: "dimension",
    DEFAULT: { $value: { value: 4, unit: "px" } },
    lg: { $value: { value: 12, unit: "px" } }
  }
} satisfies Schema["tokens"];

const spec = {
  components: {},
  icons: {}, fonts: {},
  tokens
} as Schema;

describe("toThemeCssVar", () => {
  it("maps token paths onto Tailwind theme custom properties", () => {
    expect(toThemeCssVar("color.primary")).toBe("--color-primary");
    expect(toThemeCssVar("radius.DEFAULT")).toBe("--radius");
    expect(toThemeCssVar("radius.lg")).toBe("--radius-lg");
  });
});

describe("flattenThemeTokens / renderTailwindCss", () => {
  it("flattens DTCG tokens into @theme rows", () => {
    const flat = flattenThemeTokens(spec.tokens);
    expect(flat.map(token => token.cssVar)).toEqual(
      expect.arrayContaining([
        "--color-primary",
        "--color-secondary",
        "--spacing-sm",
        "--radius",
        "--radius-lg"
      ])
    );
    expect(flat.find(token => token.path === "color.primary")?.cssValue).toBe(
      "#0066cc"
    );
  });

  it("renders a Tailwind v4 CSS entry", () => {
    const css = renderTailwindCss(flattenThemeTokens(spec.tokens));
    expect(css).toContain(`@import "tailwindcss";`);
    expect(css).toContain("@theme {");
    expect(css).toContain("--color-primary: #0066cc;");
    expect(css).toContain("--spacing-sm: 0.5rem;");
    expect(css).toContain("--radius: 4px;");
  });

  it("assigns reused tokens as CSS var() references", () => {
    const aliased = {
      color: {
        $type: "color",
        brand: { $value: "#0066cc" },
        accent: { $value: "{color.brand}" },
        border: {
          disabled: { $value: "{color.neutral.800}" }
        },
        neutral: {
          800: { $value: "#35373a" }
        }
      }
    } satisfies Schema["tokens"];

    const css = renderTailwindCss(flattenThemeTokens(aliased));
    expect(css).toContain("--color-accent: var(--color-brand);");
    expect(css).toContain(
      "--color-border-disabled: var(--color-neutral-800);"
    );
    expect(css).toContain("--color-neutral-800: #35373a;");
    expect(css).not.toContain("{color.");
  });

  it("formats multi-layer shadows as CSS box-shadow", () => {
    const shadowed = {
      shadow: {
        $type: "shadow",
        lg: {
          $value: [
            {
              color: {
                colorSpace: "srgb",
                components: [0, 0, 0],
                alpha: 0.1,
                hex: "#000000"
              },
              offsetX: { value: 0, unit: "px" },
              offsetY: { value: 10, unit: "px" },
              blur: { value: 15, unit: "px" },
              spread: { value: -3, unit: "px" }
            },
            {
              color: {
                colorSpace: "srgb",
                components: [0, 0, 0],
                alpha: 0.1,
                hex: "#000000"
              },
              offsetX: { value: 0, unit: "px" },
              offsetY: { value: 4, unit: "px" },
              blur: { value: 6, unit: "px" },
              spread: { value: -4, unit: "px" }
            }
          ]
        }
      }
    } satisfies Schema["tokens"];

    const css = renderTailwindCss(flattenThemeTokens(shadowed));
    expect(css).toContain(
      "--shadow-lg: 0px 10px 15px -3px #0000001a, 0px 4px 6px -4px #0000001a;"
    );
    expect(css).not.toContain("[object Object]");
  });
});

describe("tailwindcss extract plugin", () => {
  it("is a Razorwind Plugin", () => {
    const plugin = extract({});
    expect(plugin.name).toBe("tailwindcss:extract");
    expect(typeof plugin.extract).toBe("function");
  });

  it("leaves existing tokens untouched", async () => {
    const plugin = extract({});
    const existing = {
      color: { primary: { $type: "color", $value: "#000" } }
    };

    const result = await plugin.extract!(
      { tokens: existing, components: {}, icons: {}, fonts: {} },
      {
        cwd: process.cwd(),
        registryPath: process.cwd(),
        plugins: [plugin],
        envPaths: {
          data: "",
          config: "",
          cache: "",
          log: "",
          temp: "",
          home: ""
        }
      } as never
    );

    expect(result.tokens).toBe(existing);
  });
});

describe("tailwindcss generate plugin", () => {
  it("is a Razorwind Plugin", () => {
    const plugin = generate({ cssPath: "src/theme.css" });
    expect(plugin.name).toBe("tailwindcss:generate");
    expect(typeof plugin.generate).toBe("function");
  });

  it("generates Tailwind CSS from schema tokens", async () => {
    const plugin = generate({ cssPath: "src/theme.css" });
    const documents = await plugin.generate!(spec, {} as never);

    expect(Object.keys(documents)).toEqual([
      "src/theme.css",
      "src/INSTALL.md"
    ]);
    const css = documents["src/theme.css"]?.chunks?.[0]?.content;
    expect(css).toContain(`@import "tailwindcss";`);
    expect(css).toContain("--color-primary: #0066cc;");
    expect(css).toContain("--radius-lg: 12px;");
  });

  it("generateTailwindCss mirrors the plugin generate output", async () => {
    const documents = await generateTailwindCss(spec, {
      cssPath: "out/app.css",
      includeImport: false
    });

    const css = documents["out/app.css"]?.chunks?.[0]?.content;
    expect(css).not.toContain(`@import "tailwindcss";`);
    expect(css).toContain("@theme {");
    expect(css).toContain("--color-secondary: #663399;");
    expect(documents["out/INSTALL.md"]).toBeDefined();
  });

  it("emits Google Fonts imports and --font-role theme vars", async () => {
    const documents = await generateTailwindCss(
      {
        ...spec,
        fonts: {
          inter: {
            name: "inter",
            title: "Inter",
            source: "google",
            family: "Inter",
            role: "sans",
            weights: [400, 700],
            display: "swap"
          }
        }
      },
      { cssPath: "out/app.css", includeImport: true }
    );

    const css = documents["out/app.css"]?.chunks?.[0]?.content;
    expect(css).toContain(
      '@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap");'
    );
    expect(css).toContain("--font-sans:");
    expect(css.indexOf("@import url(")).toBeLessThan(
      css?.indexOf('@import "tailwindcss"') ?? -1
    );
  });
});
