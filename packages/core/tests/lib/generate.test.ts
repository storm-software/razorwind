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

import { describe, expect, it } from "vitest";
import {
  generateAllPluginDocuments,
  generatePluginDocuments,
  themesForGeneration
} from "../../src/lib/generate";
import type { Schema } from "../../src/schema";
import type { Config } from "../../src/types/config";
import type { Plugin } from "../../src/types/plugin";

const lightTokens = {
  color: { fg: { $type: "color" as const, $value: "#111111" } }
};
const darkTokens = {
  color: { fg: { $type: "color" as const, $value: "#eeeeee" } }
};
const baseTokens = {
  color: { transparent: { $type: "color" as const, $value: "#FFFFFF00" } }
};

function testSpec(tokens: Schema["tokens"], title = "My Theme"): Schema {
  return {
    title,
    tokens,
    components: {},
    icons: {},
    fonts: {}
  };
}

function testConfig(plugins: Plugin[], title = "My Theme"): Config {
  return {
    cwd: "/tmp",
    title,
    plugins,
    componentsPath: "components",
    iconsPath: "assets/icons",
    fontsPath: "assets/fonts",
    envPaths: { home: "/tmp" }
  } as Config;
}

describe("themesForGeneration", () => {
  it("returns nothing for a single token tree", () => {
    expect(themesForGeneration(lightTokens)).toEqual([]);
  });

  it("returns light and dark and skips shared base", () => {
    const themes = themesForGeneration({
      base: baseTokens,
      light: lightTokens,
      dark: darkTokens
    });

    expect(themes.map(theme => theme.id).sort()).toEqual(["dark", "light"]);
  });
});

describe("generatePluginDocuments", () => {
  it("invokes generate once for a single token tree", async () => {
    const specs: Schema[] = [];
    const plugin: Plugin = {
      name: "css",
      generate: spec => {
        specs.push(spec);
        return {
          "tokens.css": {
            path: "tokens.css",
            chunks: [{ content: spec.title ?? "" }]
          }
        };
      }
    };

    const documents = await generatePluginDocuments(
      testSpec(lightTokens),
      testConfig([plugin])
    );

    expect(specs).toHaveLength(1);
    expect(Object.keys(documents)).toEqual(["tokens.css"]);
    expect(documents["tokens.css"]?.path).toBe("tokens.css");
  });

  it("invokes generate per theme with suffixed paths and titles", async () => {
    const specs: Schema[] = [];
    const titles: Array<string | undefined> = [];
    const plugin: Plugin = {
      name: "css",
      generate: (spec, config) => {
        specs.push(spec);
        titles.push(config.title);
        return {
          "tokens.css": {
            path: "tokens.css",
            chunks: [{ content: spec.title ?? "" }]
          }
        };
      }
    };

    const documents = await generatePluginDocuments(
      testSpec({
        base: baseTokens,
        light: lightTokens,
        dark: darkTokens
      }),
      testConfig([plugin])
    );

    expect(specs.map(spec => spec.theme).sort()).toEqual(["dark", "light"]);
    expect(specs.map(spec => spec.title).sort()).toEqual([
      "My Theme (Dark)",
      "My Theme (Light)"
    ]);
    expect(titles.sort()).toEqual(["My Theme (Dark)", "My Theme (Light)"]);

    expect(Object.keys(documents).sort()).toEqual([
      "tokens-dark.css",
      "tokens-light.css"
    ]);
    expect(documents["tokens-dark.css"]?.path).toBe("tokens-dark.css");
    expect(documents["tokens-light.css"]?.path).toBe("tokens-light.css");
  });

  it("merges shared base tokens into each theme pass", async () => {
    const tokenTrees: Schema["tokens"][] = [];
    const plugin: Plugin = {
      name: "css",
      generate: spec => {
        tokenTrees.push(spec.tokens);
        return {};
      }
    };

    await generatePluginDocuments(
      testSpec({
        base: baseTokens,
        light: lightTokens,
        dark: darkTokens
      }),
      testConfig([plugin])
    );

    expect(tokenTrees).toHaveLength(2);
    for (const tokens of tokenTrees) {
      expect(tokens).toMatchObject({
        color: {
          fg: { $type: "color" },
          transparent: { $type: "color" }
        }
      });
    }
  });

  it("does not concatenate inferred color components when merging base into themes", async () => {
    const transparent = {
      $type: "color" as const,
      $value: {
        colorSpace: "srgb" as const,
        components: [1, 1, 1],
        alpha: 0,
        hex: "#ffffff"
      }
    };
    const tokenTrees: Schema["tokens"][] = [];
    const plugin: Plugin = {
      name: "css",
      generate: spec => {
        tokenTrees.push(spec.tokens);
        return {};
      }
    };

    await generatePluginDocuments(
      testSpec({
        base: { color: { transparent } },
        light: {
          color: {
            transparent,
            fg: { $type: "color" as const, $value: "#111111" }
          }
        },
        dark: {
          color: {
            transparent,
            fg: { $type: "color" as const, $value: "#eeeeee" }
          }
        }
      }),
      testConfig([plugin])
    );

    expect(tokenTrees).toHaveLength(2);
    for (const tokens of tokenTrees) {
      const value = (
        tokens as {
          color: { transparent: { $value: { components: number[] } } };
        }
      ).color.transparent.$value;
      expect(value.components).toEqual([1, 1, 1]);
    }
  });

  it("runs array configs as independent generate passes", async () => {
    const names: string[] = [];
    const darkPlugin: Plugin = {
      name: "css",
      generate: spec => {
        names.push(spec.name ?? "");
        return {
          "dark.css": {
            path: "generated/dark/styles.css",
            chunks: [{ content: spec.name ?? "" }]
          }
        };
      }
    };
    const lightPlugin: Plugin = {
      name: "css",
      generate: spec => {
        names.push(spec.name ?? "");
        return {
          "light.css": {
            path: "generated/light/styles.css",
            chunks: [{ content: spec.name ?? "" }]
          }
        };
      }
    };

    const documents = await generateAllPluginDocuments([
      {
        spec: { ...testSpec(darkTokens), name: "razorwind-multi-themed-dark" },
        config: testConfig([darkPlugin], "Dark")
      },
      {
        spec: { ...testSpec(lightTokens), name: "razorwind-multi-themed-light" },
        config: testConfig([lightPlugin], "Light")
      }
    ]);

    expect(names).toEqual([
      "razorwind-multi-themed-dark",
      "razorwind-multi-themed-light"
    ]);
    expect(Object.keys(documents).sort()).toEqual(["dark.css", "light.css"]);
    expect(documents["dark.css"]?.path).toBe("generated/dark/styles.css");
    expect(documents["light.css"]?.path).toBe("generated/light/styles.css");
  });
});
