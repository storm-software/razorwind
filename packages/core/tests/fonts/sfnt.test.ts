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
import { readSfntMetadata } from "../../src/lib/fonts/sfnt";
import { buildSfnt } from "./sfnt-fixture";

async function writeFixture(name: string, data: Buffer | string) {
  const path = join(await mkdtemp(join(tmpdir(), "razorwind-sfnt-")), name);
  await writeFile(path, data);

  return path;
}

describe("readSfntMetadata", () => {
  it("reads the family, weight, and style of a static font", async () => {
    const path = await writeFixture(
      "Acme-Bold.ttf",
      buildSfnt({ family: "Acme Sans", weight: 700 })
    );

    await expect(readSfntMetadata(path)).resolves.toEqual({
      family: "Acme Sans",
      weight: 700,
      style: "normal"
    });
  });

  it("prefers the typographic family over the legacy family", async () => {
    const path = await writeFixture(
      "Acme-Text.ttf",
      buildSfnt({
        family: "Acme Sans Text",
        typographicFamily: "Acme Sans",
        weight: 450
      })
    );

    await expect(readSfntMetadata(path)).resolves.toMatchObject({
      family: "Acme Sans",
      weight: 450
    });
  });

  it("treats a non-zero italic angle as italic", async () => {
    const path = await writeFixture(
      "Acme-LightItalic.ttf",
      buildSfnt({ family: "Acme Sans", weight: 300, italicAngle: -11.31 })
    );

    await expect(readSfntMetadata(path)).resolves.toMatchObject({
      style: "italic"
    });
  });

  it("reports a variable weight axis as a range", async () => {
    const path = await writeFixture(
      "Acme-VF.ttf",
      buildSfnt({ family: "Acme Sans", weight: 100, wght: [100, 700] })
    );

    await expect(readSfntMetadata(path)).resolves.toMatchObject({
      weight: "100 700"
    });
  });

  it("returns undefined for non-sfnt containers", async () => {
    const path = await writeFixture("Acme-Regular.woff2", "wOF2");

    await expect(readSfntMetadata(path)).resolves.toBeUndefined();
  });
});
