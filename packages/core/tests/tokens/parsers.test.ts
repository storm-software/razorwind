/* -------------------------------------------------------------------

                       🗲 Storm Software - Windie

 This code was released as part of the Windie project. Windie
 is maintained by Storm Software under the Apache-2.0 license, and is
 free for commercial and private use. For more information, please visit
 our licensing page at https://stormsoftware.com/licenses/projects/windie.

 Website:                  https://stormsoftware.com
 Repository:               https://github.com/storm-software/windie
 Documentation:            https://docs.stormsoftware.com/projects/windie
 Contact:                  https://stormsoftware.com/contact

 SPDX-License-Identifier:  Apache-2.0

 ------------------------------------------------------------------- */

import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { parseCssCustomProperties } from "../../src/tokens/css";
import { inferValue, normalizeTokenTree } from "../../src/tokens/infer";
import { loadTokens } from "../../src/tokens/load";
import { windieParsers } from "../../src/tokens/parsers";
import { resolveTokensSource } from "../../src/tokens/resolve-path";

const tempDirs: string[] = [];

afterEach(async () => {
  // Best-effort cleanup is unnecessary for tmp; keep list for debugging.
  tempDirs.length = 0;
});

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "windie-tokens-"));
  tempDirs.push(dir);
  return dir;
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

describe("windieParsers", () => {
  it("registers json, yaml, toml, and css parsers", () => {
    expect(windieParsers.map(parser => parser.name)).toEqual([
      "windie-json",
      "windie-yaml",
      "windie-toml",
      "windie-css"
    ]);
  });

  it("parses yaml through the windie-yaml parser", async () => {
    const yamlParser = windieParsers.find(
      parser => parser.name === "windie-yaml"
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

    const tokens = await loadTokens({ cwd: dir, tokensPath: file });
    expect(tokens).toMatchObject({
      color: {
        accent: {
          $type: "color",
          $value: { hex: "#abcdef" }
        }
      }
    });
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

    const tokens = await loadTokens({ cwd: dir });
    expect(tokens).toMatchObject({
      spacing: {
        md: {
          $type: "dimension",
          $value: { value: 1, unit: "rem" }
        }
      }
    });
  });

  it("falls back to CSS custom properties", async () => {
    const dir = await makeTempDir();
    const cssPath = join(dir, "globals.css");
    await writeFile(
      cssPath,
      `:root { --color-bg: oklch(0.5 0.1 200); }`,
      "utf8"
    );

    const tokens = await loadTokens({
      cwd: dir,
      fallbackPaths: [cssPath]
    });

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

    const tokens = await loadTokens({ cwd: dir, tokensPath: tokensDir });
    expect(tokens).toMatchObject({
      color: {
        brand: {
          $type: "color",
          $value: { hex: "#010203" }
        }
      }
    });
  });
});
