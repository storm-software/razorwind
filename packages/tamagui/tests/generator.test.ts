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
  icons: {},
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

    const flat = flattenTokens(spec.tokens);
    expect(flat.map(token => token.path)).toEqual(
      expect.arrayContaining([
        "color.primary",
        "color.blue1",
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
  });
});

describe("tamagui plugin", () => {
  it("is a Razorwind Plugin", () => {
    const plugin = tamagui({});
    expect(plugin.name).toBe("tamagui");
    expect(typeof plugin.generate).toBe("function");
  });

  it("generates a Tamagui v5 config from schema tokens", async () => {
    const plugin = tamagui({ outFile: "src/tamagui.config.ts" });
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
      outFile: "out/tamagui.config.ts",
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
});
