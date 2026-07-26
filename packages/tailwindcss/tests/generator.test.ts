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
});

describe("tailwindcss extract plugin", () => {
  it("is a Razorwind Plugin", () => {
    const plugin = extract();
    expect(plugin.name).toBe("tailwindcss:extract");
    expect(typeof plugin.extract).toBe("function");
  });

  it("leaves existing tokens untouched", async () => {
    const plugin = extract();
    const existing = {
      color: { primary: { $type: "color", $value: "#000" } }
    };

    const result = await plugin.extract!(
      { tokens: existing, components: {} },
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

    expect(Object.keys(documents)).toEqual(["src/theme.css"]);
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
  });
});
