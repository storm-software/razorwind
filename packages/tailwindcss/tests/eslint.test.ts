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
  renderEslintPlugin,
  splitThemeCssVar
} from "../src/eslint";
import type { GuardrailOptions } from "../src/eslint-runtime";
import { createGuardrails } from "../src/eslint-runtime";
import { flattenThemeTokens } from "../src/generate";

const tokens = {
  light: {
    color: {
      $type: "color",
      primary: { $value: "#0066cc" },
      blue: { 500: { $value: "#3b82f6" } }
    },
    radius: {
      $type: "dimension",
      DEFAULT: { $value: { value: 4, unit: "px" } },
      lg: { $value: { value: 12, unit: "px" } }
    },
    spacing: {
      $type: "dimension",
      sm: { $value: { value: 0.5, unit: "rem" } }
    }
  },
  dark: {
    color: {
      $type: "color",
      primary: { $value: "#66aaff" },
      blue: { 500: { $value: "#60a5fa" } }
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

const theme = buildGuardrailTheme(flattenThemeTokens(tokens), {
  name: "acme"
});

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

describe("splitThemeCssVar", () => {
  it("resolves Tailwind v4 namespaces, longest first", () => {
    expect(splitThemeCssVar("--color-neutral-800")).toEqual([
      "color",
      "neutral-800"
    ]);
    expect(splitThemeCssVar("--font-weight-bold")).toEqual([
      "font-weight",
      "bold"
    ]);
    expect(splitThemeCssVar("--radius")).toEqual(["radius", ""]);
    expect(splitThemeCssVar("--text-sm--line-height")).toBeUndefined();
    expect(splitThemeCssVar("--brand-accent")).toBeUndefined();
  });
});

describe("buildGuardrailTheme", () => {
  it("collects namespaces and themes from the schema tokens", () => {
    expect(theme.themes).toEqual(["dark", "light"]);
    expect(theme.namespaces).toEqual({
      color: ["blue-500", "primary"],
      radius: ["", "lg"],
      spacing: ["sm"]
    });
  });

  it("includes font role variables", () => {
    const withFonts = buildGuardrailTheme([], {
      fonts: {
        inter: { name: "inter", title: "Inter", role: "sans", source: "google" }
      } as unknown as Schema["fonts"]
    });
    expect(withFonts.namespaces).toEqual({ font: ["sans"] });
  });
});

describe("createGuardrails", () => {
  it("derives default severities from the schema namespaces", () => {
    const { defaultSeverity } = createGuardrails(theme);
    expect(defaultSeverity["no-color-literal"]).toBe("error");
    expect(defaultSeverity["no-radius-literal"]).toBe("error");
    expect(defaultSeverity["no-dark-pairs"]).toBe("error");
    expect(defaultSeverity["no-shadow-literal"]).toBe("off");
    expect(defaultSeverity["no-typography-literal"]).toBe("off");
  });

  it("allows token utilities", () => {
    expect(
      lint(
        `<div className="bg-primary text-blue-500 rounded-lg p-sm bg-(--color-primary) rounded-[var(--radius)] focus-visible:ring-2" />`
      )
    ).toEqual([]);
  });

  it("reports raw color literals", () => {
    expect(lint(`<div className="bg-[#ff0000]" />`)).toEqual([
      "design-system/no-color-literal"
    ]);
    expect(lint(`<div className="text-[oklch(0.5_0.1_200)]" />`)).toEqual([
      "design-system/no-color-literal"
    ]);
  });

  it("reports stock palette colors the schema does not define", () => {
    expect(lint(`<div className="hover:bg-red-500/50" />`)).toEqual([
      "design-system/no-stock-palette"
    ]);
  });

  it("reports theme variables missing from the schema", () => {
    expect(lint(`<div className="bg-(--color-brand) p-[var(--x)]" />`)).toEqual(
      ["design-system/no-unknown-theme-var"]
    );
  });

  it("reports arbitrary radius and spacing", () => {
    expect(lint(`<div className="rounded-t-[3px] -mt-[13px]" />`)).toEqual([
      "design-system/no-radius-literal",
      "design-system/no-spacing-literal"
    ]);
  });

  it("quotes the missing variable in the message", () => {
    const linter = new Linter({ configType: "flat" });
    const [message] = linter.verify(
      `<div className="bg-(--color-brand)" />`,
      [
        {
          ...createGuardrails(theme).config({ files: ["**/*.jsx"] }),
          languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } }
        }
      ],
      "component.jsx"
    );
    expect(message?.message).toMatch(/^Theme variable --color-brand is not/);
  });

  it("reports hand-authored dark pairs for theme-aware tokens", () => {
    expect(lint(`<div className="bg-primary dark:bg-primary" />`)).toEqual([
      "design-system/no-dark-pairs"
    ]);
  });

  it("reports focus: rings", () => {
    expect(lint(`<button className="focus:ring-2" />`)).toEqual([
      "design-system/focus-visible"
    ]);
  });

  it("checks class helpers once, including nested calls", () => {
    expect(
      lint(
        `const a = cn("bg-[#fff]", clsx({ "rounded-[2px]": x }));
         const b = <div className={cn("bg-red-500")} />;
         const c = other("bg-[#fff]");`
      )
    ).toEqual([
      "design-system/no-color-literal",
      "design-system/no-radius-literal",
      "design-system/no-stock-palette"
    ]);
  });

  it("honours severity overrides", () => {
    expect(
      lint(`<div className="bg-red-500" />`, {
        severity: { "no-stock-palette": "off" }
      })
    ).toEqual([]);
  });
});

describe("generateEslintGuardrails", () => {
  it("renders a module bound to the runtime", () => {
    const content = renderEslintPlugin(theme);
    expect(content).toContain(
      `import { createGuardrails } from "@razorwind/tailwindcss/eslint-runtime";`
    );
    expect(content).toContain(`"blue-500"`);
    expect(content).toContain("export default guardrails.config;");
  });

  it("emits the plugin module and INSTALL.md", async () => {
    const result = await generateEslintGuardrails(spec, {
      eslintPath: "lint/guardrails.mjs",
      prefix: "acme"
    });
    expect(Object.keys(result)).toEqual([
      "lint/guardrails.mjs",
      "lint/INSTALL.md"
    ]);
    const module = result["lint/guardrails.mjs"]!.chunks[0]!.content;
    expect(module).toContain(`"prefix": "acme"`);
    expect(result["lint/INSTALL.md"]!.chunks[0]!.content).toContain(
      "acme/no-color-literal"
    );
  });

  it("returns nothing without tokens", async () => {
    expect(
      await generateEslintGuardrails({ ...spec, tokens: {} } as Schema)
    ).toEqual({});
  });

  it("registers as a Razorwind plugin", () => {
    expect(eslint().name).toBe("tailwindcss:eslint");
  });
});
