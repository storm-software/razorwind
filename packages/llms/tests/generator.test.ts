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
import llms, {
  generateLlms,
  renderLlmsDocuments,
  renderLlmsIndex,
  renderTokensDocument
} from "../src";

const emptySpec = {
  name: "@acme/system",
  title: "Acme Design System",
  description: "Components and tokens for Acme products.",
  tokens: {},
  components: {},
  icons: {},
  fonts: {}
} satisfies Schema;

const resourceSpec = {
  ...emptySpec,
  homepage: "https://design.acme.test",
  repository: "https://github.com/acme/system"
} satisfies Schema;

const tokenSpec = {
  ...emptySpec,
  tokens: {
    light: {
      color: {
        $type: "color",
        primary: { $value: "#0066cc", $description: "Brand primary" },
        hidden: { $value: "#ff00ff", skipDocs: true }
      },
      spacing: {
        $type: "dimension",
        sm: { $value: { value: 8, unit: "px" } }
      }
    },
    dark: {
      color: {
        $type: "color",
        primary: {
          $value: "#66aaff",
          $description: "Brand primary | dark"
        }
      }
    }
  }
} as unknown as Schema;

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

describe("renderLlmsIndex", () => {
  it("renders the standard index structure with relative companion links", () => {
    expect(
      renderLlmsIndex(resourceSpec, {
        details: "Follow Acme accessibility guidance."
      })
    ).toBe(`# Acme Design System

> Components and tokens for Acme products.

Follow Acme accessibility guidance.

## Design System Reference

- [Design Tokens](llms-tokens.txt): Approved design tokens, values, themes, and usage descriptions.
- [Components](llms-components.txt): Available components, dependencies, files, and usage examples.
- [Icons](llms-icons.txt): Available icon names, aliases, metadata, and asset variants.
- [Fonts](llms-fonts.txt): Approved font families, roles, sources, weights, and files.

## Project Resources

- [Homepage](https://design.acme.test): Design system website.
- [Repository](https://github.com/acme/system): Source repository.
`);
  });

  it("resolves companion links against a normalized absolute baseUrl", () => {
    const content = renderLlmsIndex(emptySpec, {
      baseUrl: "https://design.acme.test/docs"
    });

    expect(content).toContain(
      "[Design Tokens](https://design.acme.test/docs/llms-tokens.txt)"
    );
    expect(content).toContain(
      "[Fonts](https://design.acme.test/docs/llms-fonts.txt)"
    );
  });

  it("omits absent summaries and project resources", () => {
    const content = renderLlmsIndex({
      ...emptySpec,
      description: undefined
    });

    expect(content).not.toContain(">");
    expect(content).not.toContain("## Project Resources");
  });

  it("ignores malformed optional schema resource URLs", () => {
    const content = renderLlmsIndex({
      ...resourceSpec,
      homepage: "/design-system",
      repository: "not a URL"
    });

    expect(content).not.toContain("## Project Resources");
  });

  it("rejects invalid explicit index options", () => {
    expect(() => renderLlmsIndex(emptySpec, { title: "   " })).toThrow(
      /title.*empty/i
    );
    expect(() => renderLlmsIndex(emptySpec, { baseUrl: "/docs" })).toThrow(
      /baseUrl.*absolute HTTP/i
    );
    expect(() =>
      renderLlmsIndex(emptySpec, { baseUrl: "ftp://acme.test" })
    ).toThrow(/baseUrl.*HTTP/i);
    expect(() =>
      renderLlmsIndex(emptySpec, { details: "## Override" })
    ).toThrow(/details.*H1 or H2/i);
  });
});

describe("renderTokensDocument", () => {
  it("groups formatted tokens by sorted theme and token group", () => {
    const content = renderTokensDocument(tokenSpec);
    const dark = content.indexOf("## Dark");
    const light = content.indexOf("## Light");

    expect(dark).toBeGreaterThan(0);
    expect(light).toBeGreaterThan(dark);
    expect(content).toContain("### Color");
    expect(content).toContain("### Spacing");
    expect(content).toContain(
      "| `color.primary` | `color` | `#0066cc` | Brand primary |"
    );
    expect(content).toContain(
      "| `color.primary` | `color` | `#66aaff` | Brand primary \\| dark |"
    );
    expect(content).toContain("| `spacing.sm` | `dimension` | `8px` |  |"
    );
    expect(content).not.toContain("hidden");
  });

  it("renders an explicit empty state", () => {
    expect(renderTokensDocument(emptySpec)).toContain(
      "No documented tokens were found."
    );
  });

  it("is deterministic and does not mutate the schema", () => {
    const before = JSON.stringify(tokenSpec.tokens);
    const first = renderTokensDocument(tokenSpec);

    expect(renderTokensDocument(tokenSpec)).toBe(first);
    expect(JSON.stringify(tokenSpec.tokens)).toBe(before);
  });
});
