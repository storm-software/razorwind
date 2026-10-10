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
import eslint, {
  generateEslintPlugin,
  renderEslintInstallMd,
  renderEslintPlugin
} from "../src/index";
import type { DesignSystemPlugin } from "../src/runtime";
import { designSystem, lint, manifest, spec } from "./fixture";

describe("createDesignSystemPlugin", () => {
  it("derives default severities from the schema", () => {
    expect(designSystem.defaultSeverity).toMatchObject({
      "ensure-design-token-usage": "error",
      "no-deprecated-design-token-usage": "warn",
      "use-tokens-space": "warn",
      "no-margin": "warn",
      "no-physical-properties": "off",
      "no-html-button": "warn",
      "no-html-anchor": "off",
      "no-deprecated-imports": "error",
      "icon-label": "warn"
    });
  });

  it("exposes the Tailwind and Tamagui guardrails under prefixed ids", () => {
    expect(designSystem.rules).toHaveProperty("tailwind-no-color-literal");
    expect(designSystem.rules).toHaveProperty("tamagui-no-legacy-token-prefix");

    const ruleIds = lint(
      `const a = <><div className="bg-[#ff0000]" /><View bg="$background" /></>;`
    ).map(message => message.ruleId);
    expect(ruleIds).toEqual([
      "design-system/tailwind-no-color-literal",
      "design-system/tamagui-no-legacy-token-prefix"
    ]);
  });

  it("builds a flat config with settings for every rule family", () => {
    const config = designSystem.config({
      files: ["app/**/*.tsx"],
      tokenReference: "function",
      severity: { "no-margin": "error" },
      tailwind: { callees: ["cn"] },
      tamagui: { components: ["View"] }
    });

    expect(config.files).toEqual(["app/**/*.tsx"]);
    expect(config.rules["design-system/no-margin"]).toBe("error");
    expect(config.rules["design-system/no-physical-properties"]).toBe("off");
    expect(config.settings).toEqual({
      "razorwind-design-system": { tokenReference: "function" },
      razorwind: { attributes: ["className", "class"], callees: ["cn"] },
      "razorwind-tamagui": { components: ["View"], callees: ["styled"] }
    });
    expect(designSystem.configs.recommended?.plugins["design-system"]).toBe(
      designSystem.plugin
    );
  });
});

describe("renderEslintPlugin", () => {
  it("renders a module bound to the runtime", () => {
    const code = renderEslintPlugin(manifest);

    expect(code).toContain(
      'import { createDesignSystemPlugin } from "@razorwind/eslint/runtime";'
    );
    expect(code).toContain('"cssVar": "--acme-color-primary"');
    expect(code).toContain("export default designSystem.config;");
    expect(code).not.toContain("DesignSystemManifest");
  });

  it("annotates the manifest when emitting TypeScript", () => {
    const code = renderEslintPlugin(manifest, { eslintPath: "lint/index.ts" });

    expect(code).toContain(
      'import { createDesignSystemPlugin, type DesignSystemManifest } from "@razorwind/eslint/runtime";'
    );
    expect(code).toContain("export const manifest: DesignSystemManifest = {");
  });

  it("emits a module that ESLint can load", async () => {
    const dir = await mkdtemp(join(tmpdir(), "razorwind-eslint-"));
    try {
      const file = join(dir, "index.mjs");
      await writeFile(
        file,
        renderEslintPlugin(manifest, {
          runtimeImport: resolve(import.meta.dirname, "../src/runtime.ts")
        })
      );
      const module = (await import(pathToFileURL(file).href)) as {
        default: DesignSystemPlugin["config"];
      };

      const ruleIds = lint(
        `const a = css({ color: "#1a1a1a" });`,
        {},
        { config: module.default } as DesignSystemPlugin
      ).map(message => message.ruleId);
      expect(ruleIds).toEqual(["design-system/ensure-design-token-usage"]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("generateEslintPlugin", () => {
  it("emits the plugin module and INSTALL.md", async () => {
    const result = await generateEslintPlugin(spec, {
      eslintPath: "lint/acme.mjs",
      prefix: "acme"
    });

    expect(Object.keys(result)).toEqual(["lint/acme.mjs", "lint/INSTALL.md"]);
    expect(result["lint/acme.mjs"]?.chunks?.[0]?.content).toContain(
      '"prefix": "acme"'
    );

    const install = result["lint/INSTALL.md"]?.chunks?.[0]?.content ?? "";
    expect(install).toContain("from 17 tokens, 9 components, 2 icons, 1 fonts");
    expect(install).toContain(
      "| `acme/use-tokens-space` | warn | Enforces usage of space design tokens rather than hard-coded values |"
    );
    expect(install).toContain("| `acme/tailwind-no-color-literal` | error |");
  });

  it("uses the default output path", async () => {
    expect(Object.keys(await generateEslintPlugin(spec))).toEqual([
      "eslint/design-system/index.mjs",
      "eslint/design-system/INSTALL.md"
    ]);
  });

  it("accepts a .ts output filename", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "razorwind-eslint-file-"));
    try {
      await mkdir(join(cwd, "lint"));
      await writeFile(join(cwd, "lint/acme.ts"), "");

      expect(
        Object.keys(
          await generateEslintPlugin(spec, { eslintPath: "lint/acme.ts" }, cwd)
        )
      ).toEqual(["lint/acme.ts", "lint/INSTALL.md"]);
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("rejects an existing directory relative to the generation cwd", async () => {
    const cwd = await mkdtemp(join(tmpdir(), "razorwind-eslint-output-"));
    const outputDir = join(cwd, "lint");
    try {
      await mkdir(outputDir);

      await expect(
        generatePluginDocuments(spec, {
          cwd,
          plugins: [eslint({ eslintPath: "lint" })]
        } as Parameters<typeof generatePluginDocuments>[1])
      ).rejects.toThrow(/eslintPath.*lint\/index\.mjs/);
      expect(await readdir(outputDir)).toEqual([]);
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it("emits one shared plugin for multi-theme tokens", async () => {
    const documents = await generatePluginDocuments(spec, {
      plugins: [eslint()]
    } as Parameters<typeof generatePluginDocuments>[1]);

    expect(Object.keys(documents).sort()).toEqual([
      "eslint/design-system/INSTALL.md",
      "eslint/design-system/index.mjs"
    ]);
    expect(
      documents["eslint/design-system/index.mjs"]?.chunks?.[0]?.content
    ).toContain('"themes": [\n    "light",\n    "dark"\n  ]');
  });

  it("honours an install guide override", async () => {
    const result = await generateEslintPlugin(spec, { installGuide: "# Custom" });
    expect(result["eslint/design-system/INSTALL.md"]?.chunks?.[0]?.content).toBe(
      "# Custom"
    );
  });

  it("returns nothing for an empty schema", async () => {
    expect(
      await generateEslintPlugin({
        tokens: {},
        components: {},
        icons: {},
        fonts: {}
      } as unknown as Schema)
    ).toEqual({});
  });

  it("documents every rule in the install guide", () => {
    const install = renderEslintInstallMd({ eslintPath: "x.mjs", manifest });
    for (const id of Object.keys(designSystem.rules)) {
      expect(install).toContain(`\`design-system/${id}\``);
    }
  });

  it("registers as a Razorwind plugin", () => {
    expect(eslint().name).toBe("eslint");
  });
});
