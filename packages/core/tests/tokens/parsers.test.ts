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
import type StyleDictionary from "style-dictionary";
import type { PreprocessedTokens } from "style-dictionary/types";
import { afterEach, describe, expect, it } from "vitest";
import type { Config } from "../../src/types/config";
import { parseCssCustomProperties } from "../../src/lib/tokens/css";
import { inferValue, normalizeTokenTree } from "../../src/lib/tokens/infer";
import { loadTokens } from "../../src/lib/tokens/load";
import {
  getExtractionHooks,
  registerRazorwindHooks,
  TOKEN_PARSERS,
  type StyleDictionaryRegisterTarget
} from "../../src/lib/tokens/parsers";
import { resolveTokensSource } from "../../src/lib/tokens/resolve-path";

const tempDirs: string[] = [];

afterEach(async () => {
  // Best-effort cleanup is unnecessary for tmp; keep list for debugging.
  tempDirs.length = 0;
});

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "razorwind-tokens-"));
  tempDirs.push(dir);
  return dir;
}

function testConfig(cwd: string): Config {
  return {
    cwd,
    componentsPath: cwd,
    iconsPath: cwd,
    fontsPath: cwd,
    plugins: [],
    envPaths: {
      data: "",
      config: "",
      cache: "",
      log: "",
      temp: "",
      home: ""
    }
  };
}

function testContext(cwd: string, overrides: Partial<Config> = {}) {
  return {
    cwd,
    options: {
      ...testConfig(cwd),
      ...overrides
    }
  } as Parameters<typeof loadTokens>[0] & { sd?: StyleDictionary };
}

describe("inferValue", () => {
  it("converts hex colors to DTCG color objects", () => {
    const result = inferValue("#06c", ["color", "primary"]);
    expect(result.type).toBe("color");
    expect(result.value).toMatchObject({
      colorSpace: "srgb",
      hex: "#0066cc"
    });
  });

  it("converts dimension strings with px/rem", () => {
    expect(inferValue("16px")).toEqual({
      value: { value: 16, unit: "px" },
      type: "dimension"
    });
    expect(inferValue("0.5rem", ["spacing"])).toEqual({
      value: { value: 0.5, unit: "rem" },
      type: "dimension"
    });
  });

  it("converts CSS var() to curly references", () => {
    expect(inferValue("var(--color-primary)")).toEqual({
      value: "{color.primary}",
      type: undefined
    });
  });

  it("normalizes legacy Style Dictionary keys", () => {
    const result = normalizeTokenTree({
      color: {
        primary: {
          value: "#ff0000",
          type: "color",
          comment: "brand"
        }
      }
    });

    expect(result).toMatchObject({
      color: {
        $type: "color",
        primary: {
          $value: {
            colorSpace: "srgb",
            hex: "#ff0000"
          },
          $type: "color",
          $description: "brand"
        }
      }
    });
  });
});

describe("parseCssCustomProperties", () => {
  it("nests dashed custom properties into a token tree", () => {
    const tokens = parseCssCustomProperties(`
      :root {
        --color-primary: #0066cc;
        --spacing-sm: 0.5rem;
      }
    `);

    expect(tokens).toMatchObject({
      color: {
        primary: {
          $type: "color",
          $value: { hex: "#0066cc" }
        }
      },
      spacing: {
        sm: {
          $type: "dimension",
          $value: { value: 0.5, unit: "rem" }
        }
      }
    });
  });
});

describe("razorwindParsers", () => {
  it("registers json, yaml, toml, and css parsers", () => {
    expect(TOKEN_PARSERS.map(parser => parser.name)).toEqual([
      "razorwind-json",
      "razorwind-yaml",
      "razorwind-toml",
      "razorwind-css"
    ]);
  });

  it("parses yaml through the razorwind-yaml parser", async () => {
    const yamlParser = TOKEN_PARSERS.find(
      parser => parser.name === "razorwind-yaml"
    );
    expect(yamlParser).toBeDefined();

    const result = await yamlParser!.parser({
      contents: `
color:
  primary:
    value: "#112233"
`,
      filePath: "tokens.yaml"
    });

    expect(result).toMatchObject({
      color: {
        primary: {
          $type: "color",
          $value: { hex: "#112233" }
        }
      }
    });
  });
});

describe("getExtractionHooks", () => {
  it("includes built-in parsers and plugin parser names", () => {
    const hooks = getExtractionHooks([
      {
        name: "custom",
        parsers: [
          {
            name: "custom-foo",
            pattern: /\.foo$/i,
            parser: (contents: string) => JSON.parse(contents)
          }
        ],
        preprocessors: [
          (dictionary: PreprocessedTokens) => dictionary
        ]
      }
    ]);

    expect(hooks.parserNames).toEqual([
      "razorwind-json",
      "razorwind-yaml",
      "razorwind-toml",
      "razorwind-css",
      "custom-foo"
    ]);
    expect(hooks.parsers["custom-foo"]).toBeDefined();
    expect(hooks.preprocessorNames).toEqual([
      "razorwind-infer",
      "custom-preprocessor-0"
    ]);
  });
});

describe("registerRazorwindHooks", () => {
  it("does not throw when the target has no registerParser", () => {
    expect(() =>
      registerRazorwindHooks([], {} as StyleDictionaryRegisterTarget)
    ).not.toThrow();
    expect(() =>
      registerRazorwindHooks([], { default: class {} } as never)
    ).not.toThrow();
  });

  it("registers parsers when registerParser is present", () => {
    const registered: string[] = [];
    registerRazorwindHooks([], {
      registerParser: parser => {
        registered.push(parser.name);
      },
      registerPreprocessor: () => undefined
    });

    expect(registered).toEqual([
      "razorwind-json",
      "razorwind-yaml",
      "razorwind-toml",
      "razorwind-css"
    ]);
  });
});

describe("resolveTokensSource + loadTokens", () => {
  it("resolves explicit tokensPath file", async () => {
    const dir = await makeTempDir();
    const file = join(dir, "brand.json");
    await writeFile(
      file,
      JSON.stringify({
        color: { accent: { value: "#abcdef" } }
      }),
      "utf8"
    );

    const resolved = resolveTokensSource({ cwd: dir, tokensPath: file });
    expect(resolved.origin).toBe("tokensPath");
    expect(resolved.source).toEqual([file]);

    const tokens = await loadTokens(testContext(dir, { tokensPath: file }));
    expect(tokens).toMatchObject({
      color: {
        accent: {
          $type: "color",
          $value: { hex: "#abcdef" }
        }
      }
    });
  });

  it("loads yaml tokens through Style Dictionary", async () => {
    const dir = await makeTempDir();
    const file = join(dir, "tokens.yaml");
    await writeFile(
      file,
      `
color:
  accent:
    value: "#abcdef"
`,
      "utf8"
    );

    const tokens = await loadTokens(testContext(dir, { tokensPath: file }));
    expect(tokens).toMatchObject({
      color: {
        accent: {
          $type: "color",
          $value: { hex: "#abcdef" }
        }
      }
    });
  });

  it("merges multiple tokensPath entries", async () => {
    const dir = await makeTempDir();
    const brand = join(dir, "brand.json");
    const spacing = join(dir, "spacing.json");
    await writeFile(
      brand,
      JSON.stringify({
        color: { accent: { value: "#abcdef" } }
      }),
      "utf8"
    );
    await writeFile(
      spacing,
      JSON.stringify({
        spacing: { md: { value: "1rem" } }
      }),
      "utf8"
    );

    const resolved = resolveTokensSource({
      cwd: dir,
      tokensPath: [brand, spacing]
    });
    expect(resolved.origin).toBe("tokensPath");
    expect(resolved.source).toEqual([brand, spacing]);
    expect(resolved.resolvedPath).toBe(brand);
  });

  it("falls back to tokens.json when tokensPath omitted", async () => {
    const dir = await makeTempDir();
    await writeFile(
      join(dir, "tokens.json"),
      JSON.stringify({
        spacing: { md: { value: "1rem" } }
      }),
      "utf8"
    );

    const resolved = resolveTokensSource({ cwd: dir });
    expect(resolved.origin).toBe("default");

    const tokens = await loadTokens(testContext(dir));
    expect(tokens).toMatchObject({
      spacing: {
        md: {
          $type: "dimension",
          $value: { value: 1, unit: "rem" }
        }
      }
    });
  });

  it("loads CSS custom properties through Style Dictionary", async () => {
    const dir = await makeTempDir();
    const cssPath = join(dir, "globals.css");
    await writeFile(
      cssPath,
      `:root { --color-bg: oklch(0.5 0.1 200); }`,
      "utf8"
    );

    const tokens = await loadTokens(testContext(dir, { tokensPath: cssPath }));

    expect(tokens).toMatchObject({
      color: {
        bg: {
          $type: "color",
          $value: { colorSpace: "oklch" }
        }
      }
    });
  });

  it("loads a tokens directory via Style Dictionary", async () => {
    const dir = await makeTempDir();
    const tokensDir = join(dir, "tokens");
    await mkdir(tokensDir);
    await writeFile(
      join(tokensDir, "color.json"),
      JSON.stringify({
        color: { brand: { value: "#010203" } }
      }),
      "utf8"
    );

    const tokens = await loadTokens(testContext(dir, { tokensPath: tokensDir }));
    expect(tokens).toMatchObject({
      color: {
        brand: {
          $type: "color",
          $value: { hex: "#010203" }
        }
      }
    });
  });

  it("resolves explicit tokensPath glob", async () => {
    const dir = await makeTempDir();
    const tokensDir = join(dir, "packages", "theme", "src", "tokens");
    await mkdir(tokensDir, { recursive: true });
    await writeFile(
      join(tokensDir, "light.tokens.json"),
      JSON.stringify({
        color: { primary: { value: "#111111" } }
      }),
      "utf8"
    );
    await writeFile(
      join(tokensDir, "dark.tokens.json"),
      JSON.stringify({
        color: { primary: { value: "#eeeeee" } }
      }),
      "utf8"
    );

    const globPath = "packages/theme/src/tokens/**/*.json";
    const resolved = resolveTokensSource({ cwd: dir, tokensPath: globPath });
    expect(resolved.origin).toBe("tokensPath");
    expect(resolved.source).toEqual([join(dir, globPath)]);

    const tokens = await loadTokens(testContext(dir, { tokensPath: globPath }));
    expect(tokens).toMatchObject({
      color: {
        primary: {
          $type: "color"
        }
      }
    });
  });

  it("applies Style Dictionary verbose logging when verbose is true", async () => {
    const dir = await makeTempDir();
    const tokensFile = join(dir, "tokens.json");
    await writeFile(
      tokensFile,
      JSON.stringify({
        color: { accent: { value: "#abcdef" } }
      }),
      "utf8"
    );
    const configPath = join(dir, "style-dictionary.config.mjs");
    await writeFile(
      configPath,
      `export default { source: ${JSON.stringify([tokensFile])}, platforms: {} };\n`,
      "utf8"
    );

    const context = testContext(dir, {
      tokensPath: configPath,
      verbose: true
    });
    const tokens = await loadTokens(context);

    expect(tokens).toMatchObject({
      color: {
        accent: {
          $type: "color"
        }
      }
    });
    expect(context.sd.log.verbosity).toBe("verbose");
  });

  it("keeps Style Dictionary default verbosity when verbose is omitted", async () => {
    const dir = await makeTempDir();
    const tokensFile = join(dir, "tokens.json");
    await writeFile(
      tokensFile,
      JSON.stringify({
        color: { accent: { value: "#abcdef" } }
      }),
      "utf8"
    );
    const configPath = join(dir, "style-dictionary.config.mjs");
    await writeFile(
      configPath,
      `export default { source: ${JSON.stringify([tokensFile])}, platforms: {} };\n`,
      "utf8"
    );

    const context = testContext(dir, { tokensPath: configPath });
    await loadTokens(context);

    expect(context.sd.log.verbosity).toBe("default");
  });
});
