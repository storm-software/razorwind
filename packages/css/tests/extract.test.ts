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
import { describe, expect, it } from "vitest";
import extract, {
  extractCssTokens,
  parseCssTokens,
  resolveCssPath
} from "../src/extract";

async function makeCssFixture(
  css: string,
  file = "src/styles.css"
): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "razorwind-css-"));
  await mkdir(join(dir, "src"), { recursive: true });
  await writeFile(join(dir, file), css, "utf8");
  return dir;
}

describe("parseCssTokens", () => {
  it("nests dashed custom properties into a token tree", () => {
    const tokens = parseCssTokens(`
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

  it("parses Tailwind v4 @theme custom properties the same way", () => {
    const tokens = parseCssTokens(`
@theme {
  --color-primary: #0066cc;
  --radius-lg: 12px;
}
`);

    expect(tokens).toMatchObject({
      color: {
        primary: expect.objectContaining({ $type: "color" })
      },
      radius: {
        lg: expect.objectContaining({ $type: "dimension" })
      }
    });
  });
});

describe("resolveCssPath", () => {
  it("resolves an explicit cssPath when the file exists", async () => {
    const dir = await makeCssFixture(
      `:root { --color-primary: #0066cc; }`,
      "src/app.css"
    );

    expect(resolveCssPath(dir, "src/app.css")).toBe(join(dir, "src/app.css"));
  });

  it("falls back to common CSS entry candidates", async () => {
    const dir = await makeCssFixture(`:root { --color-bg: #111; }`);

    expect(resolveCssPath(dir)).toBe(join(dir, "src/styles.css"));
  });

  it("returns null when no CSS entry exists", async () => {
    const dir = await mkdtemp(join(tmpdir(), "razorwind-css-empty-"));
    expect(resolveCssPath(dir)).toBeNull();
  });
});

describe("extractCssTokens", () => {
  it("extracts tokens from a provided CSS file", async () => {
    const dir = await makeCssFixture(`
:root {
  --color-primary: #0066cc;
  --spacing-sm: 0.5rem;
}
`);

    const tokens = await extractCssTokens({
      cwd: dir,
      cssPath: "src/styles.css"
    });

    expect(tokens).toMatchObject({
      color: {
        primary: expect.anything()
      },
      spacing: {
        sm: expect.anything()
      }
    });
  });

  it("returns undefined when the CSS file is missing", async () => {
    const dir = await mkdtemp(join(tmpdir(), "razorwind-css-missing-"));

    const tokens = await extractCssTokens({
      cwd: dir,
      cssPath: "src/styles.css"
    });

    expect(tokens).toBeUndefined();
  });
});

describe("css extract plugin", () => {
  it("is a Razorwind Plugin", () => {
    const plugin = extract({});
    expect(plugin.name).toBe("css:extract");
    expect(typeof plugin.extract).toBe("function");
    expect(plugin.parsers?.[0]?.pattern).toEqual(/\.css$/i);
  });

  it("leaves existing tokens untouched", async () => {
    const plugin = extract({});
    const existing = {
      color: { primary: { $type: "color", $value: "#000" } }
    };

    const result = await plugin.extract!(
      { tokens: existing, components: {}, icons: {}, fonts: {} },
      {
        cwd: process.cwd(),
        registryPath: process.cwd(),
        plugins: [plugin],
        envPaths: {
          data: "",
          config: "",
          cache: "",
          log: "",
          temp: "",
          home: ""
        }
      } as never
    );

    expect(result.tokens).toBe(existing);
  });

  it("merges Google Fonts imports into spec.fonts", async () => {
    const dir = await makeCssFixture(`
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap");

:root {
  --color-primary: #0066cc;
}
`);
    const plugin = extract({ cssPath: "src/styles.css" });
    const result = await plugin.extract!(
      { tokens: {}, components: {}, icons: {}, fonts: {} },
      {
        cwd: dir,
        plugins: [plugin],
        envPaths: {
          data: "",
          config: "",
          cache: "",
          log: "",
          temp: "",
          home: ""
        }
      } as never
    );

    expect(result.fonts?.inter).toMatchObject({
      source: "google",
      family: "Inter",
      weights: [400, 700]
    });
  });

  it("parses CSS contents through the css parser hook", () => {
    const plugin = extract({});
    const parser = plugin.parsers?.[0];
    expect(parser).toBeDefined();

    const tokens = parser!.parser(`:root { --color-accent: #ff6600; }`);
    expect(tokens).toMatchObject({
      color: {
        accent: {
          $type: "color",
          $value: { hex: "#ff6600" }
        }
      }
    });
  });
});
