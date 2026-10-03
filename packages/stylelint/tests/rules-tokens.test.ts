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
import stylelint from "stylelint";
import { describe, expect, it } from "vitest";
import {
  createPlugin,
  designSystem,
  fixRule,
  lint,
  lintRule,
  messages,
  only
} from "./fixture";

describe("ensure-design-token-usage", () => {
  const rule = "ensure-design-token-usage";

  it("reports hard-coded colors with schema examples", async () => {
    expect(await messages(rule, `.a { color: #abcdef; }`)).toEqual([
      'Hard-coded color "#abcdef". Use a color token (e.g. var(--acme-color-primary), var(--acme-color-text), var(--acme-color-blue-500)); a missing value is a token to add, not a literal to inline (design-system/ensure-design-token-usage)'
    ]);
  });

  it("names the tokens whose value matches the literal", async () => {
    expect(await messages(rule, `.a { color: #0066cc; }`)).toEqual([
      'Hard-coded color "#0066cc". Use a color token (matching: var(--acme-color-primary), var(--acme-color-blue-500)); a missing value is a token to add, not a literal to inline (design-system/ensure-design-token-usage)'
    ]);
  });

  it("points at the literal", async () => {
    const [warning] = await lintRule(rule, `.a {\n  color: #1a1a1a;\n}`);

    expect(warning).toMatchObject({
      line: 2,
      column: 10,
      endLine: 2,
      endColumn: 17
    });
  });

  it("fixes a literal only when exactly one token matches", async () => {
    expect(await fixRule(rule, `.a { color: rgb(26 26 26); }`)).toBe(
      `.a { color: var(--acme-color-text); }`
    );
    expect(await fixRule(rule, `.a { color: #0066cc; }`)).toBe(
      `.a { color: #0066cc; }`
    );
  });

  it("reports every color in a value", async () => {
    expect(await lintRule(rule, `.a { border: 1px solid red; }`)).toHaveLength(
      1
    );
    expect(
      await lintRule(rule, `.a { background: linear-gradient(#fff, #000); }`)
    ).toHaveLength(2);
  });

  it("reports hard-coded shadows", async () => {
    const code = `.a { box-shadow: 0 1px 2px #0000001a; }`;

    expect(await lintRule(rule, code)).toHaveLength(1);
    expect(await fixRule(rule, code)).toBe(
      `.a { box-shadow: var(--acme-shadow-sm); }`
    );
  });

  it("does not suggest deprecated tokens", async () => {
    expect(await messages(rule, `.a { color: #ff0000; }`)).toEqual([
      expect.stringContaining("(e.g. var(--acme-color-primary)")
    ]);
  });

  it("allows references, keywords, fallbacks and token definitions", async () => {
    expect(
      await lintRule(
        rule,
        `.a {
          color: var(--acme-color-text);
          background: transparent;
          border-color: currentColor;
          outline-color: var(--x, #fff);
          background-image: url(red.png);
          --brand: #fff;
        }`
      )
    ).toEqual([]);
  });

  it("checks spacing and typography when those domains are enabled", async () => {
    const code = `.a { padding: 8px; font-size: 16px; color: #1a1a1a; }`;

    expect(await lintRule(rule, code)).toHaveLength(1);
    expect(
      await lintRule(rule, code, {
        tokenUsage: { color: false, spacing: true, typography: true }
      })
    ).toHaveLength(2);
    expect(
      await fixRule(rule, code, {
        tokenUsage: { spacing: true, typography: true }
      })
    ).toBe(
      `.a { padding: var(--acme-space-2); font-size: var(--acme-font-size-md); color: var(--acme-color-text); }`
    );
  });

  it("reports custom properties outside the design system when enabled", async () => {
    const code = `.a { width: var(--sidebar-width); color: var(--acme-color-text); }`;

    expect(await lintRule(rule, code)).toEqual([]);
    expect(
      await messages(rule, code, { tokenUsage: { nonTokenCssVariables: true } })
    ).toEqual([
      "The custom property --sidebar-width is not a design token. Reference a design token, or add the value to the schema as one (design-system/ensure-design-token-usage)"
    ]);
  });

  it("validates the domains option", async () => {
    await expect(
      lintRule(rule, `.a {}`, {
        tokenUsage: { colour: true } as never
      })
    ).rejects.toThrow(/Invalid option/);
  });

  it("honours disable comments, including for fixes", async () => {
    const code = `.a {
  /* stylelint-disable-next-line design-system/ensure-design-token-usage */
  color: #1a1a1a;
}`;

    expect(await lintRule(rule, code)).toEqual([]);
    expect(await fixRule(rule, code)).toBe(code);
  });
});

describe("use-tokens-space", () => {
  const rule = "use-tokens-space";

  it("reports hard-coded spacing", async () => {
    expect(
      await messages(
        rule,
        `.a { padding: 8px 13px; margin: 0 auto; gap: var(--acme-space-1); }`
      )
    ).toEqual([
      'Hard-coded spacing "8px" in padding. Use a space token (matching: var(--acme-space-2)) (design-system/use-tokens-space)',
      'Hard-coded spacing "13px" in padding. Use a space token (e.g. var(--acme-space-1), var(--acme-space-2), var(--acme-space-4)) (design-system/use-tokens-space)'
    ]);
  });

  it("fixes several literals in one value", async () => {
    expect(await fixRule(rule, `.a { padding: 4px 0.5rem 16px 13px; }`)).toBe(
      `.a { padding: var(--acme-space-1) var(--acme-space-2) var(--acme-space-4) 13px; }`
    );
  });

  it("skips preprocessor variables and functions", async () => {
    expect(
      await lintRule(
        rule,
        `.a { padding: $gutter calc(100% - 8px); margin-inline: @gap; }`
      )
    ).toEqual([]);
  });

  it("is off when the schema defines no space tokens", () => {
    const plugin = createPlugin({
      tokens: {
        light: { color: { $type: "color", a: { $value: "#000" } } }
      } as unknown as Schema["tokens"]
    });
    expect(plugin.defaultSeverity["use-tokens-space"]).toBe("off");
  });
});

describe("use-tokens-shape", () => {
  const rule = "use-tokens-shape";

  it("reports radius and border width literals", async () => {
    expect(
      await fixRule(
        rule,
        `.a { border-radius: 4px; border: 1px solid; border-top-left-radius: 3px; }`
      )
    ).toBe(
      `.a { border-radius: var(--acme-radius-sm); border: var(--acme-border-width-thin) solid; border-top-left-radius: 3px; }`
    );
  });
});

describe("use-tokens-typography", () => {
  const rule = "use-tokens-typography";

  it("reports font literals and fixes single matches", async () => {
    expect(
      await fixRule(
        rule,
        `.a { font-size: 1rem; font-weight: bold; font-family: Inter, sans-serif; }`
      )
    ).toBe(
      `.a { font-size: var(--acme-font-size-md); font-weight: var(--acme-font-weight-bold); font-family: var(--acme-font-family-sans); }`
    );
  });

  it("allows keywords and line heights without tokens", async () => {
    expect(
      await lintRule(
        rule,
        `.a { font-family: inherit; font-weight: normal; line-height: 1.5; }`
      )
    ).toEqual([]);
  });

  it("checks families against the schema fonts without family tokens", async () => {
    const plugin = createPlugin({
      tokens: {} as Schema["tokens"]
    });

    expect(
      await messages(
        "use-tokens-typography",
        `.a { font-family: Inter; } .b { font-family: "Comic Sans MS", cursive; }`,
        {},
        plugin
      )
    ).toEqual([
      'Font family ""Comic Sans MS", cursive" is not part of the design system. Use one of: Inter (design-system/use-tokens-typography)'
    ]);
  });
});

describe("use-tokens-motion", () => {
  const rule = "use-tokens-motion";

  it("reports durations and easings, including in shorthands", async () => {
    expect(
      await messages(rule, `.a { transition: opacity 100ms ease; }`)
    ).toEqual([
      'Hard-coded duration "100ms" in transition. Use a duration token (matching: var(--acme-motion-duration-fast)) (design-system/use-tokens-motion)',
      'Hard-coded easing "ease" in transition. Use an easing token (e.g. var(--acme-motion-easing-standard)) (design-system/use-tokens-motion)'
    ]);
  });

  it("matches equivalent durations and easings", async () => {
    expect(
      await fixRule(
        rule,
        `.a { transition-duration: 0.1s; transition-timing-function: cubic-bezier(0.2,0,0,1); }`
      )
    ).toBe(
      `.a { transition-duration: var(--acme-motion-duration-fast); transition-timing-function: var(--acme-motion-easing-standard); }`
    );
  });
});

describe("no-unsafe-design-token-usage", () => {
  const rule = "no-unsafe-design-token-usage";

  it("reports tokens the design system does not define", async () => {
    expect(
      await messages(
        rule,
        `.a { color: var(--acme-color-txt); width: var(--sidebar-width); --x: var(--acme-space-9); }`
      )
    ).toEqual([
      "The token --acme-color-txt does not exist in the design system. Did you mean --acme-color-text? (design-system/no-unsafe-design-token-usage)",
      "The token --acme-space-9 does not exist in the design system. Did you mean --acme-space-1, --acme-space-2, --acme-space-4? (design-system/no-unsafe-design-token-usage)"
    ]);
  });

  it("allows fallbacks by default", async () => {
    expect(
      await lintRule(
        rule,
        `.a { color: var(--acme-color-text, #000); margin: var(--acme-space-1); }`
      )
    ).toEqual([]);
  });

  it("requires fallbacks when forced, filling in the token value", async () => {
    const code = `.a { color: var(--acme-color-text); padding: var(--acme-space-1) var(--acme-space-2, 8px); }`;

    expect(await messages(rule, code, { fallbackUsage: "forced" })).toEqual([
      "Token --acme-color-text is missing a fallback. Add one so the style survives without the token stylesheet (design-system/no-unsafe-design-token-usage)",
      "Token --acme-space-1 is missing a fallback. Add one so the style survives without the token stylesheet (design-system/no-unsafe-design-token-usage)"
    ]);
    expect(await fixRule(rule, code, { fallbackUsage: "forced" })).toBe(
      `.a { color: var(--acme-color-text, #1a1a1a); padding: var(--acme-space-1, 4px) var(--acme-space-2, 8px); }`
    );
  });

  it("removes fallbacks when they are disallowed", async () => {
    expect(
      await fixRule(
        rule,
        `.a { color: var(--acme-color-text, var(--acme-color-primary, #000)); margin: var(--acme-space-1 , 4px) var(--acme-space-2, 8px); }`,
        { fallbackUsage: "none" }
      )
    ).toBe(
      `.a { color: var(--acme-color-text); margin: var(--acme-space-1) var(--acme-space-2); }`
    );
  });

  it("accepts Atlassian's shouldEnsureFallbackUsage flag", async () => {
    const { results } = await stylelint.lint({
      code: `.a { color: var(--acme-color-text); }`,
      config: {
        plugins: designSystem.plugins,
        rules: {
          "design-system/no-unsafe-design-token-usage": [
            true,
            { shouldEnsureFallbackUsage: true }
          ]
        }
      } as stylelint.Config
    });

    expect(results[0]?.warnings.map(warning => warning.text)).toEqual([
      expect.stringContaining("is missing a fallback")
    ]);
  });
});

describe("no-deprecated-design-token-usage", () => {
  const rule = "no-deprecated-design-token-usage";

  it("reports deprecated tokens and fixes renamed ones", async () => {
    const code = `.a { color: var(--acme-color-legacy); background: var(--acme-color-retired); }`;

    expect(await messages(rule, code)).toEqual([
      "The token --acme-color-legacy is deprecated in favour of --acme-color-primary (design-system/no-deprecated-design-token-usage)",
      "The token --acme-color-retired is deprecated (design-system/no-deprecated-design-token-usage)"
    ]);
    expect(await fixRule(rule, code)).toBe(
      `.a { color: var(--acme-color-primary); background: var(--acme-color-retired); }`
    );
  });
});

describe("rule options", () => {
  it("runs every enabled rule together", async () => {
    const ruleIds = (
      await lint(
        `.a { color: #1a1a1a; padding: 13px; color: var(--acme-color-legacy); }`
      )
    ).map(warning => warning.rule);

    expect(ruleIds).toEqual([
      "design-system/ensure-design-token-usage",
      "design-system/use-tokens-space",
      "design-system/no-deprecated-design-token-usage"
    ]);
  });

  it("reports unfixed literals at their source position after a fix", async () => {
    const { results, code } = await stylelint.lint({
      code: `.a {\n  padding: 8px 13px 4px;\n}`,
      config: designSystem.config({
        tokenUsage: { spacing: true },
        severity: only("use-tokens-space")
      }) as stylelint.Config,
      fix: true
    });
    // `ensure-design-token-usage` stays on alongside `use-tokens-space`.
    const withEnsure = await stylelint.lint({
      code: `.a {\n  padding: 8px 13px 4px;\n}`,
      config: designSystem.config({
        tokenUsage: { color: false, spacing: true }
      }) as stylelint.Config,
      fix: true
    });

    expect(code).toBe(
      `.a {\n  padding: var(--acme-space-2) 13px var(--acme-space-1);\n}`
    );
    for (const { warnings } of [...results, ...withEnsure.results]) {
      expect(warnings.length).toBeGreaterThan(0);
      for (const warning of warnings) {
        expect(warning).toMatchObject({ line: 2, column: 16, endColumn: 20 });
      }
    }
  });

  it("enables only the requested rule", () => {
    expect(only("use-tokens-space")?.["use-tokens-space"]).toBe("error");
  });
});
