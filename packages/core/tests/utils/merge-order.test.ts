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
import { mergeOrder } from "../../src/utils";

describe("mergeOrder", () => {
  it("keeps shared names in first-seen relative order", () => {
    const order = mergeOrder([
      ["a", "c"],
      ["b", "c", "a"],
      ["c", "d", "e"]
    ]);
    const sort = (names: string[]) =>
      names.toSorted((x, y) => order.get(x)! - order.get(y)!);

    expect(sort(["b", "c", "a"])).toEqual(["b", "a", "c"]);
    expect(sort(["c", "d", "e"])).toEqual(["c", "d", "e"]);
    expect(sort(["e", "a", "d"])).toEqual(["a", "d", "e"]);
  });
});
