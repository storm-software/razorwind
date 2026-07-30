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
import generate, { generateDocs } from "../src/generate";
import { flattenTokens } from "../src/lib/flatten";
import {
  escapeTableCell,
  formatTokenValue,
  toCssVar,
  toSlug
} from "../src/lib/format";

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
    }
  },
  font: {
    family: {
      sans: {
        $type: "fontFamily",
        $value: ["Inter", "system-ui", "sans-serif"]
      }
    },
    size: {
      $type: "dimension",
      sm: { $value: { value: 14, unit: "px" } },
      md: { $value: { value: 16, unit: "px" } },
      lg: { $value: { value: 20, unit: "px" } }
    }
  },
  spacing: {
    $type: "dimension",
    sm: { $value: { value: 8, unit: "px" } }
  }
} satisfies Schema["tokens"];

const spec = {
  components: {
    button: {
      name: "button",
      title: "Button",
      type: "ui",
      description: "Displays a button or a component that looks like one.",
      dependencies: { "@radix-ui/react-slot": "*" },
      files: [{ path: "registry/ui/button.tsx", type: "ui" }]
    },
    "login-form": {
      name: "login-form",
      title: "Login Form",
      type: "component",
      description: "A login form with email and password.",
      registryDependencies: { button: "*", input: "*" },
      files: [
        {
          path: "registry/components/login-form.tsx",
          type: "component",
          target: "components/login-form.tsx"
        }
      ]
    },
    dashboard: {
      name: "dashboard",
      title: "dashboard",
      type: "page",
      files: [{ path: "registry/pages/dashboard.tsx", type: "page" }]
    },
    hero: {
      name: "hero",
      title: "hero",
      type: "block",
      category: "marketing",
      tags: ["marketing"],
      description: "Use above the fold."
    },
    "use-mobile": {
      name: "use-mobile",
      title: "use-mobile"
    }
  },
  tokens
} satisfies Schema;

describe("format", () => {
  it("formats DTCG color values to hex", () => {
    expect(
      formatTokenValue(
        {
          colorSpace: "srgb",
          components: [0, 0.4, 0.8],
          hex: "#0066cc"
        },
        "color"
      )
    ).toBe("#0066cc");
  });

  it("formats dimensions", () => {
    expect(formatTokenValue({ value: 8, unit: "px" }, "dimension")).toBe("8px");
  });

  it("builds css vars from paths", () => {
    expect(toCssVar("color.primary", "rw")).toBe("--rw-color-primary");
  });

  it("slugifies group names", () => {
    expect(toSlug("Font Size")).toBe("font-size");
  });

  it("escapes markdown table cells", () => {
    expect(escapeTableCell("a|b<c{d")).toBe("a\\|b\\<c\\{d");
  });
});

describe("flattenTokens", () => {
  it("walks nested DTCG tokens", () => {
    const flat = flattenTokens(spec.tokens);
    expect(flat.map(token => token.path)).toEqual(
      expect.arrayContaining([
        "color.primary",
        "color.secondary",
        "font.family.sans",
        "font.size.sm",
        "spacing.sm"
      ])
    );
    expect(flat.find(token => token.path === "color.primary")?.cssValue).toBe(
      "#0066cc"
    );
  });
});

describe("docgen extract plugin", () => {
  it("is a Razorwind Plugin", () => {
    const plugin = extract({});
    expect(plugin.name).toBe("docgen:extract");
    expect(typeof plugin.extract).toBe("function");
  });

  it("passes the schema through", async () => {
    const plugin = extract({});
    await expect(plugin.extract?.(spec, {} as never)).resolves.toBe(spec);
  });
});

describe("docgen generate plugin", () => {
  it("is a Razorwind Plugin", () => {
    const plugin = generate({});
    expect(plugin.name).toBe("docgen:generate");
    expect(typeof plugin.generate).toBe("function");
  });

  it("generates MDX documentation from the schema", async () => {
    const plugin = generate({ outDir: "docs/design-system" });
    const documents = await plugin.generate!(spec, {} as never);

    expect(Object.keys(documents)).toEqual(
      expect.arrayContaining([
        "docs/design-system/index.mdx",
        "docs/design-system/tokens/color.mdx",
        "docs/design-system/tokens/font.mdx",
        "docs/design-system/tokens/spacing.mdx",
        "docs/design-system/registry/ui.mdx",
        "docs/design-system/registry/components.mdx",
        "docs/design-system/registry/pages.mdx",
        "docs/design-system/registry/blocks.mdx",
        "docs/design-system/tokens.json"
      ])
    );

    const index = documents["docs/design-system/index.mdx"]?.chunks?.[0]
      ?.content;
    expect(index).toContain("# Design System");
    expect(index).toContain("./tokens/color.mdx");
    expect(index).toContain("./registry/ui.mdx");
    expect(index).not.toContain("./registry.mdx");

    const colors = documents["docs/design-system/tokens/color.mdx"]?.chunks?.[0]
      ?.content;
    expect(colors).toContain("| Preview | Token | Type | Value | CSS Variable |");
    expect(colors).toContain("`color.primary`");
    expect(colors).toContain("#0066cc");
    expect(colors).toContain("`--rw-color-primary`");
    expect(colors).toContain("Brand primary");

    expect(documents["docs/design-system/registry.mdx"]).toBeUndefined();

    const ui = documents["docs/design-system/registry/ui.mdx"]?.chunks?.[0]
      ?.content;
    expect(ui).toContain("# UI Primitives");
    expect(ui).toContain("## Button");
    expect(ui).toContain("Displays a button or a component");
    expect(ui).toContain("`@radix-ui/react-slot`");
    expect(ui).toContain("`registry/ui/button.tsx`");

    const components = documents["docs/design-system/registry/components.mdx"]
      ?.chunks?.[0]?.content;
    expect(components).toContain("## Login Form");
    expect(components).toContain("### Registry Dependencies");
    expect(components).toContain("`components/login-form.tsx`");

    const blocks = documents["docs/design-system/registry/blocks.mdx"]
      ?.chunks?.[0]?.content;
    expect(blocks).toContain("**Categories:** `marketing`");
    expect(blocks).toContain("Use above the fold.");

    // hooks have no dedicated page
    expect(documents["docs/design-system/registry/hooks.mdx"]).toBeUndefined();
  });

  it("skips the registry page when requested", () => {
    const documents = generateDocs(spec, {
      outDir: "out",
      skipRegistry: true
    });

    expect(documents["out/registry.mdx"]).toBeUndefined();
    expect(documents["out/registry/ui.mdx"]).toBeUndefined();
    expect(documents["out/index.mdx"]?.chunks?.[0]?.content).not.toContain(
      "registry.mdx"
    );
    expect(documents["out/index.mdx"]?.chunks?.[0]?.content).not.toContain(
      "./registry/"
    );
  });

  it("generateDocs mirrors the plugin generate output", async () => {
    const plugin = generate({ outDir: "out" });
    const fromPlugin = await plugin.generate!(spec, {} as never);
    const fromHelper = generateDocs(spec, { outDir: "out" });

    expect(fromPlugin["out/tokens.json"]?.chunks?.[0]?.content).toEqual(
      fromHelper["out/tokens.json"]?.chunks?.[0]?.content
    );
  });
});
