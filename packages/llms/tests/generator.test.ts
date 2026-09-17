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

import type { Schema } from "@razorwind/core/schema";
import { describe, expect, it } from "vitest";
import llms, { generateLlms, renderLlmsDocuments } from "../src";

const emptySpec = {
  name: "@acme/system",
  title: "Acme Design System",
  description: "Components and tokens for Acme products.",
  tokens: {},
  components: {},
  icons: {},
  fonts: {}
} satisfies Schema;

describe("llms plugin", () => {
  it("exposes a Razorwind generate plugin", () => {
    const plugin = llms();
    expect(plugin.name).toBe("llms:generate");
    expect(typeof plugin.generate).toBe("function");
  });

  it("always creates the index and all companion files", async () => {
    const documents = generateLlms(emptySpec);
    expect(Object.keys(documents)).toEqual([
      "llms.txt",
      "llms-tokens.txt",
      "llms-components.txt",
      "llms-icons.txt",
      "llms-fonts.txt"
    ]);
    expect(renderLlmsDocuments(emptySpec)).toEqual({
      index: expect.any(String),
      tokens: expect.any(String),
      components: expect.any(String),
      icons: expect.any(String),
      fonts: expect.any(String)
    });

    const pluginDocuments = await llms().generate!(emptySpec, {} as never);
    expect(Object.keys(pluginDocuments)).toEqual(Object.keys(documents));
  });

  it("places all five files under outputPath", () => {
    expect(
      Object.keys(generateLlms(emptySpec, { outputPath: "public" }))
    ).toEqual([
      "public/llms.txt",
      "public/llms-tokens.txt",
      "public/llms-components.txt",
      "public/llms-icons.txt",
      "public/llms-fonts.txt"
    ]);
  });
});
