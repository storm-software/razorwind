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
import { Linter } from "eslint";
import { describe, expect, it } from "vitest";
import eslint, {
  buildGuardrailTheme,
  generateEslintGuardrails,
  renderEslintPlugin
} from "../src/eslint";
import type { GuardrailOptions } from "../src/eslint-runtime";
import { createGuardrails, parseFlatValue } from "../src/eslint-runtime";
import { flattenTokens } from "../src/flatten";
import { collectTamaguiVocabulary } from "../src/generate";

const tokens = {
  light: {
    color: {
      $type: "color",
      blue: {
        primitive: true,
        1: { $value: "#e6f0ff" },
        2: { $value: "#0066cc" }
      },
      background: { $value: "#ffffff" },
      "background-primary": { $value: "#0066cc", $theme: "primary" }
    },
    radius: {
      $type: "dimension",
      DEFAULT: { $value: { value: 4, unit: "px" } },
      lg: { $value: { value: 12, unit: "px" } }
    },
    space: {
      $type: "dimension",
      4: { $value: { value: 16, unit: "px" } },
      sm: { $value: { value: 8, unit: "px" } }
    },
    shadow: {
      $type: "shadow",
      sm: { $value: "0 1px 2px #0000001a" }
    }
  },
  dark: {
    color: {
      $type: "color",
      blue: {
        primitive: true,
        1: { $value: "#e6f0ff" },
        2: { $value: "#0066cc" }
      },
      background: { $value: "#000000" },
      "background-primary": { $value: "#66aaff", $theme: "primary" }
    }
  }
} as unknown as Schema["tokens"];

const spec = {
  name: "acme",
  components: {},
  icons: {},
  fonts: {},
  tokens
} as Schema;

const theme = buildGuardrailTheme(
  collectTamaguiVocabulary(spec, flattenTokens(tokens)),
  { name: "acme" }
);

function lint(code: string, options: GuardrailOptions = {}) {
  const linter = new Linter({ configType: "flat" });
  const config = createGuardrails(theme).config({
    files: ["**/*.jsx"],
    ...options
  });

  return linter
    .verify(
      code,
      [
        {
          ...config,
          languageOptions: {
            parserOptions: { ecmaFeatures: { jsx: true } }
          }
        }
      ],
      "component.jsx"
    )
    .map(message => message.ruleId);
}

describe("parseFlatValue", () => {
  it("splits base and modifier clauses", () => {
    expect(parseFlatValue("4 6 sm:6 4")).toEqual([
      { modifiers: [], parts: ["4", "6"] },
      { modifiers: ["sm"], parts: ["6", "4"] }
    ]);
    expect(parseFlatValue("background dark:hover:primary")).toEqual([
      { modifiers: [], parts: ["background"] },
      { modifiers: ["dark", "hover"], parts: ["primary"] }
    ]);
  });

  it("keeps parenthesized values whole", () => {
    expect(parseFlatValue("rgb(0 0 0 / 50%) group-hover/card:red")).toEqual([
      { modifiers: [], parts: ["rgb(0 0 0 / 50%)"] },
      { modifiers: ["group-hover/card"], parts: ["red"] }
    ]);
  });
});

describe("buildGuardrailTheme", () => {
  it("collects the names the generated config defines", () => {
    expect(theme.themes).toEqual(["light", "dark", "primary"]);
    expect(theme.tokens.color).toEqual(
      expect.arrayContaining(["background", "blue1", "blue2"])
    );
    expect(theme.tokens.space).toEqual(["4", "sm"]);
    expect(theme.tokens.radius).toEqual(["lg", "true"]);
    expect(theme.tokens.shadow).toEqual(["shadow.sm"]);
    expect(theme.shorthands.bg).toBe("backgroundColor");
  });

  it("merges custom shorthands over the v5 defaults", () => {
    const custom = buildGuardrailTheme(
      collectTamaguiVocabulary(spec, flattenTokens(tokens)),
      { shorthands: { br: "borderRadius" } }
    );

    expect(custom.shorthands.br).toBe("borderRadius");
    expect(custom.shorthands.p).toBe("padding");
  });
});

describe("guardrail rules", () => {
  it("allows token and theme values", () => {
    expect(
      lint(
        `<View bg="background hover:blue2" p="4 sm:sm" rounded="lg" m={0} boxShadow="shadow.sm" left="50%" />`
      )
    ).toEqual([]);
  });

  it("flags v2 $ tokens and condition objects", () => {
    expect(lint(`<View bg="$background" />`)).toEqual([
      "design-system/no-legacy-token-prefix"
    ]);
    expect(
      lint(`<View hoverStyle={{ bg: "background" }} $sm={{ p: "4" }} />`)
    ).toEqual([
      "design-system/no-legacy-condition-object",
      "design-system/no-legacy-condition-object"
    ]);
  });

  it("flags raw colors and stock palette colors", () => {
    expect(lint(`<View bg="#fff" />`)).toEqual([
      "design-system/no-color-literal"
    ]);
    expect(
      lint(`<Text color="background hover:oklch(0.5 0.1 200)" />`)
    ).toEqual(["design-system/no-color-literal"]);
    expect(lint(`<Text color="red10" />`)).toEqual([
      "design-system/no-stock-palette"
    ]);
    expect(lint(`<Text color="blue2" />`)).toEqual([]);
  });

  it("flags raw spacing and radius", () => {
    expect(lint(`<View p={13} />`)).toEqual([
      "design-system/no-spacing-literal"
    ]);
    expect(lint(`<View mt="12px" />`)).toEqual([
      "design-system/no-spacing-literal"
    ]);
    expect(lint(`<View gap="7" />`)).toEqual([
      "design-system/no-spacing-literal"
    ]);
    expect(lint(`<View m="-4" />`)).toEqual([]);
    expect(lint(`<View borderRadius={3} />`)).toEqual([
      "design-system/no-radius-literal"
    ]);
  });

  it("flags hand-authored shadows, dark pairs and focus rings", () => {
    expect(lint(`<View boxShadow="0 2px 4px #000" />`)).toEqual([
      "design-system/no-shadow-literal"
    ]);
    expect(lint(`<View bg="background dark:blue1" />`)).toEqual([
      "design-system/no-dark-pairs"
    ]);
    expect(lint(`<View outlineColor="focus:blue2" />`)).toEqual([
      "design-system/focus-visible"
    ]);
  });

  it("reads styled() configs, variants and conditional values", () => {
    expect(
      lint(`
        const Frame = styled(View, {
          bg: "#fff",
          pressStyle: { bg: "background" },
          variants: { padded: { true: { p: 13 } } }
        });
        const el = <View bg={active ? "blue1" : "#000"} />;
      `)
    ).toEqual([
      "design-system/no-color-literal",
      "design-system/no-legacy-condition-object",
      "design-system/no-spacing-literal",
      "design-system/no-color-literal"
    ]);
  });

  it("skips host elements and honors the components setting", () => {
    expect(lint(`<div color="#fff" />`)).toEqual([]);
    expect(lint(`<Icon color="#fff" />`, { components: ["View"] })).toEqual([]);
  });

  it("applies severity overrides", () => {
    expect(
      lint(`<View bg="#fff" />`, { severity: { "no-color-literal": "off" } })
    ).toEqual([]);
  });

  it("disables token rules for categories the schema does not define", () => {
    const empty = createGuardrails(
      buildGuardrailTheme({
        tokens: {},
        themeKeys: [],
        childThemes: [],
        hasDark: false,
        fonts: []
      })
    );

    expect(empty.defaultSeverity).toMatchObject({
      "no-legacy-token-prefix": "error",
      "no-legacy-condition-object": "error",
      "no-color-literal": "off",
      "no-spacing-literal": "off",
      "no-dark-pairs": "off"
    });
  });
});

describe("generateEslintGuardrails", () => {
  it("emits nothing unless targeting Tamagui v3", async () => {
    expect(await generateEslintGuardrails(spec)).toEqual({});
    expect(await generateEslintGuardrails(spec, { target: "v2" })).toEqual({});
  });

  it("emits the plugin module and install guide for v3", async () => {
    const result = await generateEslintGuardrails(spec, { target: "v3" });

    expect(Object.keys(result)).toEqual([
      "eslint/tamagui/razorwind-guardrails.mjs",
      "eslint/tamagui/INSTALL.md"
    ]);
  });

  it("renders a module bound to the runtime import", () => {
    const code = renderEslintPlugin(theme);

    expect(code).toContain(
      'import { createGuardrails } from "@razorwind/tamagui/eslint-runtime";'
    );
    expect(code).toContain('"prefix": "design-system"');
  });

  it("exposes a Razorwind plugin", () => {
    expect(eslint({ target: "v3" }).name).toBe("tamagui:eslint");
  });
});
