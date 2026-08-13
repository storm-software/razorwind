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
  flattenTokens,
  resolveTokenSets,
  titleCase,
  themeDisplayName
} from "../../src/utils";

describe("titleCase", () => {
  it("title-cases slug separators", () => {
    expect(titleCase("my-dark-theme")).toBe("My Dark Theme");
    expect(titleCase("foo.bar")).toBe("Foo.bar");
  });
});

describe("themeDisplayName", () => {
  it("prefers displayName when set", () => {
    expect(themeDisplayName({ name: "dark", displayName: "Dark Mode" })).toBe(
      "Dark Mode"
    );
  });

  it("title-cases name when displayName omitted", () => {
    expect(themeDisplayName({ name: "my-theme" })).toBe("My Theme");
  });
});

describe("flattenTokens / resolveTokenSets", () => {
  const tokens = {
    color: {
      primary: { $type: "color", $value: "#3366cc" }
    }
  };

  it("flattens a single token tree", () => {
    const flat = flattenTokens(tokens);
    expect(flat).toHaveLength(1);
    expect(flat[0]?.path).toBe("color.primary");
    expect(flat[0]?.cssValue).toBe("#3366cc");
  });

  it("splits multi-theme records", () => {
    const multi = {
      light: { color: { fg: { $type: "color", $value: "#111" } } },
      dark: { color: { fg: { $type: "color", $value: "#eee" } } }
    };
    const sets = resolveTokenSets(multi);
    expect(sets).toHaveLength(2);
    expect(sets.map(set => set.id).sort()).toEqual(["dark", "light"]);
  });

  it("enriches rows via enrichToken", () => {
    const flat = flattenTokens(tokens, {
      enrichToken: base => ({ ...base, extra: true })
    });
    expect(flat[0]).toMatchObject({ path: "color.primary", extra: true });
  });

  it("filters by includeTypes", () => {
    const mixed = {
      color: { primary: { $type: "color", $value: "#000" } },
      space: { sm: { $type: "dimension", $value: "4px" } }
    };
    const flat = flattenTokens(mixed, { includeTypes: ["color"] });
    expect(flat).toHaveLength(1);
    expect(flat[0]?.type).toBe("color");
  });
});
