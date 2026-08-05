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
import { flattenTokens } from "../src/flatten";
import { formatTokenValue, toCssVar } from "../src/format";
import { generateTokenDocs } from "../src/generate";
import storybook from "../src/index";

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
});

describe("storybook plugin", () => {
  it("is a Razorwind Plugin", () => {
    const plugin = storybook({});
    expect(plugin.name).toBe("storybook");
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
        "docs/tokens/blocks/index.ts",
        "docs/tokens/Tokens.mdx",
        "docs/tokens/Colors.mdx",
        "docs/tokens/Typography.mdx",
        "docs/tokens/tokens.json"
      ])
    );

    const colors = documents["docs/tokens/blocks/ColorPalette.tsx"]?.chunks?.[0]
      ?.content;
    expect(colors).toContain('from "@storybook/addon-docs/blocks"');
    expect(colors).toContain("ColorPalette");
    expect(colors).toContain("ColorItem");
    expect(colors).toContain("#0066cc");

    const overview = documents["docs/tokens/Tokens.mdx"]?.chunks?.[0]?.content;
    expect(overview).toContain("<ColorPaletteBlock />");
    expect(overview).toContain("<TokenTableBlock />");
  });

  it("generateTokenDocs mirrors the plugin generate output", () => {
    const documents = generateTokenDocs(spec, { outputPath: "out" });
    expect(documents["out/blocks/TokenTable.tsx"]?.chunks?.[0]?.content).toContain(
      "TokenTableBlock"
    );
  });

  it("writes a Storybook theme when generateTheme is provided", () => {
    const documents = generateTokenDocs(spec, {
      outputPath: "out",
      generateTheme: tokens => ({
        base: "light",
        colorPrimary: tokens.find(token => token.path === "color.primary")
          ?.cssValue,
        fontBase: tokens.find(token => token.path === "font.family.sans")
          ?.cssValue,
        brandTitle: "Razorwind"
      })
    });

    const theme = documents["out/theme.ts"]?.chunks?.[0]?.content;
    expect(theme).toContain('from "storybook/theming"');
    expect(theme).toContain("export default create({");
    expect(theme).toContain('base: "light"');
    expect(theme).toContain('colorPrimary: "#0066cc"');
    expect(theme).toContain("brandTitle: \"Razorwind\"");
  });

  it("skips theme.ts when generateTheme is omitted", () => {
    const documents = generateTokenDocs(spec, { outputPath: "out" });
    expect(documents["out/theme.ts"]).toBeUndefined();
  });
});
