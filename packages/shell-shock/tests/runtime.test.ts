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
  analyzeA11y,
  colorDistance,
  fuzzySearch,
  getGuidelines,
  getTokenRecords,
  isSearchError,
  listComponents,
  listFonts,
  listIcons,
  listTokens,
  normalizeTerms,
  plan,
  searchComponents,
  searchFonts,
  searchIcons,
  searchTokens,
  suggestTokensForColors,
  toHexColor
} from "../src/runtime";
import type { DesignSystemSnapshot } from "../src/runtime";
import { multiThemeTokens, spec } from "./fixtures";

const snapshot: DesignSystemSnapshot = { spec };

describe("color helpers", () => {
  it("normalizes hex, short hex, rgb() and DTCG color objects", () => {
    expect(toHexColor("#ABC")).toBe("#aabbcc");
    expect(toHexColor("0066cc")).toBe("#0066cc");
    expect(toHexColor("#0066ccff")).toBe("#0066cc");
    expect(toHexColor("rgb(0, 102, 204)")).toBe("#0066cc");
    expect(toHexColor("rgba(0 102 204 / 50%)")).toBe("#0066cc80");
    expect(toHexColor({ hex: "#0066cc", alpha: 0.5 })).toBe("#0066cc80");
    expect(toHexColor({ colorSpace: "srgb", components: [0, 0.4, 0.8] })).toBe(
      "#0066cc"
    );
    expect(toHexColor("{color.primary}")).toBeNull();
    expect(toHexColor("oklch(0.6 0.1 240)")).toBeNull();
  });

  it("measures color distance", () => {
    expect(colorDistance("#000000", "#000000")).toBe(0);
    expect(colorDistance("#000000", "#ffffff")).toBeGreaterThan(500);
    expect(colorDistance("#0066cc", "#0066cd")).toBeLessThan(5);
  });
});

describe("fuzzySearch", () => {
  const items = [
    { id: "color.primary", desc: "brand accent" },
    { id: "color.text.muted", desc: "muted caption text" },
    { id: "space.sm", desc: "small spacing" }
  ];
  const keys = [
    { name: "id", weight: 5, get: (item: (typeof items)[number]) => item.id },
    { name: "desc", weight: 2, get: (item: (typeof items)[number]) => item.desc }
  ];

  it("normalizes terms", () => {
    expect(normalizeTerms([" Primary ", "primary", "", "Text  Muted"])).toEqual([
      "primary",
      "text muted"
    ]);
  });

  it("matches exact, substring and multi-word terms", () => {
    const exact = fuzzySearch(items, ["color.primary"], { keys, idOf: i => i.id });
    expect(exact[0]?.item.id).toBe("color.primary");

    const substring = fuzzySearch(items, ["muted"], { keys, idOf: i => i.id });
    expect(substring[0]?.item.id).toBe("color.text.muted");

    const words = fuzzySearch(items, ["small space"], { keys, idOf: i => i.id });
    expect(words[0]?.item.id).toBe("space.sm");
  });

  it("tolerates typos and applies the per-term limit", () => {
    const typo = fuzzySearch(items, ["primry"], { keys, idOf: i => i.id });
    expect(typo[0]?.item.id).toBe("color.primary");

    const limited = fuzzySearch(items, ["color"], { keys, idOf: i => i.id, limit: 1 });
    expect(limited).toHaveLength(1);
  });

  it("de-duplicates across terms", () => {
    const results = fuzzySearch(items, ["primary", "brand"], {
      keys,
      idOf: i => i.id
    });
    expect(results.filter(r => r.item.id === "color.primary")).toHaveLength(1);
  });
});

describe("token tools", () => {
  it("flattens tokens into records with hex and CSS variables", () => {
    const records = getTokenRecords(spec);
    const primary = records.find(token => token.name === "color.primary");

    expect(primary).toMatchObject({
      name: "color.primary",
      path: ["color", "primary"],
      type: "color",
      value: "#0066cc",
      hex: "#0066cc",
      cssVariable: "--ads-color-primary",
      description: "Primary brand color used for interactive elements."
    });
    expect(records.find(t => t.name === "color.text.base")?.hex).toBe("#e6edf3");
    expect(records.find(t => t.name === "space.sm")?.hex).toBeUndefined();
  });

  it("searches tokens compactly by default", () => {
    const result = searchTokens(snapshot, { terms: ["primary"] });
    expect(isSearchError(result)).toBe(false);
    expect(result).toEqual([{ name: "color.primary", value: "#0066cc" }]);
  });

  it("includes metadata on request", () => {
    const result = searchTokens(snapshot, {
      terms: ["muted"],
      includeMetadata: true
    });
    expect(result).toMatchObject([
      {
        name: "color.text.muted",
        value: "#8b949e",
        type: "color",
        description: "Muted text for captions.",
        cssVariable: "--ads-color-text-muted"
      }
    ]);
  });

  it("searches descriptions and types", () => {
    const byDescription = searchTokens(snapshot, { terms: ["compact"] });
    expect(byDescription).toEqual([{ name: "space.sm", value: "4px" }]);

    const byType = searchTokens(snapshot, { terms: ["dimension"], limit: 3 });
    expect(Array.isArray(byType) && byType.map(t => t.name)).toEqual([
      "space.sm",
      "space.md",
      "space.lg"
    ]);
  });

  it("returns an error listing available tokens when nothing matches", () => {
    const result = searchTokens(snapshot, { terms: ["zzzzqqq"] });
    expect(isSearchError(result)).toBe(true);
    expect(result).toMatchObject({
      error: "No tokens found for 'zzzzqqq'.",
      available: expect.arrayContaining(["color.primary", "space.sm"])
    });
  });

  it("keeps the theme on multi-theme records", () => {
    const result = searchTokens(
      { spec: { ...spec, tokens: multiThemeTokens } },
      { terms: ["primary"], limit: 2 }
    );
    expect(result).toEqual([
      { name: "color.primary", value: "#1d4ed8", theme: "light" },
      { name: "color.primary", value: "#60a5fa", theme: "dark" }
    ]);
  });

  it("lists every token", () => {
    expect(listTokens(snapshot).map(t => t.name)).toContain("font.body");
  });
});

describe("component / icon / font tools", () => {
  it("searches components by name and tags", () => {
    const result = searchComponents(snapshot, { terms: ["button", "dropdown"] });
    expect(Array.isArray(result) && result.map(c => c.name)).toEqual([
      "button",
      "select-field"
    ]);
    expect(Array.isArray(result) && result[0]).toMatchObject({
      title: "Button",
      files: ["ui/button.tsx"],
      examples: [expect.objectContaining({ name: "primary" })]
    });
  });

  it("lists components with example usage", () => {
    const [button] = listComponents(snapshot);
    expect(button?.examples[0]?.content).toContain("<Button");
  });

  it("searches icons by alias", () => {
    const result = searchIcons(snapshot, { terms: ["magnifying glass"] });
    expect(Array.isArray(result) && result[0]?.name).toBe("search");
    expect(listIcons(snapshot)).toHaveLength(3);
  });

  it("searches fonts by role and builds a font-family stack", () => {
    const result = searchFonts(snapshot, { terms: ["mono"] });
    expect(Array.isArray(result) && result[0]).toMatchObject({
      name: "jetbrains-mono",
      fontFamily: '"JetBrains Mono"',
      weights: [400],
      files: ["fonts/jetbrains-mono.woff2"]
    });
    expect(listFonts(snapshot).find(f => f.name === "inter")?.fontFamily).toBe(
      "Inter, system-ui, sans-serif"
    );
  });

  it("errors for unknown components, icons and fonts", () => {
    expect(isSearchError(searchComponents(snapshot, { terms: ["qqqq"] }))).toBe(true);
    expect(isSearchError(searchIcons(snapshot, { terms: ["qqqq"] }))).toBe(true);
    expect(isSearchError(searchFonts(snapshot, { terms: ["qqqq"] }))).toBe(true);
  });
});

describe("plan", () => {
  it("requires at least one list of terms", () => {
    const result = plan(snapshot, { tokens: [], icons: [] });
    expect(isSearchError(result)).toBe(true);
  });

  it("runs all searches and summarizes counts", () => {
    const result = plan(snapshot, {
      tokens: ["primary", "spacing"],
      icons: ["search"],
      components: ["button"],
      fonts: ["body"]
    });
    expect(isSearchError(result)).toBe(false);
    if (!isSearchError(result)) {
      expect(result.summary).toEqual({
        tokensFound: expect.any(Number),
        iconsFound: 1,
        componentsFound: 1,
        fontsFound: 1
      });
      expect(result.summary.tokensFound).toBeGreaterThanOrEqual(2);
      expect(result.searchResults.tokens).toBeDefined();
      expect(result.searchResults.icons).toBeDefined();
    }
  });
});

describe("guidelines", () => {
  it("returns the full guideline set as markdown", () => {
    const markdown = getGuidelines(snapshot);
    expect(markdown).toContain("# Acme Design System");
    expect(markdown).toContain("Token groups: `color`, `font`, `space`.");
    expect(markdown).toContain("# Button");
    expect(markdown).toContain('<Button appearance="primary">Save</Button>');
    expect(markdown).toContain("# Typography");
  });

  it("searches guidelines by keyword and includes consumer documents", () => {
    const markdown = getGuidelines(
      {
        spec,
        guidelines: [
          {
            keywords: ["voice", "tone", "content"],
            content: "# Voice and tone\n\nBe concise."
          }
        ]
      },
      { terms: ["voice tone"] }
    );
    expect(markdown).toBe("# Voice and tone\n\nBe concise.");
  });
});

describe("analyzeA11y", () => {
  const code = `
    <div onClick={open}>Open</div>
    <img src="a.png" />
    <button aria-label="Close"></button>
    <input type="text" />
    <span style={{ color: "#0066cd" }}>Hi</span>
  `;

  it("reports pattern violations and token suggestions", () => {
    const result = analyzeA11y(snapshot, code, { componentName: "Card" });

    expect(result.summary.componentName).toBe("Card");
    expect(result.violations.map(v => v.type)).toEqual(
      expect.arrayContaining([
        "Image without alt text",
        "Clickable div without accessibility",
        "Input without associated label",
        "Inline color styles"
      ])
    );
    expect(result.violations.map(v => v.type)).not.toContain(
      "Button without accessible text"
    );
    expect(result.summary.totalViolations).toBe(result.violations.length);
    expect(result.tokenSuggestions).toEqual([
      expect.objectContaining({
        color: "#0066cd",
        token: "color.primary",
        cssVariable: "--ads-color-primary"
      })
    ]);
  });

  it("skips pattern analysis on request", () => {
    const result = analyzeA11y(snapshot, code, { includePatternAnalysis: false });
    expect(result.violations).toEqual([]);
    expect(result.tokenSuggestions).toHaveLength(1);
  });

  it("ignores colors that are far from every token", () => {
    expect(suggestTokensForColors(snapshot, "#00ff00", 10)).toEqual([]);
  });
});
