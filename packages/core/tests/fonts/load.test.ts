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
import { buildSfnt } from "./sfnt-fixture";

const tempDirs: string[] = [];

async function createFixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "razorwind-fonts-"));
  tempDirs.push(root);
  return root;
}

function contextFor(cwd: string, fontsPath: string | string[]) {
  return {
    cwd,
    options: { fontsPath }
  } as Parameters<typeof loadFonts>[0];
}

async function writeUfo(path: string, family: string, style: string) {
  await mkdir(path, { recursive: true });
  await writeFile(
    join(path, "fontinfo.plist"),
    `<?xml version="1.0"?><plist version="1.0"><dict><key>familyName</key><string>${family}</string><key>styleName</key><string>${style}</string><key>openTypeOS2WeightClass</key><integer>400</integer></dict></plist>`,
    "utf8"
  );
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

  it("loads a designspace from its UFO source metadata", async () => {
    const root = await createFixture();
    const fontsDir = join(root, "fonts");
    const regularUfo = join(fontsDir, "Acme-Regular.ufo");
    const italicUfo = join(fontsDir, "Acme-Italic.ufo");
    await mkdir(regularUfo, { recursive: true });
    await mkdir(italicUfo, { recursive: true });
    await writeFile(
      join(fontsDir, "Acme.designspace"),
      `<designspace format="5.0"><sources><source filename="Acme-Regular.ufo"/><source filename="Acme-Italic.ufo"/></sources></designspace>`,
      "utf8"
    );
    await writeFile(
      join(regularUfo, "fontinfo.plist"),
      `<?xml version="1.0"?><plist version="1.0"><dict><key>familyName</key><string>Acme Sans</string><key>styleName</key><string>Regular</string><key>openTypeOS2WeightClass</key><integer>400</integer></dict></plist>`,
      "utf8"
    );
    await writeFile(
      join(italicUfo, "fontinfo.plist"),
      `<?xml version="1.0"?><plist version="1.0"><dict><key>familyName</key><string>Acme Sans</string><key>styleName</key><string>Italic</string><key>openTypeOS2WeightClass</key><integer>400</integer></dict></plist>`,
      "utf8"
    );

    const fonts = await loadFonts(contextFor(root, "fonts"));

    expect(fonts["acme-sans"]).toMatchObject({
      source: "local",
      family: "Acme Sans",
      sources: expect.arrayContaining([
        {
          path: regularUfo,
          format: "ufo",
          weight: 400,
          style: "normal"
        },
        {
          path: italicUfo,
          format: "ufo",
          weight: 400,
          style: "italic"
        }
      ])
    });
  });

  it("loads a standalone UFO from fontinfo.plist", async () => {
    const root = await createFixture();
    const ufo = join(root, "fonts", "Display.ufo");
    await mkdir(ufo, { recursive: true });
    await writeFile(
      join(ufo, "fontinfo.plist"),
      `<?xml version="1.0"?><plist version="1.0"><dict><key>familyName</key><string>Display Serif</string><key>styleName</key><string>Bold</string><key>openTypeOS2WeightClass</key><integer>700</integer></dict></plist>`,
      "utf8"
    );

    const fonts = await loadFonts(contextFor(root, "fonts"));

    expect(fonts["display-serif"]).toMatchObject({
      source: "local",
      family: "Display Serif",
      sources: [
        {
          path: ufo,
          format: "ufo",
          weight: 700,
          style: "normal"
        }
      ]
    });
  });
  it("groups compiled files by the family embedded in each file", async () => {
    const root = await createFixture();
    const dist = join(root, "fonts", "dist");
    await mkdir(dist, { recursive: true });
    const files = {
      "AcmeSans-Regular.ttf": { weight: 400 },
      "AcmeSans-Text.ttf": { weight: 450 },
      "AcmeSans-LightItalic.ttf": { weight: 300, italicAngle: -12 },
      "AcmeSans-VF.ttf": { weight: 100, wght: [100, 700] as [number, number] }
    };
    for (const [filename, fixture] of Object.entries(files)) {
      await writeFile(
        join(dist, filename),
        buildSfnt({ family: "Acme Sans", ...fixture })
      );
    }

    const fonts = await loadFonts(contextFor(root, "fonts/dist"));

    expect(Object.keys(fonts)).toEqual(["acme-sans"]);
    const font = fonts["acme-sans"];
    expect(font).toMatchObject({ family: "Acme Sans", title: "Acme Sans" });
    expect(
      Object.fromEntries(
        (font?.source === "local" ? font.files : []).map(file => [
          file.path.slice(dist.length + 1),
          `${file.weight} ${file.style}`
        ])
      )
    ).toEqual({
      "AcmeSans-Regular.ttf": "400 normal",
      "AcmeSans-Text.ttf": "450 normal",
      "AcmeSans-LightItalic.ttf": "300 italic",
      "AcmeSans-VF.ttf": "100 700 normal"
    });
  });

  it("names a metadata-less font directory after itself", async () => {
    const root = await createFixture();
    const fontDir = join(root, "fonts", "acme");
    await mkdir(fontDir, { recursive: true });
    await writeFile(join(fontDir, "Acme-Regular.woff2"), "woff2", "utf8");

    const fonts = await loadFonts(contextFor(root, "fonts"));

    expect(Object.keys(fonts)).toEqual(["acme"]);
    expect(fonts.acme).toMatchObject({ family: "Acme", title: "Acme" });
  });

  it.each([
    ["compiled files first", ["dist", "src"]],
    ["UFO sources first", ["src", "dist"]]
  ])(
    "takes the family name from UFO sources over compiled filenames (%s)",
    async (_, order) => {
      const root = await createFixture();
      const dist = join(root, "dist");
      const ufo = join(root, "src", "AcmeSans-Regular.ufo");
      await mkdir(dist, { recursive: true });
      await writeFile(join(dist, "AcmeSans-Regular.ttf"), "ttf", "utf8");
      await writeFile(join(dist, "AcmeSans-BoldItalic.ttf"), "ttf", "utf8");
      await writeUfo(ufo, "Acme Sans", "Regular");

      const fonts = await loadFonts(contextFor(root, order));

      expect(Object.keys(fonts)).toEqual(["acme-sans"]);
      const font = fonts["acme-sans"];
      expect(font).toMatchObject({
        source: "local",
        name: "acme-sans",
        title: "Acme Sans",
        family: "Acme Sans",
        sources: [expect.objectContaining({ path: ufo, format: "ufo" })]
      });
      expect(font?.source === "local" ? font.files : []).toHaveLength(2);
    }
  );
});
