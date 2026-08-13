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
import { prepareGenerationRuns } from "../../src/lib/prepare";
import type { Config } from "../../src/types/config";

function contextFor(cwd: string) {
  return {
    cwd,
    options: {} as Config
  } as Parameters<typeof prepareGenerationRuns>[0];
}

describe("prepareGenerationRuns", () => {
    it(
      "builds an independent spec per array config item",
      async () => {
    const dir = await mkdtemp(join(tmpdir(), "razorwind-prepare-"));
    await writeFile(
      join(dir, "razorwind.config.ts"),
      `export default [
  {
    name: "dark",
    tokens: { color: { fg: { $type: "color", $value: "#111111" } } },
    plugins: [{ name: "css" }]
  },
  {
    name: "light",
    tokens: { color: { fg: { $type: "color", $value: "#eeeeee" } } },
    plugins: [{ name: "css" }]
  }
];
`,
      "utf8"
    );

    const runs = await prepareGenerationRuns(contextFor(dir), {
      configFile: "razorwind.config.ts"
    });

    expect(runs).toHaveLength(2);
    expect(runs[0]?.spec.name).toBe("dark");
    expect(runs[1]?.spec.name).toBe("light");
    expect(runs[0]?.spec.tokens).toMatchObject({
      color: { fg: { $value: "#111111" } }
    });
    expect(runs[1]?.spec.tokens).toMatchObject({
      color: { fg: { $value: "#eeeeee" } }
    });
    expect(runs[0]?.config).not.toBe(runs[1]?.config);
      },
      20_000
    );
});
