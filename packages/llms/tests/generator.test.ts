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
  renderComponentsDocument,
  renderIconsDocument,
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

const componentSpec = {
  ...emptySpec,
  components: {
    card: {
      name: "card",
      title: "Card",
      type: "component"
    },
    button: {
      name: "button",
      title: "Button",
      type: "ui",
      category: "actions",
      description: "Triggers an action.",
      tags: ["interactive", "action"],
      related: ["icon-button"],
      since: "1.0.0",
      version: "2.0.0",
      dependencies: { zeta: "^2.0.0", alpha: "^1.0.0" },
      devDependencies: { vitest: "^4.0.0" },
      registryDependencies: { icon: "*" },
      files: [
        { path: "src/button.tsx", type: "ui", target: "@ui/button.tsx" },
        { path: "src/button.css", type: "style" }
      ],
      usage: [
        {
          name: "markdown",
          title: "With markdown",
          description: "Renders Markdown content.",
          path: "usage/markdown.tsx",
          language: "tsx",
          content: 'const markdown = "```example```";'
        },
        {
          name: "metadata",
          title: "Metadata only",
          path: "usage/metadata.tsx",
          language: "tsx"
        }
      ]
    }
  }
} satisfies Schema;

const iconSpec = {
  ...emptySpec,
  icons: {
    settings: {
      name: "settings",
      title: "Settings",
      files: [{ path: "icons/settings.svg", type: "svg" }]
    },
    home: {
      name: "home",
      title: "Home",
      category: "navigation",
      description: "Navigate to the home screen.",
      tags: ["house", "navigation"],
      aliases: ["house"],
      related: ["dashboard"],
      since: "1.0.0",
      version: "2.0.0",
      files: [
        {
          path: "icons/home-light.svg",
          type: "svg",
          theme: "light",
          target: "assets/home.svg",
          content: "RAW_LIGHT_SVG_SENTINEL"
        },
        {
          path: "icons/home-dark.svg",
          type: "svg",
          theme: "dark",
          content: "RAW_DARK_SVG_SENTINEL"
        }
      ]
    }
  }
} satisfies Schema;

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

describe("renderComponentsDocument", () => {
  it("renders sorted component metadata, dependencies, and files", () => {
    const content = renderComponentsDocument(componentSpec);
    const button = content.indexOf("## Button");
    const card = content.indexOf("## Card");
    const alpha = content.indexOf("- `alpha`: `^1.0.0`");
    const zeta = content.indexOf("- `zeta`: `^2.0.0`");

    expect(button).toBeGreaterThan(0);
    expect(card).toBeGreaterThan(button);
    expect(content).toContain("Triggers an action.");
    expect(content).toContain("- **Name:** `button`");
    expect(content).toContain("- **Type:** `ui`");
    expect(content).toContain("- **Category:** `actions`");
    expect(content).toContain("- **Tags:** `interactive`, `action`");
    expect(content).toContain("- **Related:** `icon-button`");
    expect(content).toContain("- **Since:** `1.0.0`");
    expect(content).toContain("- **Version:** `2.0.0`");
    expect(alpha).toBeGreaterThan(0);
    expect(zeta).toBeGreaterThan(alpha);
    expect(content).toContain("### Development Dependencies");
    expect(content).toContain("### Registry Dependencies");
    expect(content.indexOf("`src/button.css`")).toBeLessThan(
      content.indexOf("`src/button.tsx`")
    );
  });

  it("renders safe source fences and preserves metadata-only examples", () => {
    const content = renderComponentsDocument(componentSpec);

    expect(content).toContain("#### With markdown");
    expect(content).toContain("Renders Markdown content.");
    expect(content).toContain("- **Path:** `usage/markdown.tsx`");
    expect(content).toContain('````tsx\nconst markdown = "```example```";\n````');
    expect(content).toContain("#### Metadata only");
    expect(content).toContain("- **Path:** `usage/metadata.tsx`");
    expect(content).not.toContain("````tsx\n\n````");
  });

  it("renders an explicit empty state", () => {
    expect(renderComponentsDocument(emptySpec)).toContain(
      "No documented components were found."
    );
  });
});

describe("renderIconsDocument", () => {
  it("renders sorted icon metadata and themed asset files", () => {
    const content = renderIconsDocument(iconSpec);
    const home = content.indexOf("## Home");
    const settings = content.indexOf("## Settings");

    expect(home).toBeGreaterThan(0);
    expect(settings).toBeGreaterThan(home);
    expect(content).toContain("Navigate to the home screen.");
    expect(content).toContain("- **Name:** `home`");
    expect(content).toContain("- **Category:** `navigation`");
    expect(content).toContain("- **Tags:** `house`, `navigation`");
    expect(content).toContain("- **Aliases:** `house`");
    expect(content).toContain("- **Related:** `dashboard`");
    expect(content).toContain("- **Since:** `1.0.0`");
    expect(content).toContain("- **Version:** `2.0.0`");
    expect(content.indexOf("`icons/home-dark.svg`")).toBeLessThan(
      content.indexOf("`icons/home-light.svg`")
    );
    expect(content).toContain("`assets/home.svg`");
  });

  it("does not embed raw icon file contents", () => {
    const content = renderIconsDocument(iconSpec);

    expect(content).not.toContain("RAW_LIGHT_SVG_SENTINEL");
    expect(content).not.toContain("RAW_DARK_SVG_SENTINEL");
  });

  it("renders an explicit empty state", () => {
    expect(renderIconsDocument(emptySpec)).toContain(
      "No documented icons were found."
    );
  });
});
