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
  name: "Acme Design System",
  components: {},
  icons: {},
  fonts: {},
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
    const documents = await plugin.generate!(spec, {
      cwd: process.cwd()
    } as never);
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
      expect.arrayContaining([
        "build/css/variables.css",
        "build/css/INSTALL.md"
      ])
    );

    const css = documents["build/css/variables.css"]?.chunks?.[0]?.content;
    expect(css).toContain("--ads-color-primary");
    expect(css).toContain("#0066cc");
  });

  it("uses a custom prefix for CSS variable platforms", async () => {
    const documents = await generateStyleDictionary(spec, {
      prefix: "storm",
      platforms: {
        css: {
          transformGroup: "css",
          files: [
            {
              destination: "variables.css",
              format: "css/variables"
            }
          ]
        }
      }
    });

    const css = documents["variables.css"]?.chunks?.[0]?.content;
    expect(css).toContain("--storm-color-primary");
    expect(css).not.toContain("--ads-color-primary");
  });

  it("prefers a CSS platform prefix over the generator prefix", async () => {
    const documents = await generateStyleDictionary(spec, {
      prefix: "storm",
      platforms: {
        css: {
          prefix: "product",
          transformGroup: "css",
          files: [
            {
              destination: "variables.css",
              format: "css/variables"
            }
          ]
        }
      }
    });

    const css = documents["variables.css"]?.chunks?.[0]?.content;
    expect(css).toContain("--product-color-primary");
    expect(css).not.toContain("--storm-color-primary");
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
    expect(documents["build/scss/INSTALL.md"]).toBeDefined();
  });

  it("generateStyleDictionary still formats when verbose is true", async () => {
    const documents = await generateStyleDictionary(spec, {
      verbose: true,
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

    expect(
      documents["build/css/variables.css"]?.chunks?.[0]?.content
    ).toContain("--ads-color-primary");
  });

  it("formats inferred-style color objects and cubicBezier arrays", async () => {
    const documents = await generateStyleDictionary(
      {
        ...spec,
        tokens: {
          color: {
            transparent: {
              $type: "color",
              $value: {
                colorSpace: "srgb",
                components: [1, 1, 1],
                alpha: 0,
                hex: "#ffffff"
              }
            }
          },
          ease: {
            in: {
              $type: "cubicBezier",
              $value: [0.4, 0, 1, 1]
            }
          }
        }
      } as Schema,
      {
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
      }
    );

    const css = documents["build/css/variables.css"]?.chunks?.[0]?.content;
    expect(css).toContain("--ads-color-transparent");
    expect(css).toContain("--ads-ease-in");
  });

  it("formats $type size tokens as CSS dimensions", async () => {
    const documents = await generateStyleDictionary(
      {
        ...spec,
        tokens: {
          size: {
            none: { $type: "size", $value: "0px" },
            sm: { $type: "size", $value: "8px" },
            md: {
              $type: "size",
              $value: { value: 20, unit: "px" }
            }
          }
        }
      } as Schema,
      {
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
      }
    );

    const css = documents["build/css/variables.css"]?.chunks?.[0]?.content;
    expect(css).toContain("--ads-size-none: 0px;");
    expect(css).toContain("--ads-size-sm: 8px;");
    expect(css).toContain("--ads-size-md: 20px;");
    expect(css).not.toContain("[object Object]");
  });
});
