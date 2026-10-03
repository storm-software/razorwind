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
  cssFontFamily,
  renderFontCss,
  resolveFontAssetUrl,
  toGoogleFontsCssUrl
} from "../../src/lib/fonts/css";
import { parseCssFonts } from "../../src/lib/fonts/parse";
import type { Fonts, GoogleFont, LocalFont } from "../../src/schema/fonts";

const google: GoogleFont = {
  name: "inter",
  title: "Inter",
  source: "google",
  family: "Inter",
  role: "sans",
  weights: [400, 700],
  styles: ["normal", "italic"],
  display: "swap"
};

const local: LocalFont = {
  name: "jetbrains",
  title: "JetBrains Mono",
  source: "local",
  family: "JetBrains Mono",
  role: "mono",
  files: [
    {
      path: "/tmp/JetBrainsMono-Regular.woff2",
      format: "woff2",
      weight: 400,
      style: "normal"
    }
  ]
};

const fonts: Fonts = { inter: google, jetbrains: local };

describe("resolveFontAssetUrl", () => {
  it("joins a local font basename to a normalized HTTP CDN base URL", () => {
    expect(
      resolveFontAssetUrl(
        "/tmp/JetBrains Mono.woff2",
        "https://cdn.acme.test/design-system/fonts"
      )
    ).toBe("https://cdn.acme.test/design-system/fonts/JetBrains%20Mono.woff2");
  });

  it("rejects a non-HTTP CDN base URL", () => {
    expect(() =>
      resolveFontAssetUrl("/tmp/font.woff2", "./public/fonts")
    ).toThrow(/fontAssetBaseUrl.*absolute HTTP/i);
  });
});

describe("toGoogleFontsCssUrl", () => {
  it("builds a CSS2 family URL with italic weights", () => {
    expect(toGoogleFontsCssUrl(google)).toBe(
      "https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,700;1,400;1,700&display=swap"
    );
  });

  it("builds a variable range from the min and max weights with italics", () => {
    expect(
      toGoogleFontsCssUrl({
        name: "code",
        title: "Google Sans Code",
        source: "google",
        family: "Google Sans Code",
        variable: true,
        weights: [300, 800, 300, 800],
        styles: ["normal", "italic", "normal", "italic"]
      })
    ).toMatchInlineSnapshot(
      `"https://fonts.googleapis.com/css2?family=Google+Sans+Code:ital,wght@0,300..800;1,300..800&display=swap"`
    );
  });

  it("dedupes and sorts static weights", () => {
    expect(
      toGoogleFontsCssUrl({ ...google, weights: [700, 400, 700, 400] })
    ).toBe(toGoogleFontsCssUrl(google));
  });
});

describe("cssFontFamily", () => {
  it("quotes the family and appends a generic fallback from role", () => {
    expect(cssFontFamily(google)).toBe("Inter, sans-serif");
    expect(cssFontFamily(local)).toBe('"JetBrains Mono", monospace');
  });
});

describe("renderFontCss", () => {
  it("emits Google imports before local font-face rules", () => {
    const css = renderFontCss(fonts);
    expect(css).toContain(
      '@import url("https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,700;1,400;1,700&display=swap");'
    );
    expect(css).toContain('font-family: "JetBrains Mono";');
    expect(css).toContain(
      'url("./fonts/JetBrainsMono-Regular.woff2") format("woff2")'
    );
    expect(css.indexOf("@import")).toBeLessThan(css.indexOf("@font-face"));
  });
});

describe("parseCssFonts", () => {
  it("parses Google Fonts imports and local @font-face rules", () => {
    const parsed = parseCssFonts(`
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap");

@font-face {
  font-family: "JetBrains Mono";
  src: url("./fonts/JetBrainsMono-Regular.woff2") format("woff2");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
`);

    expect(parsed.inter).toMatchObject({
      source: "google",
      family: "Inter",
      weights: [400, 700]
    });
    expect(parsed["jetbrains-mono"]).toMatchObject({
      source: "local",
      family: "JetBrains Mono"
    });
  });
});
