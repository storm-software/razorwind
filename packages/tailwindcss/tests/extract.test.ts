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

import { mkdir, mkdtemp, symlink, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  detectTailwindWorkspace,
  extractTailwindTokens
} from "../src/extract";

const require = createRequire(import.meta.url);
const repoTailwindRoot = dirname(require.resolve("tailwindcss/package.json"));

async function makeTailwindFixture(css: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "razorwind-tw-"));

  await writeFile(
    join(dir, "package.json"),
    JSON.stringify({
      name: "razorwind-tw-fixture",
      private: true,
      dependencies: { tailwindcss: "^4.3.3" }
    }),
    "utf8"
  );
  await mkdir(join(dir, "node_modules"), { recursive: true });
  await symlink(repoTailwindRoot, join(dir, "node_modules/tailwindcss"));
  await mkdir(join(dir, "src"), { recursive: true });
  await writeFile(join(dir, "src/app.css"), css, "utf8");
  return dir;
}

describe("detectTailwindWorkspace", () => {
  it("detects a v4 workspace with a Tailwind CSS entry", async () => {
    const dir = await makeTailwindFixture(`@import "tailwindcss";
@theme {
  --color-primary: #0066cc;
}
`);

    const workspace = await detectTailwindWorkspace(dir);
    expect(workspace.configured).toBe(true);
    expect(workspace.version).toBe("v4");
    expect(workspace.cssFile).toMatch(/app\.css$/);
  });
});

describe("extractTailwindTokens", () => {
  it("extracts theme tokens from a Tailwind v4 CSS entry", async () => {
    const dir = await makeTailwindFixture(`@import "tailwindcss";
@theme {
  --color-primary: #0066cc;
  --spacing-sm: 0.5rem;
}
`);

    const tokens = await extractTailwindTokens({
      cwd: dir,
      cssPath: "src/app.css"
    });

    expect(tokens).toBeDefined();
    expect(tokens).toMatchObject({
      color: {
        primary: expect.anything()
      }
    });
  });

  it("returns undefined when Tailwind is not configured", async () => {
    const dir = await mkdtemp(join(tmpdir(), "razorwind-tw-empty-"));
    await writeFile(
      join(dir, "package.json"),
      JSON.stringify({ name: "empty", private: true }),
      "utf8"
    );

    const tokens = await extractTailwindTokens({ cwd: dir });
    expect(tokens).toBeUndefined();
  });
});
