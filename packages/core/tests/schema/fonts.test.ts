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
  fontSchema,
  fontsSchema,
  schema
} from "../../src/schema";

describe("fontsSchema", () => {
  it("accepts a Google Fonts entry", () => {
    const result = fontsSchema.safeParse({
      inter: {
        name: "inter",
        title: "Inter",
        source: "google",
        family: "Inter",
        role: "sans",
        weights: [400, 700],
        styles: ["normal", "italic"],
        subsets: ["latin"],
        display: "swap"
      }
    });

    expect(result.success).toBe(true);
  });

  it("accepts a local font with files", () => {
    const result = fontsSchema.safeParse({
      jetbrains: {
        name: "jetbrains",
        title: "JetBrains Mono",
        source: "local",
        family: "JetBrains Mono",
        role: "mono",
        files: [
          {
            path: "assets/fonts/JetBrainsMono.woff2",
            format: "woff2",
            weight: 400
          }
        ]
      }
    });

    expect(result.success).toBe(true);
  });

  it("rejects a local font without files", () => {
    const result = fontSchema.safeParse({
      name: "broken",
      title: "Broken",
      source: "local",
      files: []
    });

    expect(result.success).toBe(false);
  });

  it("rejects an invalid source", () => {
    const result = fontSchema.safeParse({
      name: "inter",
      title: "Inter",
      source: "cdn",
      family: "Inter"
    });

    expect(result.success).toBe(false);
  });

  it("includes fonts on the root schema", () => {
    const result = schema.safeParse({
      tokens: {},
      components: {},
      icons: {},
      fonts: {
        inter: {
          name: "inter",
          title: "Inter",
          source: "google",
          family: "Inter"
        }
      }
    });

    expect(result.success).toBe(true);
  });
});
