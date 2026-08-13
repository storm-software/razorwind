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

import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  resolveConfig,
  resolveConfigs
} from "../../src/lib/resolve-config";

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

  it("includes a resolved fontsPath on the config", async () => {
    const dir = await mkdtemp(join(tmpdir(), "razorwind-resolve-config-"));
    await writeFile(
      join(dir, "razorwind.config.ts"),
      `export default { plugins: [] };\n`,
      "utf8"
    );

    const config = await resolveConfig(dir, {
      configFile: "razorwind.config.ts"
    });

    expect(config.fontsPath).toEqual(expect.any(String));
    expect(String(config.fontsPath).startsWith(dir)).toBe(true);
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

  it("resolves an array config into two independent configs", async () => {
    const dir = await mkdtemp(join(tmpdir(), "razorwind-resolve-config-"));
    await writeFile(
      join(dir, "razorwind.config.ts"),
      `export default [
  { name: "dark", tokensPath: "dark.json", verbose: true, plugins: [{ name: "css" }] },
  { name: "light", tokensPath: "light.json", plugins: [{ name: "md" }] }
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
    expect(configs[1]?.tokensPath).toEqual(["tokens.json", "light.tokens.json"]);
  });

  it("returns the first array item from resolveConfig", async () => {
    const dir = await mkdtemp(join(tmpdir(), "razorwind-resolve-config-"));
    await writeFile(
      join(dir, "razorwind.config.ts"),
      `export default [
  { name: "dark", plugins: [{ name: "css" }] },
  { name: "light", plugins: [{ name: "md" }] }
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
  { name: "dark", plugins: [{ name: "css" }] },
  { name: "light", plugins: [{ name: "md" }] }
];
`,
      "utf8"
    );

    const configs = await resolveConfigs(dir, {
      configFile: "razorwind.config.ts"
    });

    expect(configs.map(config => config.name)).toEqual(["dark", "light"]);
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
