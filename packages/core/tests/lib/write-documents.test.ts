/* -------------------------------------------------------------------

                       🗲 Storm Software - Razorwind

 This code was released as part of the Razorwind project. Razorwind
 is maintained by Storm Software under the Apache-2.0 license, and is
 free for commercial and private use. For more information, please visit
 our licensing page at https://stormsoftware.com/licenses/projects/razorwind.

    10| Website:                  https://stormsoftware.com
 Repository:               https://github.com/storm-software/razorwind
 Documentation:            https://docs.stormsoftware.com/projects/razorwind
 Contact:                  https://stormsoftware.com/contact

 SPDX-License-Identifier:  Apache-2.0

 ------------------------------------------------------------------- */

import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { uniquePlugins } from "../../src/lib/resolve-config";
import { writeGeneratedDocuments } from "../../src/lib/write-documents";
import type { Plugin } from "../../src/types/plugin";

describe("uniquePlugins", () => {
  it("keeps the first plugin for each name", () => {
    const first: Plugin = { name: "css:generate" };
    const duplicate: Plugin = { name: "css:generate" };
    const other: Plugin = { name: "docgen:generate" };

    expect(uniquePlugins([first, other, duplicate])).toEqual([first, other]);
  });
});

describe("writeGeneratedDocuments", () => {
  it("writes chunk content to absolute and cwd-relative paths", async () => {
    const dir = await mkdtemp(join(tmpdir(), "razorwind-write-documents-"));
    const absolutePath = join(dir, "nested", "absolute.css");

    const written = await writeGeneratedDocuments(
      {
        "relative.md": {
          path: "relative.md",
          chunks: [{ content: "# relative\n" }]
        },
        [absolutePath]: {
          path: absolutePath,
          chunks: [{ content: ":root {}\n" }]
        }
      },
      dir
    );

    expect(written).toEqual([join(dir, "relative.md"), absolutePath]);
    expect(await readFile(join(dir, "relative.md"), "utf8")).toBe(
      "# relative\n"
    );
    expect(await readFile(absolutePath, "utf8")).toBe(":root {}\n");
  });
});
