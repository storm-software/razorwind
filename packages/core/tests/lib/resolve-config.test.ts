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
import { resolveConfig } from "../../src/lib/resolve-config";

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
});
