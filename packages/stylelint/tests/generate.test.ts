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
import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { generatePluginDocuments } from "../../core/src/lib/generate";
import stylelint, {
  generateStylelintPlugin,
  renderStylelintInstallMd,
  renderStylelintPlugin
} from "../src/index";
import { buildManifest } from "../src/manifest";
import type { DesignSystemPlugin } from "../src/runtime";
import { designSystem, lint, manifest, spec } from "./fixture";

describe("buildManifest", () => {
  it("collects tokens the way @razorwind/eslint does", () => {
    expect(manifest).toMatchObject({
      name: "Acme",
      prefix: "design-system",
      cssVarPrefix: "acme",
      themes: ["light", "dark"],
      fonts: [{ family: "Inter", role: "sans" }]
    });
    expect(
      manifest.tokens.find(token => token.path === "color.primary")
    ).toEqual({
      path: "color.primary",
      type: "color",
      category: "color",
      cssVar: "--acme-color-primary",
      value: "#0066cc",
      alias: true
    });
    expect(
      manifest.tokens.find(token => token.path === "color.legacy")
    ).toMatchObject({
      deprecated: "Use {color.primary} instead.",
      replacement: "color.primary"
    });
  });

  it("honours the prefix, CSS variable prefix and Tailwind options", () => {
    const custom = buildManifest(spec, {
      prefix: "acme",
      cssVarPrefix: false,
      tailwind: false
    });

    expect(custom.prefix).toBe("acme");
    expect(custom.cssVarPrefix).toBeUndefined();
    expect(custom.tokens[0]?.cssVar).toBe("--border-width-thin");
    expect(custom.tailwind).toBeUndefined();
    expect(manifest.tailwind?.namespaces.color).toContain("primary");
  });
});

describe("createDesignSystemPlugin", () => {
  it("derives default severities from the schema", () => {
    expect(designSystem.defaultSeverity).toMatchObject({
      "ensure-design-token-usage": "error",
      "no-unsafe-design-token-usage": "error",
      "no-deprecated-design-token-usage": "warn",
      "use-tokens-space": "warn",
      "use-tokens-motion": "warn",
      "no-physical-properties": "off",
      "no-margin": "off",
      "use-visually-hidden": "warn",
      "tailwind-no-color-literal": "error"
    });
  });

  it("exposes one namespaced Stylelint plugin per rule", () => {
    expect(designSystem.plugins.map(plugin => plugin.ruleName)).toEqual(
      Object.keys(designSystem.rules).map(id => `design-system/${id}`)
    );
    expect(designSystem.rules["ensure-design-token-usage"]?.meta).toMatchObject(
      {
        fixable: true
      }
    );
  });

  it("bundles the Tailwind guardrails under prefixed ids", async () => {
    const ruleIds = (
      await lint(`.a { @apply bg-[#ff0000]; color: var(--color-nope); }`)
    ).map(warning => warning.rule);

    expect(ruleIds).toEqual([
      "design-system/tailwind-no-color-literal",
      "design-system/tailwind-no-unknown-theme-var"
    ]);
  });

  it("builds a config with rule options and severities", () => {
    const config = designSystem.config({
      tokenUsage: { spacing: true },
      fallbackUsage: "forced",
      severity: { "no-margin": "error", "use-tokens-space": "off" }
    });

    expect(config.plugins).toBe(designSystem.plugins);
    expect(config.rules).toMatchObject({
      "design-system/ensure-design-token-usage": [
        { spacing: true },
        { severity: "error" }
      ],
      "design-system/no-unsafe-design-token-usage": [
        true,
        { fallbackUsage: "forced", severity: "error" }
      ],
      "design-system/no-deprecated-design-token-usage": [
        true,
        { severity: "warning" }
      ],
      "design-system/no-margin": [true, { severity: "error" }],
      "design-system/use-tokens-space": null
    });
  });

  it("scopes rules to files through overrides", () => {
    const config = designSystem.config({
      files: ["src/**/*.css"],
      ignoreFiles: ["src/vendor/**"]
    });

    expect(config.rules).toBeUndefined();
    expect(config.ignoreFiles).toEqual(["src/vendor/**"]);
    expect(config.overrides?.[0]?.files).toEqual(["src/**/*.css"]);
    expect(
      config.overrides?.[0]?.rules["design-system/use-tokens-space"]
    ).toEqual([true, { severity: "warning" }]);
  });
});

describe("renderStylelintPlugin", () => {
  it("renders a module bound to the runtime", () => {
    const code = renderStylelintPlugin(manifest);

    expect(code).toContain(
      'import { createDesignSystemPlugin } from "@razorwind/stylelint/runtime";'
    );
    expect(code).toContain('"cssVar": "--acme-color-primary"');
    expect(code).toContain("export default designSystem.config;");
  });

  it("emits a module that Stylelint can load", async () => {
    const dir = await mkdtemp(join(tmpdir(), "razorwind-stylelint-"));
    try {
      const file = join(dir, "index.mjs");
      await writeFile(
        file,
        renderStylelintPlugin(manifest, {
          runtimeImport: resolve(import.meta.dirname, "../src/runtime.ts")
        })
      );
      const module = (await import(pathToFileURL(file).href)) as {
        default: DesignSystemPlugin["config"];
      };

      const ruleIds = (
        await lint(`.a { color: #1a1a1a; }`, {}, { config: module.default })
      ).map(warning => warning.rule);
      expect(ruleIds).toEqual(["design-system/ensure-design-token-usage"]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("generateStylelintPlugin", () => {
  it("emits the plugin module and INSTALL.md", async () => {
    const result = await generateStylelintPlugin(spec, {
      stylelintPath: "lint/acme.mjs",
      prefix: "acme"
    });

    expect(Object.keys(result)).toEqual(["lint/acme.mjs", "lint/INSTALL.md"]);
    expect(result["lint/acme.mjs"]?.chunks?.[0]?.content).toContain(
      '"prefix": "acme"'
    );

    const install = result["lint/INSTALL.md"]?.chunks?.[0]?.content ?? "";
    expect(install).toContain("from 17 tokens, 4 components, 1 fonts");
    expect(install).toContain(
      "| `acme/use-tokens-space` | warn | Enforces usage of space design tokens rather than hard-coded values |"
    );
    expect(install).toContain("| `acme/tailwind-no-color-literal` | error |");
  });

  it("uses the default output path", async () => {
    expect(Object.keys(await generateStylelintPlugin(spec))).toEqual([
      "stylelint/design-system/index.mjs",
      "stylelint/design-system/INSTALL.md"
    ]);
  });

  it("accepts an existing .ts output filename", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "razorwind-stylelint-file-"));
    try {
      await mkdir(join(cwd, "lint"));
      await writeFile(join(cwd, "lint/acme.ts"), "");

      expect(
        Object.keys(
          await generateStylelintPlugin(
            spec,
            { stylelintPath: "lint/acme.ts" },
            cwd
          )
        )
      ).toEqual(["lint/acme.ts", "lint/INSTALL.md"]);
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("rejects an existing directory relative to the generation cwd", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "razorwind-stylelint-output-"));
    const outputDir = join(cwd, "lint");
    try {
      await mkdir(outputDir);

      await expect(
        generatePluginDocuments(spec, {
          cwd,
          plugins: [stylelint({ stylelintPath: "lint" })]
        } as Parameters<typeof generatePluginDocuments>[1])
      ).rejects.toThrow(/stylelintPath.*lint\/index\.mjs/);
      expect(await readdir(outputDir)).toEqual([]);
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("emits one shared plugin for multi-theme tokens", async () => {
    const documents = await generatePluginDocuments(spec, {
      plugins: [stylelint()]
    } as Parameters<typeof generatePluginDocuments>[1]);

    expect(Object.keys(documents).sort()).toEqual([
      "stylelint/design-system/INSTALL.md",
      "stylelint/design-system/index.mjs"
    ]);
    expect(
      documents["stylelint/design-system/index.mjs"]?.chunks?.[0]?.content
    ).toContain('"themes": [\n    "light",\n    "dark"\n  ]');
  });

  it("honours an install guide override", async () => {
    const result = await generateStylelintPlugin(spec, {
      installGuide: "# Custom"
    });
    expect(
      result["stylelint/design-system/INSTALL.md"]?.chunks?.[0]?.content
    ).toBe("# Custom");
  });

  it("returns nothing for an empty schema", async () => {
    expect(
      await generateStylelintPlugin({
        tokens: {},
        components: {},
        icons: {},
        fonts: {}
      } as unknown as Schema)
    ).toEqual({});
  });

  it("documents every rule in the install guide", () => {
    const install = renderStylelintInstallMd({
      stylelintPath: "x.mjs",
      manifest
    });
    for (const id of Object.keys(designSystem.rules)) {
      expect(install).toContain(`\`design-system/${id}\``);
    }
  });

  it("registers as a Razorwind plugin", () => {
    expect(stylelint().name).toBe("stylelint");
  });
});
