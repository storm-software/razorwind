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
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import extract from "../src/extract";
import generate, {
  extractDesignMd,
  generateDesignMd,
  mergeDesignMd,
  renderDesignMd
} from "../src/generate";
import { flattenTokens } from "../src/lib/flatten";
import { toTokenName, toYamlScalar } from "../src/lib/format";

const tokens = {
  color: {
    $type: "color",
    primary: {
      $value: {
        colorSpace: "srgb",
        components: [0, 0.4, 0.8],
        hex: "#0066cc"
      },
      $description: "Brand primary"
    },
    secondary: {
      $value: "#663399"
    },
    accent: {
      $value: "{color.primary}"
    }
  },
  typography: {
    $type: "typography",
    "body-md": {
      $value: {
        fontFamily: ["Inter", "sans-serif"],
        fontSize: { value: 1, unit: "rem" },
        fontWeight: 400
      }
    }
  },
  radius: {
    $type: "dimension",
    sm: { $value: { value: 4, unit: "px" } },
    md: { $value: { value: 8, unit: "px" } }
  },
  spacing: {
    $type: "dimension",
    sm: { $value: { value: 8, unit: "px" } },
    md: { $value: { value: 16, unit: "px" } }
  },
  components: {
    "button-primary": {
      background: { $type: "color", $value: "{color.primary}" },
      text: { $type: "color", $value: "#ffffff" },
      radius: { $type: "dimension", $value: "{radius.sm}" },
      padding: { $type: "dimension", $value: { value: 12, unit: "px" } }
    }
  }
} satisfies Schema["tokens"];

const spec = {
  components: {},
  icons: {},
  fonts: {},
  tokens
} as Schema;

describe("format helpers", () => {
  it("strips group prefixes from token names", () => {
    expect(toTokenName("color.primary", ["color", "colors"])).toBe("primary");
    expect(toTokenName("color.on.primary", ["color"])).toBe("on-primary");
  });

  it("quotes YAML scalars only when required", () => {
    expect(toYamlScalar("primary")).toBe("primary");
    expect(toYamlScalar("#0066cc")).toBe('"#0066cc"');
    expect(toYamlScalar("{colors.primary}")).toBe('"{colors.primary}"');
    expect(toYamlScalar(4)).toBe("4");
  });
});

describe("extractDesignMd", () => {
  it("maps DTCG tokens into DESIGN.md sections", () => {
    const document = extractDesignMd(spec);

    expect(document.colors.primary).toBe("#0066cc");
    expect(document.colors.secondary).toBe("#663399");
    expect(document.colorDescriptions.primary).toBe("Brand primary");
    expect(document.typography["body-md"]).toEqual({
      fontFamily: "Inter, sans-serif",
      fontSize: "1rem",
      fontWeight: 400
    });
    expect(document.rounded).toEqual({ sm: "4px", md: "8px" });
    expect(document.spacing).toEqual({ sm: "8px", md: "16px" });
  });

  it("resolves color aliases to terminal values", () => {
    const document = extractDesignMd(spec);
    expect(document.colors.accent).toBe("#0066cc");
  });

  it("omits tokens marked skipDocs", () => {
    const document = extractDesignMd({
      ...spec,
      tokens: {
        color: {
          visible: { $type: "color", $value: "#0066cc" },
          hidden: { $type: "color", $value: "#663399", skipDocs: true }
        }
      }
    } as Schema);

    expect(document.colors).toEqual({ visible: "#0066cc" });
  });

  it("re-emits component aliases as DESIGN.md token references", () => {
    const document = extractDesignMd(spec);
    expect(document.components["button-primary"]).toEqual({
      backgroundColor: "{colors.primary}",
      textColor: "#ffffff",
      rounded: "{rounded.sm}",
      padding: "12px"
    });
  });

  it("omits palette and primitive color groups from colors", () => {
    const document = extractDesignMd({
      ...spec,
      tokens: {
        color: {
          $type: "color",
          primary: { $value: "#0066cc", $description: "Brand primary" },
          surface: {
            palette: true,
            1: { $value: "#ffffff" },
            2: { $value: "#f4f4f4" }
          },
          red: {
            primitive: true,
            1: { $value: "#ff0000" }
          },
          page: { $value: "{color.surface.1}" }
        }
      }
    } as Schema);

    expect(document.colors).toEqual({
      primary: "#0066cc",
      page: "#ffffff"
    });
    expect(document.colorDescriptions.primary).toBe("Brand primary");
    expect(document.colors["surface-1"]).toBeUndefined();
    expect(document.colors["surface-2"]).toBeUndefined();
    expect(document.colors["red-1"]).toBeUndefined();
  });
});

describe("renderDesignMd", () => {
  it("renders YAML front matter followed by canonical body sections", () => {
    const content = renderDesignMd(extractDesignMd(spec));
    const start = content.indexOf("<!-- razorwind configuration start -->");
    const end = content.indexOf("<!-- razorwind configuration end -->");

    expect(content.startsWith("---\n")).toBe(true);
    expect(content).toContain('primary: "#0066cc"');
    expect(content).toContain('backgroundColor: "{colors.primary}"');
    expect(content).toContain("fontSize: 1rem");
    expect(content.indexOf("version:")).toBeLessThan(start);

    const sections = [
      "## Overview",
      "## Colors",
      "## Typography",
      "## Layout",
      "## Shapes",
      "## Components"
    ];
    const positions = sections.map(heading => content.indexOf(heading));
    expect(positions.every(position => position > start)).toBe(true);
    expect(positions.every(position => position < end)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });
});

describe("mergeDesignMd", () => {
  const generated =
    generateDesignMd(spec, { name: "Heritage" })["DESIGN.md"]?.chunks?.[0]
      ?.content ?? "";

  it("replaces the managed block and keeps markdown outside the comments", () => {
    const existing = [
      "---",
      "name: Old",
      "version: alpha",
      "---",
      "",
      "# Custom title",
      "",
      "Intro stays.",
      "",
      "<!-- razorwind configuration start -->",
      "## Overview",
      "",
      "Old overview.",
      "<!-- razorwind configuration end -->",
      "",
      "## Notes",
      "",
      "Keep this."
    ].join("\n");
    const merged = mergeDesignMd(existing, generated);
    const start = merged.indexOf("<!-- razorwind configuration start -->");
    const end = merged.indexOf("<!-- razorwind configuration end -->");

    expect(merged).toContain("name: Heritage");
    expect(merged).not.toContain("name: Old");
    expect(merged.indexOf("# Custom title")).toBeLessThan(start);
    expect(merged.indexOf("Intro stays.")).toBeLessThan(start);
    expect(merged).not.toContain("Old overview.");
    expect(merged).toContain("**Primary (#0066cc):** Brand primary");
    expect(merged.indexOf("## Notes")).toBeGreaterThan(end);
    expect(merged).toContain("Keep this.");
    expect(merged.match(/razorwind configuration start/g)).toHaveLength(1);
  });

  it("keeps a title and custom sections when the file has no comments yet", () => {
    const existing = [
      "---",
      "name: Old",
      "---",
      "",
      "# Title",
      "",
      "Intro",
      "",
      "```md",
      "## Overview",
      "not a section",
      "```",
      "",
      "## Overview",
      "",
      "old overview",
      "",
      "## Field notes",
      "",
      "keep"
    ].join("\n");
    const once = mergeDesignMd(existing, generated);
    const twice = mergeDesignMd(once, generated);

    expect(twice).toBe(once);
    expect(once).toContain("# Title");
    expect(once).toContain("Intro");
    expect(once).toContain("not a section");
    expect(once).toContain("## Field notes");
    expect(once).toContain("keep");
    expect(once).not.toContain("old overview");
    expect(once.indexOf("# Title")).toBeLessThan(
      once.indexOf("<!-- razorwind configuration start -->")
    );
    expect(once.indexOf("## Field notes")).toBeGreaterThan(
      once.indexOf("<!-- razorwind configuration end -->")
    );
  });
});

describe("design-md plugins", () => {
  it("extract plugin is a Razorwind Plugin", () => {
    const plugin = extract({});
    expect(plugin.name).toBe("design-md:extract");
    expect(typeof plugin.extract).toBe("function");
    expect(plugin.parsers?.length).toBeGreaterThan(0);
  });

  it("generate plugin is a Razorwind Plugin", () => {
    const plugin = generate({});
    expect(plugin.name).toBe("design-md:generate");
    expect(typeof plugin.generate).toBe("function");
  });

  it("generates a DESIGN.md document from the schema", async () => {
    const plugin = generate({
      outputPath: "docs/DESIGN.md",
      name: "Heritage",
      overview: "Architectural minimalism."
    });
    const documents = await plugin.generate!(spec, {} as never);

    expect(Object.keys(documents)).toEqual([
      "docs/DESIGN.md",
      "docs/INSTALL.md"
    ]);

    const content = documents["docs/DESIGN.md"]?.chunks?.[0]?.content;
    expect(content).toContain("name: Heritage");
    expect(content).toContain("Architectural minimalism.");
    expect(content).toContain("**Primary (#0066cc):** Brand primary");
    expect(content).toContain("<!-- razorwind configuration start -->");
  });

  it("keeps DESIGN.md prose outside the razorwind comments", async () => {
    const dir = await mkdtemp(join(tmpdir(), "razorwind-design-md-"));
    const outputPath = join(dir, "DESIGN.md");
    await writeFile(
      outputPath,
      [
        "---",
        "name: Old",
        "version: alpha",
        "---",
        "",
        "# Custom title",
        "",
        "Intro stays.",
        "",
        "<!-- razorwind configuration start -->",
        "Old overview.",
        "<!-- razorwind configuration end -->",
        "",
        "## Notes",
        "",
        "Keep this.",
        ""
      ].join("\n")
    );

    const plugin = generate({ outputPath, name: "Heritage" });
    const documents = await plugin.generate!(spec, {} as never);
    const content = documents[outputPath]?.chunks?.[0]?.content ?? "";
    const start = content.indexOf("<!-- razorwind configuration start -->");
    const end = content.indexOf("<!-- razorwind configuration end -->");

    expect(content).toContain("name: Heritage");
    expect(content.indexOf("# Custom title")).toBeLessThan(start);
    expect(content).toContain("Intro stays.");
    expect(content).not.toContain("Old overview.");
    expect(content.indexOf("## Notes")).toBeGreaterThan(end);
    expect(content).toContain("Keep this.");
  });

  it("generateDesignMd mirrors the plugin generate output", () => {
    const documents = generateDesignMd(spec);
    expect(documents["DESIGN.md"]?.chunks?.[0]?.content).toContain("colors:");
    expect(documents["INSTALL.md"]).toBeDefined();
  });
});

describe("flattenTokens", () => {
  it("walks nested DTCG tokens", () => {
    const flat = flattenTokens(spec.tokens);
    expect(flat.map(token => token.path)).toEqual(
      expect.arrayContaining([
        "color.primary",
        "typography.body-md",
        "radius.sm",
        "spacing.md",
        "components.button-primary.background"
      ])
    );
  });

  it("marks palette and primitive ancestor groups", () => {
    const flat = flattenTokens({
      color: {
        $type: "color",
        primary: { $value: "#0066cc" },
        surface: {
          palette: true,
          1: { $value: "#ffffff" }
        },
        red: {
          primitive: true,
          1: { $value: "#ff0000" }
        }
      }
    });

    expect(flat.find(token => token.path === "color.primary")?.palette).toBe(
      undefined
    );
    expect(flat.find(token => token.path === "color.surface.1")?.palette).toBe(
      true
    );
    expect(flat.find(token => token.path === "color.red.1")?.primitive).toBe(
      true
    );
  });
});
