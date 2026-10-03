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

import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveConfig, resolveConfigs } from "../../src/lib/resolve-config";

describe("resolveConfig", () => {
  it("preserves verbose from config when execute options pass verbose false", async () => {
    const dir = await mkdtemp(join(tmpdir(), "razorwind-resolve-config-"));
    await writeFile(
      join(dir, "razorwind.config.ts"),
      `export default { verbose: true, plugins: [] };\n`,
      "utf8"
    );

    const config = await resolveConfig(dir, {
      configFile: "razorwind.config.ts",
      verbose: false
    });

    expect(config.verbose).toBe(true);
  });

  it("enables verbose when execute options pass verbose true", async () => {
    const dir = await mkdtemp(join(tmpdir(), "razorwind-resolve-config-"));
    await writeFile(
      join(dir, "razorwind.config.ts"),
      `export default { plugins: [] };\n`,
      "utf8"
    );

    const config = await resolveConfig(dir, {
      configFile: "razorwind.config.ts",
      verbose: true
    });

    expect(config.verbose).toBe(true);
  });

  it("keeps verbose false when neither config nor options enable it", async () => {
    const dir = await mkdtemp(join(tmpdir(), "razorwind-resolve-config-"));
    await writeFile(
      join(dir, "razorwind.config.ts"),
      `export default { plugins: [] };\n`,
      "utf8"
    );

    const config = await resolveConfig(dir, {
      configFile: "razorwind.config.ts",
      verbose: false
    });

    expect(config.verbose).toBe(false);
  });

  it("does not add default icon or font paths when the directories have no files", async () => {
    const dir = await mkdtemp(join(tmpdir(), "razorwind-resolve-config-"));
    await mkdir(join(dir, "assets/icons"), { recursive: true });
    await mkdir(join(dir, "assets/fonts"), { recursive: true });
    await writeFile(
      join(dir, "razorwind.config.ts"),
      `export default { plugins: [] };\n`,
      "utf8"
    );

    const config = await resolveConfig(dir, {
      configFile: "razorwind.config.ts"
    });

    expect(config.fontsPath).toBeUndefined();
    expect(config.iconsPath).toBeUndefined();
  });

  it("does not default icon and font paths to the assets directory", async () => {
    const dir = await mkdtemp(join(tmpdir(), "razorwind-resolve-config-"));
    await writeFile(join(dir, "razorwind.config.ts"), `export default {}\n`);
    await mkdir(join(dir, "assets/icons"), { recursive: true });
    await mkdir(join(dir, "assets/fonts"), { recursive: true });
    await writeFile(join(dir, "assets/icons/icon.svg"), "<svg />");
    await writeFile(join(dir, "assets/fonts/font.woff2"), "font");

    const config = await resolveConfig(dir, {
      configFile: "razorwind.config.ts"
    });

    expect(config.iconsPath).toBeUndefined();
    expect(config.fontsPath).toBeUndefined();
  });

  it("retains parser-only and preprocessor-only plugins", async () => {
    const dir = await mkdtemp(join(tmpdir(), "razorwind-resolve-config-"));
    await writeFile(
      join(dir, "razorwind.config.ts"),
      `export default {
  plugins: [
    {
      name: "parser-only",
      parsers: [{ pattern: /\\.tokens$/, parser: contents => JSON.parse(contents) }]
    },
    {
      name: "preprocessor-only",
      preprocessors: [dictionary => dictionary]
    }
  ]
};
`,
      "utf8"
    );

    const config = await resolveConfig(dir, {
      configFile: "razorwind.config.ts"
    });

    expect(config.plugins.map(plugin => plugin.name)).toEqual([
      "parser-only",
      "preprocessor-only"
    ]);
    expect(config.plugins[0]?.parsers).toHaveLength(1);
    expect(config.plugins[1]?.preprocessors).toHaveLength(1);
  });

  it("keeps an array fontsPath after resolution", async () => {
    const dir = await mkdtemp(join(tmpdir(), "razorwind-resolve-config-"));
    await writeFile(
      join(dir, "razorwind.config.ts"),
      `export default { plugins: [] };\n`,
      "utf8"
    );

    const config = await resolveConfig(dir, {
      configFile: "razorwind.config.ts",
      fontsPath: ["fonts-a", "fonts-b"]
    });

    expect(config.fontsPath).toEqual(expect.any(Array));
    expect(config.fontsPath).toHaveLength(2);
  });

  it("keeps the final segment of nested directory paths", async () => {
    const dir = await mkdtemp(join(tmpdir(), "razorwind-resolve-config-"));
    await writeFile(
      join(dir, "razorwind.config.ts"),
      `export default { plugins: [] };\n`,
      "utf8"
    );

    const config = await resolveConfig(dir, {
      configFile: "razorwind.config.ts",
      fontsPath: "fonts/dist",
      iconsPath: ["assets/icons"],
      componentsPath: "packages/ui/components"
    });

    expect(config.fontsPath).toBe("fonts/dist");
    expect(config.iconsPath).toEqual(["assets/icons"]);
    expect(config.componentsPath).toBe("packages/ui/components");
  });

  it("resolves an array config into two independent configs", async () => {
    const dir = await mkdtemp(join(tmpdir(), "razorwind-resolve-config-"));
    await writeFile(
      join(dir, "razorwind.config.ts"),
      `export default [
  { name: "dark", tokensPath: "dark.json", verbose: true, plugins: [{ name: "css", generate: () => ({}) }] },
  { name: "light", tokensPath: "light.json", plugins: [{ name: "md", generate: () => ({}) }] }
];
`,
      "utf8"
    );

    const configs = await resolveConfigs(dir, {
      configFile: "razorwind.config.ts",
      verbose: false
    });

    expect(configs).toHaveLength(2);
    expect(configs[0]?.name).toBe("dark");
    expect(configs[0]?.tokensPath).toBe("dark.json");
    expect(configs[0]?.verbose).toBe(true);
    expect(configs[0]?.plugins.map(plugin => plugin.name)).toEqual(["css"]);
    expect(configs[1]?.name).toBe("light");
    expect(configs[1]?.tokensPath).toBe("light.json");
    expect(configs[1]?.verbose).toBe(false);
    expect(configs[1]?.plugins.map(plugin => plugin.name)).toEqual(["md"]);
  });

  it("does not let execute tokensPath override per-item tokensPath", async () => {
    const dir = await mkdtemp(join(tmpdir(), "razorwind-resolve-config-"));
    await writeFile(
      join(dir, "razorwind.config.ts"),
      `export default [
  { name: "dark", tokensPath: ["tokens.json", "dark.tokens.json"], plugins: [{ name: "css" }] },
  { name: "light", tokensPath: ["tokens.json", "light.tokens.json"], plugins: [{ name: "css" }] }
];
`,
      "utf8"
    );

    const configs = await resolveConfigs(dir, {
      configFile: "razorwind.config.ts",
      tokensPath: "tokens/**/*.json"
    });

    expect(configs[0]?.tokensPath).toEqual(["tokens.json", "dark.tokens.json"]);
    expect(configs[1]?.tokensPath).toEqual([
      "tokens.json",
      "light.tokens.json"
    ]);
  });

  it("returns the first array item from resolveConfig", async () => {
    const dir = await mkdtemp(join(tmpdir(), "razorwind-resolve-config-"));
    await writeFile(
      join(dir, "razorwind.config.ts"),
      `export default [
  { name: "dark", plugins: [{ name: "css", generate: () => ({}) }] },
  { name: "light", plugins: [{ name: "md", generate: () => ({}) }] }
];
`,
      "utf8"
    );

    const config = await resolveConfig(dir, {
      configFile: "razorwind.config.ts"
    });

    expect(config.name).toBe("dark");
  });

  it("resolves a function that returns an array of configs", async () => {
    const dir = await mkdtemp(join(tmpdir(), "razorwind-resolve-config-"));
    await writeFile(
      join(dir, "razorwind.config.ts"),
      `export default () => [
  { name: "dark", plugins: [{ name: "css", generate: () => ({}) }] },
  { name: "light", plugins: [{ name: "md", generate: () => ({}) }] }
];
`,
      "utf8"
    );

    const configs = await resolveConfigs(dir, {
      configFile: "razorwind.config.ts"
    });

    expect(configs.map(config => config.name)).toEqual(["dark", "light"]);
  });

  it("does not duplicate array options when c12 loads the same config file", async () => {
    const dir = await mkdtemp(join(tmpdir(), "razorwind-resolve-config-"));
    await writeFile(
      join(dir, "razorwind.config.ts"),
      `export default {
  plugins: [],
  fonts: {
    code: {
      source: "google",
      family: "Google Sans Code",
      variable: true,
      weights: [300, 800],
      styles: ["normal", "italic"]
    }
  }
};
`,
      "utf8"
    );

    const config = await resolveConfig(dir, {
      configFile: "razorwind.config.ts"
    });
    const fonts = config.fonts as Record<
      string,
      { weights?: number[]; styles?: string[] }
    >;

    expect(fonts.code?.weights).toEqual([300, 800]);
    expect(fonts.code?.styles).toEqual(["normal", "italic"]);
  });

  it("still merges .razorwindrc and package.json when deduping the config file", async () => {
    const dir = await mkdtemp(join(tmpdir(), "razorwind-resolve-config-"));
    await writeFile(
      join(dir, "razorwind.config.ts"),
      `export default { plugins: [] };\n`,
      "utf8"
    );
    await writeFile(join(dir, ".razorwindrc"), `name=from-rc\n`, "utf8");
    await writeFile(
      join(dir, "package.json"),
      JSON.stringify({ name: "fixture", razorwind: { tokensPath: "from-package.json" } }),
      "utf8"
    );

    const config = await resolveConfig(dir, {
      configFile: "razorwind.config.ts"
    });

    expect(config.name).toBe("from-rc");
    expect(config.tokensPath).toBe("from-package.json");
  });

  it("throws when the config array is empty", async () => {
    const dir = await mkdtemp(join(tmpdir(), "razorwind-resolve-config-"));
    await writeFile(
      join(dir, "razorwind.config.ts"),
      `export default [];\n`,
      "utf8"
    );

    await expect(
      resolveConfigs(dir, { configFile: "razorwind.config.ts" })
    ).rejects.toThrow("Razorwind config array is empty");
  });
});
