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
} from "../../src/tokens/tailwind";

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
  it("detects v4 when package.json lists tailwindcss and CSS imports it", async () => {
    const dir = await makeTailwindFixture(`@import "tailwindcss";
@theme {
  --color-brand: oklch(0.55 0.2 250);
}
`);

    const workspace = await detectTailwindWorkspace(dir);
    expect(workspace.configured).toBe(true);
    expect(workspace.version).toBe("v4");
    expect(workspace.cssFile).toMatch(/app\.css$/);
  });

  it("reports unconfigured when no tailwindcss dependency", async () => {
    const dir = await mkdtemp(join(tmpdir(), "razorwind-no-tw-"));
    await writeFile(
      join(dir, "package.json"),
      JSON.stringify({ name: "no-tw", private: true }),
      "utf8"
    );

    const workspace = await detectTailwindWorkspace(dir);
    expect(workspace.configured).toBe(false);
    expect(workspace.version).toBeNull();
  });
});

describe("extractTailwindTokens", () => {
  it("extracts @theme tokens via @tailwindcss/node", async () => {
    const dir = await makeTailwindFixture(`@import "tailwindcss";
@theme {
  --color-brand: oklch(0.55 0.2 250);
  --radius-lg: 0.75rem;
}
`);

    const tokens = await extractTailwindTokens({
      cwd: dir,
      cssPath: "src/app.css"
    });

    expect(tokens).toBeTruthy();
    expect((tokens as any)?.color?.brand?.$type).toBe("color");
    expect((tokens as any)?.radius?.lg?.$type).toBe("dimension");
  });

  it("returns null when Tailwind is not configured", async () => {
    const dir = await mkdtemp(join(tmpdir(), "razorwind-no-tw-"));
    await writeFile(
      join(dir, "package.json"),
      JSON.stringify({ name: "no-tw", private: true }),
      "utf8"
    );

    const tokens = await extractTailwindTokens({ cwd: dir });
    expect(tokens).toBeNull();
  });
});
