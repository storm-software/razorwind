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
  DEFAULT_PALETTE,
  inferPalette,
  inferTheme,
  isPalette,
  normalizeThemes,
  paletteToTheme,
  resolvePalette,
  resolveTheme,
  selectThemeTokens
} from "../src/theme";
import { multiThemeTokens, spec } from "./fixtures";

describe("inferPalette", () => {
  it("picks semantic roles from token paths", () => {
    expect(inferPalette(spec)).toEqual({
      primary: "#0066cc",
      secondary: "#8b5cf6",
      text: "#e6edf3",
      muted: "#8b949e",
      link: "#3fa6ff",
      border: "#3d444d",
      success: "#22c55e",
      info: "#38bdf8",
      warning: "#f59e0b",
      danger: "#ef4444"
    });
  });

  it("prefers canonical paths over state variants", () => {
    const palette = inferPalette({
      tokens: {
        color: {
          $type: "color",
          primary: {
            hover: { $value: "#111111" },
            "500": { $value: "#222222" },
            "50": { $value: "#333333" }
          }
        }
      }
    });
    expect(palette.primary).toBe("#222222");
  });

  it("falls back to defaults when no colors exist", () => {
    expect(inferPalette({ tokens: { space: { sm: { $value: "4px" } } } })).toEqual({
      primary: DEFAULT_PALETTE.primary
    });
  });

  it("selects a theme from multi-theme records", () => {
    expect(selectThemeTokens(multiThemeTokens).id).toBe("light");
    expect(selectThemeTokens(multiThemeTokens, "DARK").id).toBe("dark");

    const dark = inferPalette({ tokens: multiThemeTokens }, "dark");
    expect(dark).toMatchObject({ name: "dark", primary: "#60a5fa", text: "#f5f5f5" });
  });
});

describe("paletteToTheme", () => {
  it("fills missing roles from neighbours", () => {
    expect(resolvePalette({ primary: "#111111", danger: "#ff0000" })).toMatchObject({
      secondary: "#111111",
      link: "#111111",
      info: "#111111",
      help: "#111111",
      error: "#ff0000",
      border: DEFAULT_PALETTE.muted
    });
  });

  it("expands into the Shell Shock theme surfaces", () => {
    const theme = paletteToTheme({
      name: "Acme Dark",
      primary: "#0066cc",
      success: "#22c55e",
      warning: "#f59e0b",
      error: "#ef4444",
      muted: "#8b949e",
      text: "#e6edf3"
    });

    expect(theme.$theme).toBe("acme-dark");
    const colors = theme.colors as Record<string, any>;
    expect(colors.text.heading.primary).toBe("#0066cc");
    expect(colors.text.body).toEqual({
      primary: "#e6edf3",
      secondary: "#8b949e",
      tertiary: "#8b949e",
      link: "#0066cc"
    });
    expect(colors.text.message.header).toMatchObject({
      success: "#22c55e",
      warning: "#f59e0b",
      error: "#ef4444",
      danger: "#ef4444"
    });
    expect(colors.text.prompt.icon.submitted).toBe("#22c55e");
    expect(colors.text.spinner.icon.active).toBe("#0066cc");
    expect(colors.border.message.outline.error).toBe("#ef4444");
    expect(colors.border.app.table.primary).toBe("#8b949e");
  });

  it("maps a full spec with inferTheme", () => {
    const theme = inferTheme(spec);
    expect((theme.colors as any).text.heading.primary).toBe("#0066cc");
  });
});

describe("normalizeThemes / resolveTheme", () => {
  it("accepts palettes, theme configs, arrays and records", () => {
    expect(isPalette({ primary: "#000" })).toBe(true);
    expect(isPalette({ colors: "#000" })).toBe(false);

    expect(normalizeThemes({ primary: "#000" })).toHaveLength(1);
    expect(normalizeThemes([{ primary: "#000" }, { colors: "#fff" }])).toHaveLength(2);

    const record = normalizeThemes({
      light: { primary: "#000" },
      dark: { colors: "#fff", name: "night" }
    });
    expect(record.map(theme => (theme as { name?: string }).name)).toEqual([
      "light",
      "night"
    ]);
  });

  it("rejects invalid theme values", () => {
    expect(() => normalizeThemes([{ foo: 1 } as any])).toThrow(/mapTheme\(\)\[0\]/);
    expect(() => normalizeThemes("nope" as any)).toThrow(/must return a theme/);
  });

  it("resolves full theme configs, deriving $theme from name", () => {
    expect(resolveTheme({ name: "Night Owl", colors: "#fff" })).toEqual({
      $theme: "night-owl",
      colors: "#fff"
    });
    expect(resolveTheme({ $theme: "x", name: "ignored", colors: "#fff" })).toEqual({
      $theme: "x",
      colors: "#fff"
    });
  });
});
