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
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import stylelint from "stylelint";
import { describe, expect, it } from "vitest";
import { buildGuardrailTheme } from "../src/eslint";
import { flattenThemeTokens } from "../src/generate";
import stylelintPlugin, {
  generateStylelintGuardrails,
  renderStylelintPlugin
} from "../src/stylelint";
import type {
  StylelintGuardrailConfig,
  StylelintGuardrailOptions
} from "../src/stylelint-runtime";
import { createGuardrails } from "../src/stylelint-runtime";

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

async function lint(
  code: string,
  options: StylelintGuardrailOptions = {},
  config: (
    options?: StylelintGuardrailOptions
  ) => StylelintGuardrailConfig = createGuardrails(theme).config
) {
  const { results } = await stylelint.lint({
    code,
    config: config(options) as stylelint.Config
  });

  return results[0]!.warnings;
}

async function ruleIds(code: string, options: StylelintGuardrailOptions = {}) {
  return (await lint(code, options)).map(warning => warning.rule);
}

describe("createGuardrails", () => {
  it("shares default severities with the ESLint guardrails", () => {
    const { defaultSeverity } = createGuardrails(theme);
    expect(defaultSeverity["no-color-literal"]).toBe("error");
    expect(defaultSeverity["no-stock-palette"]).toBe("warn");
    expect(defaultSeverity["no-shadow-literal"]).toBe("off");
  });

  it("allows token utilities in @apply", async () => {
    expect(
      await ruleIds(
        `.btn { @apply bg-primary rounded-lg p-sm hover:bg-blue-500 focus-visible:ring; }`
      )
    ).toEqual([]);
  });

  it("reports literals and stock colors in @apply", async () => {
    expect(
      await ruleIds(
        `.btn { @apply bg-[#ff0000] rounded-[3px] p-[13px] text-red-500 dark:bg-primary focus:ring; }`
      )
    ).toEqual([
      "design-system/no-color-literal",
      "design-system/no-stock-palette",
      "design-system/no-radius-literal",
      "design-system/no-spacing-literal",
      "design-system/no-dark-pairs",
      "design-system/focus-visible"
    ]);
  });

  it("points at the offending class", async () => {
    const [warning] = await lint(`.a {\n  @apply p-sm hover:bg-[#ff0000];\n}`);

    expect(warning?.text).toBe(
      "Arbitrary color value in class (bg-[#ff0000]). Use a color token utility (e.g. bg-blue-500, bg-primary); a missing value is a token to add, not a literal to inline (design-system/no-color-literal)"
    );
    expect(warning).toMatchObject({
      line: 2,
      column: 21,
      endLine: 2,
      endColumn: 33
    });
  });

  it("checks theme variables in declarations and at-rule preludes", async () => {
    const warnings = await lint(
      `.a {
  color: var(--color-primary);
  background: --theme(--color-unknown / 50%);
  border-radius: theme(--radius-xl);
  padding: var(--spacing-sm) var(--brand-gap);
}
@media (width >= theme(--breakpoint-md)) {}`
    );

    expect(warnings.map(warning => warning.text)).toEqual([
      "Theme variable --color-unknown is not defined by the design system tokens. Use an existing token or add it to the schema (design-system/no-unknown-theme-var)",
      "Theme variable --radius-xl is not defined by the design system tokens. Use an existing token or add it to the schema (design-system/no-unknown-theme-var)"
    ]);
  });

  it("does not read class patterns outside @apply", async () => {
    expect(await ruleIds(`.a { content: "bg-[#fff] focus:ring"; }`)).toEqual(
      []
    );
  });

  it("honours severity overrides, files and disable comments", async () => {
    const warnings = await lint(
      `.a { @apply text-red-500; }
/* stylelint-disable-next-line design-system/no-color-literal */
.b { @apply bg-[#fff]; }`,
      { severity: { "no-stock-palette": "error" } }
    );
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({
      rule: "design-system/no-stock-palette",
      severity: "error"
    });

    const config = createGuardrails(theme).config({
      files: ["src/**/*.css"],
      ignoreFiles: ["src/vendor/**"]
    });
    expect(config.rules).toBeUndefined();
    expect(config.ignoreFiles).toEqual(["src/vendor/**"]);
    expect(
      config.overrides?.[0]?.rules["design-system/no-stock-palette"]
    ).toEqual([true, { severity: "warning" }]);
    expect(
      config.overrides?.[0]?.rules["design-system/no-shadow-literal"]
    ).toBeNull();
  });

  it("prefixes rule names for bundling", () => {
    const { plugins, rules } = createGuardrails(theme, {
      rulePrefix: "tailwind-"
    });
    expect(plugins[0]?.ruleName).toBe(
      "design-system/tailwind-no-color-literal"
    );
    expect(rules["focus-visible"].ruleName).toBe(
      "design-system/tailwind-focus-visible"
    );
  });
});

describe("renderStylelintPlugin", () => {
  it("emits a module that Stylelint can load", async () => {
    const dir = await mkdtemp(join(tmpdir(), "razorwind-tailwind-stylelint-"));
    try {
      const file = join(dir, "index.mjs");
      await writeFile(
        file,
        renderStylelintPlugin(theme, {
          runtimeImport: resolve(
            import.meta.dirname,
            "../src/stylelint-runtime.ts"
          )
        })
      );
      const module = (await import(pathToFileURL(file).href)) as {
        default: (
          options?: StylelintGuardrailOptions
        ) => StylelintGuardrailConfig;
      };

      const warnings = await lint(
        `.a { @apply bg-[#fff]; }`,
        {},
        module.default
      );
      expect(warnings.map(warning => warning.rule)).toEqual([
        "design-system/no-color-literal"
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("generateStylelintGuardrails", () => {
  it("emits the plugin module and INSTALL.md", async () => {
    const result = await generateStylelintGuardrails(spec, {
      stylelintPath: "lint/tw.mjs",
      prefix: "acme"
    });

    expect(Object.keys(result)).toEqual(["lint/tw.mjs", "lint/INSTALL.md"]);
    expect(result["lint/tw.mjs"]?.chunks?.[0]?.content).toContain(
      'import { createGuardrails } from "@razorwind/tailwindcss/stylelint-runtime";'
    );
    expect(result["lint/INSTALL.md"]?.chunks?.[0]?.content).toContain(
      "stylelint-disable-next-line acme/no-color-literal"
    );
  });

  it("returns nothing without tokens", async () => {
    expect(
      await generateStylelintGuardrails({ ...spec, tokens: {} } as Schema)
    ).toEqual({});
  });

  it("registers as a Razorwind plugin", () => {
    expect(stylelintPlugin().name).toBe("tailwindcss:stylelint");
  });
});
