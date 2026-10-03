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
import { expandMotionShorthand } from "../src/runtime/rules/styles";
import { fixRule, lintRule, messages } from "./fixture";

describe("no-physical-properties", () => {
  const rule = "no-physical-properties";

  it("reports physical properties and values", async () => {
    expect(
      await messages(rule, `.a { margin-left: 4px; text-align: left; }`)
    ).toEqual([
      "Physical property margin-left does not follow the reading direction. Use margin-inline-start (design-system/no-physical-properties)",
      'text-align: "left" does not follow the reading direction. Use "start" (design-system/no-physical-properties)'
    ]);
  });

  it("fixes to logical properties and values", async () => {
    expect(
      await fixRule(
        rule,
        `.a { margin-left: 4px; padding-top: 0; top: 0; text-align: right; float: left; border-top-left-radius: 2px; }`
      )
    ).toBe(
      `.a { margin-inline-start: 4px; padding-block-start: 0; inset-block-start: 0; text-align: end; float: inline-start; border-start-start-radius: 2px; }`
    );
  });

  it("allows logical properties", async () => {
    expect(
      await lintRule(
        rule,
        `.a { margin-inline: 0; inset-inline-start: 0; text-align: center; }`
      )
    ).toEqual([]);
  });
});

describe("expand-motion-shorthand", () => {
  const rule = "expand-motion-shorthand";

  it("expands transition layers into longhands", async () => {
    expect(
      await fixRule(
        rule,
        `.a {\n  transition: opacity 100ms ease, transform 200ms;\n}`
      )
    ).toBe(
      `.a {\n  transition-property: opacity, transform;\n  transition-duration: 100ms, 200ms;\n  transition-timing-function: ease, ease;\n}`
    );
  });

  it("keeps !important on every longhand", async () => {
    expect(
      await fixRule(
        rule,
        `.a { animation: spin 1s linear infinite !important; }`
      )
    ).toBe(
      `.a { animation-name: spin !important; animation-duration: 1s !important; animation-timing-function: linear !important; animation-iteration-count: infinite !important; }`
    );
  });

  it("skips keywords and values it cannot classify", async () => {
    expect(
      await lintRule(
        rule,
        `.a { transition: none; } .b { transition: opacity var(--acme-motion-duration-fast); }`
      )
    ).toEqual([]);
    expect(
      expandMotionShorthand("transition", "opacity $fast")
    ).toBeUndefined();
  });
});

describe("no-margin", () => {
  it("names the schema's layout primitives", async () => {
    expect(
      await messages("no-margin", `.a { margin: 0; margin-block-end: 4px; }`)
    ).toEqual([
      "margin breaks the component model. Control layout from the parent with Box or Stack or gap in a flex or grid container (design-system/no-margin)",
      "margin breaks the component model. Control layout from the parent with Box or Stack or gap in a flex or grid container (design-system/no-margin)"
    ]);
  });
});

describe("use-visually-hidden", () => {
  it("reports hand-rolled visually hidden rules", async () => {
    expect(
      await messages(
        "use-visually-hidden",
        `.sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          overflow: hidden;
          clip: rect(1px, 1px, 1px, 1px);
          white-space: nowrap;
          border: 0;
        }
        .overlay { position: absolute; inset: 0; display: flex; gap: 4px; overflow: auto; }`
      )
    ).toEqual([
      "Use VisuallyHidden instead of hand-rolled visually hidden styles (design-system/use-visually-hidden)"
    ]);
  });
});
