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

import type { Schema } from "@razorwind/core/schema";
import { describe, expect, it } from "vitest";
import {
  applySuggestion,
  createPlugin,
  fixRule,
  lintRule
} from "./fixture";

describe("ensure-design-token-usage", () => {
  const rule = "ensure-design-token-usage";

  it("reports hard-coded colors with schema examples", () => {
    const [message] = lintRule(rule, `const a = css({ color: "#0066cc" });`);

    expect(message?.message).toBe(
      'Hard-coded color "#0066cc". Use a color token (e.g. var(--acme-color-primary), var(--acme-color-text), var(--acme-color-blue-500)); a missing value is a token to add, not a literal to inline'
    );
  });

  it("suggests tokens with a matching value, semantic tokens first", () => {
    const code = `const a = css({ color: "#0066cc" });`;
    const [message] = lintRule(rule, code);

    expect(message?.suggestions?.map(suggestion => suggestion.desc)).toEqual([
      "Replace with var(--acme-color-primary) (color.primary)",
      "Replace with var(--acme-color-blue-500) (color.blue.500)"
    ]);
    expect(applySuggestion(code, message)).toBe(
      `const a = css({ color: "var(--acme-color-primary)" });`
    );
  });

  it("matches equivalent color notations", () => {
    const [message] = lintRule(
      rule,
      `const a = css({ color: "rgb(0 102 204)" });`
    );
    expect(message?.suggestions).toHaveLength(2);
  });

  it("reports named colors and every color in a value", () => {
    expect(lintRule(rule, `<div style={{ border: "1px solid red" }} />`)).toHaveLength(1);
    expect(
      lintRule(rule, `<div style={{ background: "linear-gradient(#fff, #000)" }} />`)
    ).toHaveLength(2);
  });

  it("does not suggest deprecated tokens", () => {
    const [message] = lintRule(rule, `const a = css({ color: "#ff0000" });`);
    expect(message?.suggestions ?? []).toEqual([]);
  });

  it("allows references, keywords and fallbacks", () => {
    expect(
      lintRule(
        rule,
        `const a = css({
          color: "var(--acme-color-text)",
          background: "transparent",
          borderColor: "currentColor",
          outlineColor: "var(--x, #fff)",
          content: "'#123'"
        });`
      )
    ).toEqual([]);
  });

  it("reports hard-coded shadows and suggests shadow tokens", () => {
    const code = `const a = css({ boxShadow: "0 1px 2px #0000001a" });`;
    const [message] = lintRule(rule, code);

    expect(message?.message).toMatch(/^Hard-coded shadow/);
    expect(applySuggestion(code, message)).toBe(
      `const a = css({ boxShadow: "var(--acme-shadow-sm)" });`
    );
  });

  it("reads CSS tagged templates", () => {
    const code = "const a = css`color: #1a1a1a; padding: 4px;`;";
    const [message] = lintRule(rule, code);

    expect(applySuggestion(code, message)).toBe(
      "const a = css`color: var(--acme-color-text); padding: 4px;`;"
    );
  });

  it("suggests token function calls when configured", () => {
    const options = { tokenReference: "function" as const };
    const whole = `const a = css({ color: "#1a1a1a" });`;
    const partial = `const a = css({ border: "1px solid #1a1a1a" });`;

    expect(applySuggestion(whole, lintRule(rule, whole, options)[0])).toBe(
      `const a = css({ color: token("color.text") });`
    );
    expect(applySuggestion(partial, lintRule(rule, partial, options)[0])).toBe(
      'const a = css({ border: `1px solid ${token("color.text")}` });'
    );
  });

  it("checks color attributes on host elements only", () => {
    const code = `<svg><path fill="#1a1a1a" /></svg>`;
    const [message] = lintRule(rule, code);

    expect(applySuggestion(code, message)).toBe(
      `<svg><path fill="var(--acme-color-text)" /></svg>`
    );
    expect(
      applySuggestion(code, lintRule(rule, code, { tokenReference: "function" })[0])
    ).toBe(`<svg><path fill={token("color.text")} /></svg>`);
    expect(lintRule(rule, `<Icon color="#1a1a1a" />`)).toEqual([]);
  });
});

describe("no-unsafe-design-token-usage", () => {
  const rule = "no-unsafe-design-token-usage";

  it("requires static token paths", () => {
    expect(lintRule(rule, `const a = token(name);`)[0]?.message).toBe(
      "Pass the token path to token() as a string literal so it can be checked against the design system"
    );
    expect(lintRule(rule, `const a = token("color.primary");`)).toEqual([]);
  });

  it("reports unknown token paths with a suggestion", () => {
    const code = `const a = token("color.primay");`;
    const [message] = lintRule(rule, code);

    expect(message?.message).toBe(
      'The token "color.primay" does not exist in the design system. Did you mean "color.primary"?'
    );
    expect(applySuggestion(code, message)).toBe(
      `const a = token("color.primary");`
    );
  });

  it("reports unknown design-system custom properties", () => {
    const code = `const a = css({ color: "var(--acme-color-primay)" });`;
    const [message] = lintRule(rule, code);

    expect(message?.message).toMatch(/--acme-color-primay is not a design-system token/);
    expect(applySuggestion(code, message)).toBe(
      `const a = css({ color: "var(--acme-color-primary)" });`
    );
    expect(lintRule(rule, `const a = css({ color: "var(--other-x)" });`)).toEqual([]);
    expect(lintRule(rule, "const a = `var(--acme-${x})`;")).toEqual([]);
  });

  it("recognizes unprefixed variables by top-level token group", () => {
    const plugin = createPlugin({}, { cssVarPrefix: false });
    expect(
      lintRule(rule, `const a = "var(--color-nope)";`, {}, plugin)
    ).toHaveLength(1);
    expect(lintRule(rule, `const a = "var(--brand-x)";`, {}, plugin)).toEqual([]);
  });

  it("fixes direct custom property usage to the token function", () => {
    expect(
      fixRule(rule, `const a = css({ color: "var(--acme-color-text)" });`, {
        tokenReference: "function"
      })
    ).toBe(`const a = css({ color: token("color.text") });`);
  });
});

describe("no-deprecated-design-token-usage", () => {
  const rule = "no-deprecated-design-token-usage";

  it("suggests the replacement named in $deprecated", () => {
    const call = `const a = token("color.legacy");`;
    const [callMessage] = lintRule(rule, call);
    expect(callMessage?.message).toBe(
      'The token "color.legacy" is deprecated in favour of "color.primary"'
    );
    expect(applySuggestion(call, callMessage)).toBe(
      `const a = token("color.primary");`
    );

    const variable = `const a = css({ color: "var(--acme-color-legacy)" });`;
    expect(applySuggestion(variable, lintRule(rule, variable)[0])).toBe(
      `const a = css({ color: "var(--acme-color-primary)" });`
    );
  });

  it("reports deprecated tokens without a replacement", () => {
    expect(lintRule(rule, `const a = token("color.retired");`)[0]?.message).toBe(
      'The token "color.retired" is deprecated'
    );
    expect(lintRule(rule, `const a = token("color.text");`)).toEqual([]);
  });
});

describe("use-tokens-space", () => {
  const rule = "use-tokens-space";

  it("reports raw spacing and suggests the matching space token", () => {
    const code = `const a = css({ padding: 16 });`;
    const [message] = lintRule(rule, code);

    expect(message?.message).toBe(
      'Hard-coded spacing "16" in padding. Use a space token (e.g. var(--acme-space-1), var(--acme-space-2), var(--acme-space-4))'
    );
    expect(applySuggestion(code, message)).toBe(
      `const a = css({ padding: "var(--acme-space-4)" });`
    );
  });

  it("reports each literal part and compares rem as pixels", () => {
    const messages = lintRule(rule, `const a = css({ padding: "8px 13px" });`);
    expect(messages).toHaveLength(2);
    expect(messages[0]?.suggestions).toHaveLength(1);
    expect(messages[1]?.suggestions ?? []).toEqual([]);

    const code = `<div style={{ paddingTop: "1rem" }} />`;
    expect(applySuggestion(code, lintRule(rule, code)[0])).toBe(
      `<div style={{ paddingTop: "var(--acme-space-4)" }} />`
    );
  });

  it("allows zero, auto, percentages and references", () => {
    expect(
      lintRule(
        rule,
        `const a = css({ margin: "0 auto", top: "50%", gap: "var(--acme-space-1)", left: 0 });`
      )
    ).toEqual([]);
  });

  it("reads styled templates", () => {
    const code = "const Box = styled.div`gap: 4px;`;";
    expect(applySuggestion(code, lintRule(rule, code)[0])).toBe(
      "const Box = styled.div`gap: var(--acme-space-1);`;"
    );
  });
});

describe("use-tokens-shape", () => {
  const rule = "use-tokens-shape";

  it("reports raw radii and border widths", () => {
    const radius = `const a = css({ borderRadius: 4 });`;
    expect(applySuggestion(radius, lintRule(rule, radius)[0])).toBe(
      `const a = css({ borderRadius: "var(--acme-radius-sm)" });`
    );

    const border = `const a = css({ border: "1px solid var(--acme-color-text)" });`;
    expect(applySuggestion(border, lintRule(rule, border)[0])).toBe(
      `const a = css({ border: "var(--acme-border-width-thin) solid var(--acme-color-text)" });`
    );
  });

  it("allows percentage radii", () => {
    expect(lintRule(rule, `const a = css({ borderRadius: "50%" });`)).toEqual([]);
  });
});

describe("use-tokens-typography", () => {
  const rule = "use-tokens-typography";

  it("reports raw font values and suggests matching tokens", () => {
    const size = `const a = css({ fontSize: "16px" });`;
    expect(applySuggestion(size, lintRule(rule, size)[0])).toBe(
      `const a = css({ fontSize: "var(--acme-font-size-md)" });`
    );

    const weight = `const a = css({ fontWeight: 700 });`;
    expect(applySuggestion(weight, lintRule(rule, weight)[0])).toBe(
      `const a = css({ fontWeight: "var(--acme-font-weight-bold)" });`
    );

    const family = `const a = css({ fontFamily: "Inter, sans-serif" });`;
    expect(applySuggestion(family, lintRule(rule, family)[0])).toBe(
      `const a = css({ fontFamily: "var(--acme-font-family-sans)" });`
    );
    expect(lintRule(rule, `const a = css({ fontWeight: "normal" });`)).toEqual([]);
  });

  it("limits font families to the schema fonts without family tokens", () => {
    const plugin = createPlugin({
      tokens: { space: { $type: "dimension", 1: { $value: "4px" } } }
    } as unknown as Partial<Schema>);

    expect(
      lintRule(rule, `const a = css({ fontFamily: "Comic Sans" });`, {}, plugin)[0]
        ?.message
    ).toBe(
      'Font family "Comic Sans" is not part of the design system. Use one of: Inter'
    );
    expect(
      lintRule(rule, `const a = css({ fontFamily: "Inter, sans-serif" });`, {}, plugin)
    ).toEqual([]);
  });
});

describe("use-tokens-motion", () => {
  const rule = "use-tokens-motion";

  it("reports raw durations and easings in shorthands", () => {
    const code = `const a = css({ transition: "opacity 100ms ease-in" });`;
    const messages = lintRule(rule, code);

    expect(messages.map(message => message.messageId)).toEqual([
      "noRawDuration",
      "noRawEasing"
    ]);
    expect(applySuggestion(code, messages[0])).toBe(
      `const a = css({ transition: "opacity var(--acme-motion-duration-fast) ease-in" });`
    );
  });

  it("matches cubic-bezier tokens and allows zero durations", () => {
    const code = `const a = css({ transitionTimingFunction: "cubic-bezier(0.2,0,0,1)" });`;
    expect(applySuggestion(code, lintRule(rule, code)[0])).toBe(
      `const a = css({ transitionTimingFunction: "var(--acme-motion-easing-standard)" });`
    );
    expect(lintRule(rule, `const a = css({ transitionDuration: "0s" });`)).toEqual([]);
  });
});
