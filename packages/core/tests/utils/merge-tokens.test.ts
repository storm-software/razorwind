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
import { mergeTokenTrees } from "../../src/utils";

const transparentColor = {
  $type: "color" as const,
  $value: {
    colorSpace: "srgb",
    components: [1, 1, 1],
    alpha: 0,
    hex: "#ffffff"
  }
};

describe("mergeTokenTrees", () => {
  it("adds base group keys that the theme does not define", () => {
    const merged = mergeTokenTrees(
      {
        color: {
          fg: { $type: "color", $value: "#111111" }
        }
      },
      {
        color: {
          transparent: { $type: "color", $value: "#FFFFFF00" }
        }
      }
    );

    expect(merged).toMatchObject({
      color: {
        fg: { $value: "#111111" },
        transparent: { $value: "#FFFFFF00" }
      }
    });
  });

  it("replaces overlapping color component arrays instead of concatenating", () => {
    const merged = mergeTokenTrees(
      {
        color: {
          transparent: transparentColor,
          fg: { $type: "color", $value: "#111111" }
        }
      },
      {
        color: {
          transparent: transparentColor
        }
      }
    );

    const value = (
      merged as {
        color: { transparent: { $value: { components: number[] } } };
      }
    ).color.transparent.$value;

    expect(value.components).toEqual([1, 1, 1]);
  });

  it("replaces overlapping cubicBezier $value arrays instead of concatenating", () => {
    const easeIn = {
      $type: "cubicBezier" as const,
      $value: [0.4, 0, 1, 1]
    };

    const merged = mergeTokenTrees(
      { ease: { in: easeIn } },
      { ease: { in: easeIn } }
    );

    const value = (merged as { ease: { in: { $value: number[] } } }).ease.in
      .$value;

    expect(value).toEqual([0.4, 0, 1, 1]);
  });

  it("copies $description from the override group", () => {
    const merged = mergeTokenTrees(
      {
        color: {
          $description: "Theme colors",
          fg: { $type: "color", $value: "#111111" }
        }
      },
      {
        color: {
          $description: "Base colors",
          transparent: { $type: "color", $value: "#FFFFFF00" }
        }
      }
    );

    expect(
      (merged as { color: { $description: string } }).color.$description
    ).toBe("Theme colors");
  });
});
