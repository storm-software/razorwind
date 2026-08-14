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
  appendThemeToFilePath,
  applyThemeToDocuments,
  applyThemeToTitle
} from "../../src/utils";

describe("applyThemeToTitle", () => {
  it("appends a title-cased theme label", () => {
    expect(applyThemeToTitle("My Theme", "dark")).toBe("My Theme (Dark)");
    expect(applyThemeToTitle("My Theme", "high-contrast")).toBe(
      "My Theme (High Contrast)"
    );
  });

  it("does not double-append an existing theme suffix", () => {
    expect(applyThemeToTitle("My Theme (Dark)", "dark")).toBe("My Theme (Dark)");
  });

  it("returns the original title when theme is omitted", () => {
    expect(applyThemeToTitle("My Theme", undefined)).toBe("My Theme");
  });
});

describe("appendThemeToFilePath", () => {
  it("inserts the theme slug before the extension", () => {
    expect(appendThemeToFilePath("tokens.css", "dark")).toBe("tokens-dark.css");
    expect(appendThemeToFilePath("DESIGN.md", "light")).toBe("DESIGN-light.md");
    expect(appendThemeToFilePath("/abs/out/app.css", "dark")).toBe(
      "/abs/out/app-dark.css"
    );
  });

  it("appends to extensionless file names", () => {
    expect(appendThemeToFilePath("ghostty-theme", "dark")).toBe(
      "ghostty-theme-dark"
    );
  });
});

describe("applyThemeToDocuments", () => {
  it("rewrites record keys and document paths", () => {
    const documents = applyThemeToDocuments(
      {
        "tokens.css": {
          path: "tokens.css",
          chunks: [{ content: ":root {}" }]
        }
      },
      "dark"
    );

    expect(Object.keys(documents)).toEqual(["tokens-dark.css"]);
    expect(documents["tokens-dark.css"]?.path).toBe("tokens-dark.css");
  });

  it("leaves paths unchanged when appendTheme is false", () => {
    const documents = applyThemeToDocuments(
      {
        "tamagui.config.ts": {
          path: "tamagui.config.ts",
          meta: { data: { appendTheme: false } },
          chunks: [{ content: "export {}" }]
        }
      },
      "dark"
    );

    expect(Object.keys(documents)).toEqual(["tamagui.config.ts"]);
    expect(documents["tamagui.config.ts"]?.path).toBe("tamagui.config.ts");
  });
});
