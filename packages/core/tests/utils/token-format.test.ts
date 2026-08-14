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

import { describe, expect, it } from "vitest";
import {
  formatCssAliasReferences,
  formatTokenValue,
  normalizeFunctionalColorString,
  toThemeCssVar
} from "../../src/utils";

describe("toThemeCssVar", () => {
  it("maps token paths onto CSS custom properties", () => {
    expect(toThemeCssVar("color.primary")).toBe("--color-primary");
    expect(toThemeCssVar("color.neutral.800")).toBe("--color-neutral-800");
    expect(toThemeCssVar("radius.DEFAULT")).toBe("--radius");
    expect(toThemeCssVar("radius.lg")).toBe("--radius-lg");
  });
});

describe("formatCssAliasReferences / formatTokenValue", () => {
  it("rewrites DTCG aliases to var() references", () => {
    expect(formatTokenValue("{color.neutral.800}")).toBe(
      "var(--color-neutral-800)"
    );
    expect(formatCssAliasReferences("{color.brand.600}")).toBe(
      "var(--color-brand-600)"
    );
    expect(formatTokenValue("{radius.DEFAULT}")).toBe("var(--radius)");
  });

  it("leaves literal CSS values unchanged", () => {
    expect(formatTokenValue("#35373a")).toBe("#35373a");
    expect(formatTokenValue("12px")).toBe("12px");
  });

  it("rewrites aliases inside composite values", () => {
    expect(formatTokenValue("0 1px {color.shadow}")).toBe(
      "0 1px var(--color-shadow)"
    );
  });

  it("normalizes oklch strings with stray closing parens", () => {
    expect(
      normalizeFunctionalColorString("oklch(0.301 0.066 184.397587))")
    ).toBe("oklch(0.301 0.066 184.397587)");
    expect(
      formatTokenValue("oklch(0.301 0.066 184.397587))", "color")
    ).toBe("oklch(0.301 0.066 184.397587)");
  });
});

describe("formatShadowValue / formatTokenValue shadows", () => {
  const layer = {
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
  };

  it("formats a single shadow layer as CSS box-shadow", () => {
    expect(formatTokenValue(layer, "shadow")).toBe(
      "0px 10px 15px -3px #0000001a"
    );
  });

  it("formats multi-layer shadows as a comma-separated list", () => {
    const second = {
      ...layer,
      offsetY: { value: 4, unit: "px" },
      blur: { value: 6, unit: "px" },
      spread: { value: -4, unit: "px" }
    };
    expect(formatTokenValue([layer, second], "shadow")).toBe(
      "0px 10px 15px -3px #0000001a, 0px 4px 6px -4px #0000001a"
    );
  });

  it("prefixes inset layers", () => {
    expect(formatTokenValue({ ...layer, inset: true }, "shadow")).toBe(
      "inset 0px 10px 15px -3px #0000001a"
    );
  });
});
