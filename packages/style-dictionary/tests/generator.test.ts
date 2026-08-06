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
import { generateStyleDictionary } from "../src/generate";
import styleDictionary from "../src/index";

const tokens = {
  color: {
    $type: "color",
    primary: {
      $value: "#0066cc",
      $description: "Brand primary"
    }
  },
  spacing: {
    $type: "dimension",
    sm: { $value: { value: 8, unit: "px" } }
  }
} satisfies Schema["tokens"];

const spec = {
  components: {},
  icons: {},
  tokens
} as Schema;

describe("style-dictionary plugin", () => {
  it("is a Razorwind Plugin", () => {
    const plugin = styleDictionary({});
    expect(plugin.name).toBe("style-dictionary");
    expect(typeof plugin.generate).toBe("function");
  });

  it("returns empty documents when platforms is omitted", async () => {
    const plugin = styleDictionary({});
    const documents = await plugin.generate!(spec, { cwd: process.cwd() } as never);
    expect(documents).toEqual({});
  });

  it("formats tokens for configured platforms", async () => {
    const plugin = styleDictionary({
      platforms: {
        css: {
          transformGroup: "css",
          buildPath: "build/css/",
          files: [
            {
              destination: "variables.css",
              format: "css/variables"
            }
          ]
        }
      }
    });

    const documents = await plugin.generate!(spec, {
      cwd: process.cwd()
    } as never);

    expect(Object.keys(documents)).toEqual(
      expect.arrayContaining(["build/css/variables.css"])
    );

    const css = documents["build/css/variables.css"]?.chunks?.[0]?.content;
    expect(css).toContain("--color-primary");
    expect(css).toContain("#0066cc");
  });

  it("generateStyleDictionary mirrors the plugin generate output", async () => {
    const documents = await generateStyleDictionary(spec, {
      platforms: {
        scss: {
          transformGroup: "scss",
          buildPath: "build/scss/",
          files: [
            {
              destination: "_variables.scss",
              format: "scss/variables"
            }
          ]
        }
      }
    });

    expect(
      documents["build/scss/_variables.scss"]?.chunks?.[0]?.content
    ).toContain("$color-primary");
  });
});
