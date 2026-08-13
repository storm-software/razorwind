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
import extract, {
  appendVariantKey,
  applyColorVariantToTokens,
  expandColorVariants,
  isTokensRecord,
  simulateCVD,
  transformHex,
  variantToCamelCase
} from "../src/extract";

const baseTokens = {
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
    },
    link: {
      $value: "{color.primary}"
    }
  },
  spacing: {
    $type: "dimension",
    sm: { $value: { value: 0.5, unit: "rem" } }
  }
} satisfies Tokens;

function configFor(plugin: ReturnType<typeof extract>) {
  return {
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
  } as never;
}

describe("variant naming", () => {
  it("maps kebab variants to camelCase keys", () => {
    expect(variantToCamelCase("high-contrast")).toBe("highContrast");
    expect(variantToCamelCase("dimmed")).toBe("dimmed");
    expect(appendVariantKey("dark", "high-contrast")).toBe("darkHighContrast");
    expect(appendVariantKey("light", "dimmed")).toBe("lightDimmed");
  });
});

describe("isTokensRecord", () => {
  it("detects multi-theme records vs single token trees", () => {
    expect(isTokensRecord({ dark: baseTokens, light: baseTokens })).toBe(true);
    expect(isTokensRecord(baseTokens)).toBe(false);
  });
});

describe("transformHex", () => {
  it("dims and high-contrasts colors without collapsing to the same value", () => {
    const source = "#0066cc";
    const dimmed = transformHex(source, "dimmed");
    const highContrast = transformHex(source, "high-contrast");

    expect(dimmed).toMatch(/^#[0-9a-f]{6}$/i);
    expect(highContrast).toMatch(/^#[0-9a-f]{6}$/i);
    expect(dimmed).not.toBe(source);
    expect(highContrast).not.toBe(source);
    expect(dimmed).not.toBe(highContrast);
  });

  it("simulates CVD with Machado matrices (neutral axis preserved)", () => {
    expect(simulateCVD("#808080", "protan", 1)).toBe("#808080");
    expect(transformHex("#ff2e3f", "protanopia")).not.toBe("#ff2e3f");
  });

  it("grayscales achromatopsia / monochromatic variants", () => {
    const gray = transformHex("#0066cc", "achromatopsia");
    const mono = transformHex("#0066cc", "monochromatic");
    expect(gray).toMatch(/^#([0-9a-f]{2})\1\1$/i);
    expect(mono).toBe(gray);
  });
});

describe("applyColorVariantToTokens", () => {
  it("rewrites color tokens and leaves non-colors / refs alone", () => {
    const next = applyColorVariantToTokens(baseTokens, "dimmed");

    expect(
      (next.color as Tokens).primary?.$value
    ).not.toEqual(baseTokens.color.primary.$value);
    expect((next.color as Tokens).secondary?.$value).not.toBe("#663399");
    expect((next.color as Tokens).link?.$value).toBe("{color.primary}");
    expect((next.spacing as Tokens).sm?.$value).toEqual({
      value: 0.5,
      unit: "rem"
    });
  });
});

describe("expandColorVariants", () => {
  it("wraps a single token tree as default + variant keys", () => {
    const result = expandColorVariants(baseTokens, [
      "dimmed",
      "high-contrast"
    ]);

    expect(Object.keys(result).sort()).toEqual([
      "default",
      "dimmed",
      "highContrast"
    ]);
    expect(result.default).toBe(baseTokens);
    expect(result.dimmed?.$description).toMatch(/Dimmed/i);
    expect(result.highContrast?.$description).toMatch(/High contrast/i);
  });

  it("appends variants onto each theme key for multi-theme input", () => {
    const input = { dark: baseTokens, light: baseTokens };
    const result = expandColorVariants(input, ["dimmed", "high-contrast"]);

    expect(Object.keys(result).sort()).toEqual([
      "dark",
      "darkDimmed",
      "darkHighContrast",
      "light",
      "lightDimmed",
      "lightHighContrast"
    ]);
    expect(result.dark).toBe(baseTokens);
    expect(result.darkDimmed?.$description).toMatch(/Dimmed/i);
  });
});

describe("color-variants extract plugin", () => {
  it("is a Razorwind Plugin", () => {
    const plugin = extract();
    expect(plugin.name).toBe("color-variants");
    expect(typeof plugin.extract).toBe("function");
  });

  it("expands schema tokens during extract", async () => {
    const plugin = extract({ variants: ["dimmed"] });
    const result = await plugin.extract!(
      { tokens: baseTokens, components: {}, icons: {}, fonts: {} } as Schema,
      configFor(plugin)
    );

    const tokens = result.tokens as Record<string, Tokens>;
    expect(Object.keys(tokens).sort()).toEqual(["default", "dimmed"]);
    expect(tokens.dimmed?.$description).toMatch(/Dimmed/i);
  });
});
