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
import { afterEach, describe, expect, it } from "vitest";
import { loadFonts, parseFontFilename } from "../../src/lib/fonts/load";

const tempDirs: string[] = [];

async function createFixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "razorwind-fonts-"));
  tempDirs.push(root);
  return root;
}

function contextFor(cwd: string, fontsPath: string) {
  return {
    cwd,
    options: { fontsPath }
  } as Parameters<typeof loadFonts>[0];
}

describe("parseFontFilename", () => {
  it("infers family, weight, and italic from a filename", () => {
    expect(parseFontFilename("Inter-BoldItalic.woff2")).toEqual({
      family: "Inter",
      weight: 700,
      style: "italic",
      format: "woff2"
    });
  });

  it("treats a bare family filename as regular weight", () => {
    expect(parseFontFilename("JetBrainsMono.ttf")).toEqual({
      family: "JetBrainsMono",
      format: "truetype"
    });
  });
});

describe("loadFonts", () => {
  afterEach(() => {
    tempDirs.length = 0;
  });

  it("loads a Google Font from font.json", async () => {
    const root = await createFixture();
    const fontDir = join(root, "inter");
    await mkdir(fontDir, { recursive: true });
    await writeFile(
      join(fontDir, "font.json"),
      JSON.stringify({
        name: "inter",
        title: "Inter",
        source: "google",
        family: "Inter",
        role: "sans",
        weights: [400, 700]
      }),
      "utf8"
    );

    const fonts = await loadFonts(contextFor(root, "."));
    expect(fonts.inter).toMatchObject({
      source: "google",
      family: "Inter",
      role: "sans",
      weights: [400, 700]
    });
  });

  it("groups flat local files by family prefix", async () => {
    const root = await createFixture();
    await writeFile(join(root, "Inter-Regular.woff2"), "woff2", "utf8");
    await writeFile(join(root, "Inter-Bold.woff2"), "woff2", "utf8");

    const fonts = await loadFonts(contextFor(root, "."));
    const inter = fonts.inter;
    expect(inter?.source).toBe("local");
    if (inter?.source !== "local") {
      return;
    }

    expect(inter.files).toHaveLength(2);
    expect(inter.files.map(file => file.weight).toSorted()).toEqual([400, 700]);
  });
});
