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
import { fixRule, lintRule } from "./fixture";

describe("no-margin", () => {
  const rule = "no-margin";

  it("reports margins and points at the schema's layout primitives", () => {
    const [message] = lintRule(rule, `const a = css({ marginTop: 4, padding: 4 });`);
    expect(message?.message).toBe(
      "margin breaks the component model. Control layout from the parent with Stack or gap in a flex or grid container"
    );
    expect(lintRule(rule, "const a = css`margin: 0 auto;`;")).toHaveLength(1);
  });
});

describe("no-physical-properties", () => {
  const rule = "no-physical-properties";

  it("fixes physical properties and values in objects", () => {
    expect(
      fixRule(
        rule,
        `const a = css({ marginLeft: 4, "padding-right": 2, textAlign: "left" });`
      )
    ).toBe(
      `const a = css({ marginInlineStart: 4, "padding-inline-end": 2, textAlign: "start" });`
    );
  });

  it("fixes physical properties and values in templates", () => {
    expect(
      fixRule(rule, "const a = css`margin-left: 4px; text-align: right;`;")
    ).toBe("const a = css`margin-inline-start: 4px; text-align: end;`;");
  });
});

describe("no-nested-styles", () => {
  const rule = "no-nested-styles";

  it("allows pseudo selectors and at-rules only", () => {
    const messages = lintRule(
      rule,
      `const a = css({
        "&:hover": { color: "red" },
        "@media (min-width: 1px)": { color: "blue" },
        "& > div": { color: "green" },
        ".child": { color: "black" }
      });`
    );
    expect(messages.map(message => message.message)).toEqual([
      'Nested selector "& > div" changes unexpectedly when child markup changes. Style the element itself; only pseudo-classes, pseudo-elements and at-rules may nest',
      'Nested selector ".child" changes unexpectedly when child markup changes. Style the element itself; only pseudo-classes, pseudo-elements and at-rules may nest'
    ]);
  });

  it("treats cssMap keys as variants", () => {
    expect(lintRule(rule, `const a = cssMap({ primary: { "&:hover": {} } });`)).toEqual([]);
    expect(lintRule(rule, `const a = cssMap({ primary: { "& span": {} } });`)).toHaveLength(1);
  });

  it("reads template blocks", () => {
    expect(
      lintRule(rule, "const a = css`&:hover { color: red; } & > span { color: blue; }`;")
    ).toHaveLength(1);
  });
});

describe("no-exported-css / no-exported-keyframes", () => {
  it("reports exported style calls", () => {
    expect(
      lintRule(
        "no-exported-css",
        `export const a = css({});
         const b = css({});
         export { b };
         export const c = other({});
         export default css({});`
      )
    ).toHaveLength(3);
    expect(
      lintRule("no-exported-keyframes", `export const spin = keyframes({});`)
    ).toHaveLength(1);
  });
});

describe("no-empty-styled-expression", () => {
  it("reports empty styled calls", () => {
    expect(
      lintRule(
        "no-empty-styled-expression",
        `const A = styled.div({}); const B = styled.div(); const C = styled.div({ color: "red" });`
      )
    ).toHaveLength(2);
  });
});

describe("tagged template rules", () => {
  it("converts css templates to objects", () => {
    expect(
      fixRule(
        "no-css-tagged-template-expression",
        "const a = css`color: red; padding-top: 4px;`;"
      )
    ).toBe(`const a = css({\n  color: "red",\n  paddingTop: "4px"\n});`);
  });

  it("reports templates with expressions without fixing them", () => {
    const code = "const a = css`color: ${color};`;";
    expect(lintRule("no-css-tagged-template-expression", code)).toHaveLength(1);
    expect(fixRule("no-css-tagged-template-expression", code)).toBe(code);
  });

  it("converts styled and keyframes templates", () => {
    expect(
      fixRule(
        "no-styled-tagged-template-expression",
        "const A = styled.div`color: red;`;"
      )
    ).toBe(`const A = styled.div({\n  color: "red"\n});`);
    expect(
      fixRule(
        "no-keyframes-tagged-template-expression",
        "const k = keyframes`from { opacity: 0; } to { opacity: 1; }`;"
      )
    ).toBe(
      `const k = keyframes({\n  from: {\n    opacity: "0"\n  },\n  to: {\n    opacity: "1"\n  }\n});`
    );
  });
});

describe("expand-motion-shorthand", () => {
  it("expands transition and animation layers", () => {
    expect(
      expandMotionShorthand("transition", "opacity 200ms ease-in 50ms, color 1s")
    ).toEqual([
      ["transitionProperty", "opacity, color"],
      ["transitionDuration", "200ms, 1s"],
      ["transitionTimingFunction", "ease-in, ease"],
      ["transitionDelay", "50ms, 0s"]
    ]);
    expect(expandMotionShorthand("animation", "spin 1s linear infinite")).toEqual([
      ["animationName", "spin"],
      ["animationDuration", "1s"],
      ["animationTimingFunction", "linear"],
      ["animationIterationCount", "infinite"]
    ]);
  });

  it("fixes object shorthands, keeping the layout", () => {
    expect(
      fixRule(
        "expand-motion-shorthand",
        `const a = css({ transition: "opacity 200ms" });`
      )
    ).toBe(
      `const a = css({ transitionProperty: "opacity", transitionDuration: "200ms" });`
    );
    expect(
      fixRule(
        "expand-motion-shorthand",
        `const a = css({\n  transition: "opacity 200ms"\n});`
      )
    ).toBe(
      `const a = css({\n  transitionProperty: "opacity",\n  transitionDuration: "200ms"\n});`
    );
    expect(
      lintRule("expand-motion-shorthand", `const a = css({ transition: "none" });`)
    ).toEqual([]);
  });
});

describe("use-visually-hidden", () => {
  const rule = "use-visually-hidden";

  it("points hand-rolled visually hidden styles at the schema component", () => {
    const [message] = lintRule(
      rule,
      `const a = css({
        position: "absolute",
        width: 1,
        height: 1,
        padding: 0,
        overflow: "hidden",
        clip: "rect(1px, 1px, 1px, 1px)",
        whiteSpace: "nowrap",
        border: 0
      });`
    );
    expect(message?.message).toBe(
      "Use VisuallyHidden instead of hand-rolled visually hidden styles"
    );
  });

  it("reads templates and ignores partial matches", () => {
    expect(
      lintRule(
        rule,
        "const a = css`position: absolute; width: 1px; height: 1px; overflow: hidden; white-space: nowrap; clip: rect(1px, 1px, 1px, 1px);`;"
      )
    ).toHaveLength(1);
    expect(
      lintRule(rule, `const a = css({ position: "absolute", width: 1, height: 1 });`)
    ).toEqual([]);
  });
});
