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
import { iconSchema, iconsSchema, schema } from "../../src/schema";

describe("iconsSchema", () => {
  it("accepts a record of icons with theme-aware files", () => {
    const result = iconsSchema.safeParse({
      home: {
        name: "home",
        title: "Home",
        category: "navigation",
        tags: ["house"],
        files: [
          {
            path: "assets/icons/light/home.svg",
            type: "svg",
            theme: "light",
            content: "<svg/>"
          }
        ]
      }
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid icon file types", () => {
    const result = iconSchema.safeParse({
      name: "home",
      title: "Home",
      files: [{ path: "home.bin", type: "bin" }]
    });

    expect(result.success).toBe(false);
  });

  it("includes icons on the root schema", () => {
    const result = schema.safeParse({
      tokens: {},
      components: {},
      icons: {
        home: {
          name: "home",
          title: "Home"
        }
      },
      fonts: {}
    });

    expect(result.success).toBe(true);
  });
});
