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
import {
  designMdToTokens,
  extractDesignMdFrontMatter,
  isDesignMdFile,
  loadDesignMdTokens,
  parseDesignMdTokens,
  resolveDesignMdPath
} from "../src/load";

const DESIGN_MD = `---
name: Heritage
version: alpha
colors:
  primary: "#1A1C1E"
  secondary: "#6C7278"
  tertiary: "#B8422E"
typography:
  heading:
    fontFamily: Inter
    fontSize: 2rem
    fontWeight: 600
    lineHeight: 1.2
  body:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: 400
rounded:
  sm: 4
  md: 8px
spacing:
  sm: 8
  md: 16
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.sm}"
    padding: "{spacing.sm}"
---

# Heritage

Design system for testing.
`;

async function makeTempDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), "razorwind-design-md-"));
}

describe("extractDesignMdFrontMatter", () => {
  it("parses YAML front matter", () => {
    const frontMatter = extractDesignMdFrontMatter(DESIGN_MD);
    expect(frontMatter).toMatchObject({
      name: "Heritage",
      version: "alpha"
    });
    expect(frontMatter?.colors).toBeDefined();
  });

  it("returns undefined when front matter is missing", () => {
    expect(extractDesignMdFrontMatter("# No front matter")).toBeUndefined();
  });
});

describe("designMdToTokens / parseDesignMdTokens", () => {
  it("maps DESIGN.md sections into DTCG token groups", () => {
    const tokens = parseDesignMdTokens(DESIGN_MD) as Record<string, any>;

    expect(tokens.colors.primary).toMatchObject({
      $type: "color",
      $value: expect.anything()
    });
    expect(tokens.typography.heading.$type).toBe("typography");
    expect(tokens.rounded.sm.$type).toBe("dimension");
    expect(tokens.spacing.md.$value).toMatchObject({ value: 16, unit: "px" });
    expect(tokens.components["button-primary"].backgroundColor.$value).toBe(
      "{colors.primary}"
    );
  });

  it("returns an empty object when front matter is absent", () => {
    expect(designMdToTokens({})).toEqual({});
    expect(parseDesignMdTokens("# hello")).toEqual({});
  });
});

describe("isDesignMdFile / resolveDesignMdPath", () => {
  it("detects DESIGN.md basenames", () => {
    expect(isDesignMdFile("/workspace/DESIGN.md")).toBe(true);
    expect(isDesignMdFile("design.md")).toBe(true);
    expect(isDesignMdFile("/workspace/README.md")).toBe(false);
    expect(isDesignMdFile("/workspace/redesign.md")).toBe(false);
  });
});

describe("loadDesignMdTokens", () => {
  it("loads tokens from a workspace DESIGN.md", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "DESIGN.md"), DESIGN_MD);

    expect(resolveDesignMdPath(dir)).toBe(join(dir, "DESIGN.md"));

    const tokens = (await loadDesignMdTokens(dir)) as Record<string, any>;
    expect(tokens?.colors.primary.$type).toBe("color");
  });

  it("returns undefined when no DESIGN.md exists", async () => {
    const dir = await makeTempDir();
    expect(await loadDesignMdTokens(dir)).toBeUndefined();
  });
});
