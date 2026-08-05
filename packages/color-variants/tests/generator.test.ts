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
  colorValueToHex,
  hexToColorValue,
  transformHex
} from "../src/color";

describe("colorValueToHex / hexToColorValue", () => {
  it("round-trips DTCG color objects", () => {
    const original = {
      colorSpace: "srgb",
      components: [0, 0.4, 0.8],
      hex: "#0066cc"
    };
    const hex = colorValueToHex(original);
    expect(hex).toBe("#0066cc");

    const next = hexToColorValue(transformHex(hex!, "dimmed"), original);
    expect(next).toMatchObject({
      colorSpace: "srgb",
      hex: expect.stringMatching(/^#[0-9a-f]{6}$/i)
    });
    expect((next as { hex: string }).hex).not.toBe("#0066cc");
  });

  it("round-trips hex strings", () => {
    const hex = colorValueToHex("#663399");
    expect(hex).toBe("#663399");
    expect(hexToColorValue(transformHex(hex!, "high-contrast"), "#663399")).toMatch(
      /^#[0-9a-f]{6}$/i
    );
  });

  it("returns null for token references", () => {
    expect(colorValueToHex("{color.primary}")).toBeNull();
  });
});
