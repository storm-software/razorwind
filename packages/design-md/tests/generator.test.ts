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
import extract from "../src/extract";
import {
  extractDesignMd,
  generateDesignMd,
  renderDesignMd
} from "../src/generate";
import { flattenTokens } from "../src/lib/flatten";
import { toTokenName, toYamlScalar } from "../src/lib/format";
import generate from "../src/generate";

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
  icons: {}, fonts: {},
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

    expect(content.startsWith("---\n")).toBe(true);
    expect(content).toContain('primary: "#0066cc"');
    expect(content).toContain('backgroundColor: "{colors.primary}"');
    expect(content).toContain("fontSize: 1rem");

    const sections = [
      "## Overview",
      "## Colors",
      "## Typography",
      "## Layout",
      "## Shapes",
      "## Components"
    ];
    const positions = sections.map(heading => content.indexOf(heading));
    expect(positions.every(position => position > 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
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
