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

import type { Schema, Tokens } from "@razorwind/core/schema";
import { describe, expect, it } from "vitest";
import { flattenTokens, resolveTokenSets } from "../src/flatten";
import { formatTokenValue } from "../src/format";
import {
  generateSandpackTheme,
  normalizeThemes,
  normalizeUsages,
  renderInstallMd,
  renderThemeJson,
  renderUsageJson
} from "../src/generate";
import sandpack, { type SandpackTheme } from "../src/index";
import { buildUsageFromComponents } from "../src/usage";

const tokens = {
  color: {
    $type: "color",
    bg: {
      $value: {
        colorSpace: "srgb",
        components: [0.05, 0.05, 0.07],
        hex: "#0d0d12"
      }
    },
    fg: {
      $value: "#e8e8ed"
    },
    accent: {
      $value: "#0066cc"
    },
    muted: {
      $value: "#6a6a7a"
    }
  }
} satisfies Tokens;

const multiThemeTokens = {
  dark: tokens,
  light: {
    color: {
      $type: "color",
      bg: { $value: "#ffffff" },
      fg: { $value: "#111111" },
      accent: { $value: "#0066cc" },
      muted: { $value: "#888888" }
    }
  }
} satisfies Record<string, Tokens>;

const components = {
  button: {
    name: "button",
    title: "Button",
    type: "component" as const,
    dependencies: { "lucide-react": "latest" },
    files: [
      {
        path: "button.tsx",
        content: "export function Button() { return <button />; }"
      }
    ],
    usage: [
      {
        name: "default",
        title: "Default",
        path: "usage/default.tsx",
        language: "tsx" as const,
        content: `import { Button } from "./button";

export default function App() {
  return <Button>Click</Button>;
}`
      }
    ]
  }
};

const spec = {
  components,
  icons: {}, fonts: {},
  tokens
} as Schema;

function mapDarkTheme(): SandpackTheme {
  return {
    name: "demo-dark",
    displayName: "Demo Dark",
    colors: {
      surface1: "#0d0d12",
      base: "#e8e8ed",
      accent: "#0066cc"
    },
    syntax: {
      plain: "#e8e8ed",
      comment: { color: "#6a6a7a", fontStyle: "italic" },
      string: "#0066cc"
    }
  };
}

describe("formatTokenValue", () => {
  it("formats DTCG color values to hex", () => {
    expect(
      formatTokenValue(
        {
          colorSpace: "srgb",
          components: [0.05, 0.05, 0.07],
          hex: "#0d0d12"
        },
        "color"
      )
    ).toBe("#0d0d12");
  });
});

describe("flattenTokens / resolveTokenSets", () => {
  it("walks nested DTCG tokens", () => {
    const flat = flattenTokens(tokens);
    expect(flat.map(token => token.path)).toEqual(
      expect.arrayContaining([
        "color.bg",
        "color.fg",
        "color.accent",
        "color.muted"
      ])
    );
    expect(flat.find(token => token.path === "color.bg")?.cssValue).toBe(
      "#0d0d12"
    );
  });

  it("splits multi-theme records", () => {
    const sets = resolveTokenSets(multiThemeTokens);
    expect(sets.map(set => set.id).sort()).toEqual(["dark", "light"]);
  });
});

describe("normalizeThemes", () => {
  it("accepts a single theme, array, or record", () => {
    const single = mapDarkTheme();
    expect(normalizeThemes(single)).toHaveLength(1);
    expect(
      normalizeThemes([
        single,
        { ...single, name: "demo-light" }
      ])
    ).toHaveLength(2);
    expect(
      normalizeThemes({
        dark: single,
        light: { ...single, name: "demo-light" }
      })
    ).toHaveLength(2);
  });

  it("rejects themes without name", () => {
    expect(() =>
      normalizeThemes([{ colors: {} } as unknown as SandpackTheme])
    ).toThrow(/must be a SandpackTheme/);
  });
});

describe("normalizeUsages / buildUsageFromComponents", () => {
  it("builds Sandpack files from component usage", () => {
    const demos = buildUsageFromComponents(components);
    expect(demos).toHaveLength(1);
    expect(demos[0]?.name).toBe("button-default");
    expect(demos[0]?.files["/App.tsx"]).toEqual(
      expect.objectContaining({
        active: true,
        code: expect.stringContaining("<Button>Click</Button>")
      })
    );
    expect(demos[0]?.files["/button.tsx"]).toEqual(
      expect.objectContaining({ readOnly: true, hidden: true })
    );
    expect(demos[0]?.dependencies).toEqual({ "lucide-react": "latest" });
  });

  it("normalizes usage records", () => {
    const demos = buildUsageFromComponents(components);
    expect(normalizeUsages(demos)).toHaveLength(1);
    expect(normalizeUsages({ demo: demos[0]! })).toHaveLength(1);
  });
});

describe("renderThemeJson / renderUsageJson", () => {
  it("writes Sandpack theme JSON without Razorwind name fields", () => {
    const json = JSON.parse(renderThemeJson(mapDarkTheme()));
    expect(json.name).toBeUndefined();
    expect(json.colors.accent).toBe("#0066cc");
    expect(json.syntax.comment).toEqual({
      color: "#6a6a7a",
      fontStyle: "italic"
    });
  });

  it("writes usage JSON with files prop payload", () => {
    const demo = buildUsageFromComponents(components)[0]!;
    const json = JSON.parse(renderUsageJson(demo));
    expect(json.template).toBe("react");
    expect(json.files["/App.tsx"].active).toBe(true);
  });
});

describe("renderInstallMd", () => {
  it("mentions theme and usage setup", () => {
    const md = renderInstallMd({
      themes: [
        { name: "demo-dark", displayName: "Demo Dark", fileName: "demo-dark.json" }
      ],
      usages: [
        {
          name: "button-default",
          displayName: "Default",
          fileName: "button/button-default.json",
          component: "button"
        }
      ]
    });
    expect(md).toContain("Demo Dark");
    expect(md).toContain("themes/demo-dark.json");
    expect(md).toContain("usage/button/button-default.json");
    expect(md).toContain("files={demo.files}");
  });
});

describe("sandpack plugin", () => {
  it("is a Razorwind Plugin", () => {
    const plugin = sandpack({ mapTheme: mapDarkTheme });
    expect(plugin.name).toBe("sandpack");
    expect(typeof plugin.generate).toBe("function");
  });

  it("requires options", async () => {
    const plugin = sandpack();
    await expect(plugin.generate!(spec, {} as never)).rejects.toThrow(
      /requires options/
    );
  });

  it("requires mapTheme", () => {
    expect(() => generateSandpackTheme(spec, {} as never)).toThrow(
      /requires options.mapTheme/
    );
  });

  it("generates theme JSON, usage demos, and INSTALL.md", async () => {
    const plugin = sandpack({
      outputPath: "out/sandpack",
      mapTheme: input => {
        const flat = flattenTokens(input);
        const color = (path: string) =>
          flat.find(token => token.path === path)?.cssValue ?? "#000000";

        return {
          name: "demo-theme",
          colors: {
            surface1: color("color.bg"),
            base: color("color.fg"),
            accent: color("color.accent")
          },
          syntax: {
            plain: color("color.fg"),
            comment: color("color.muted"),
            string: color("color.accent")
          }
        };
      }
    });

    const documents = await plugin.generate!(spec, {} as never);
    const paths = Object.keys(documents).sort();

    expect(paths).toEqual([
      "out/sandpack/INSTALL.md",
      "out/sandpack/themes/demo-theme.json",
      "out/sandpack/usage/button/button-default.json"
    ]);

    const theme = JSON.parse(
      documents["out/sandpack/themes/demo-theme.json"]!.chunks![0]!.content
    );
    expect(theme.colors.surface1).toBe("#0d0d12");
    expect(theme.syntax.string).toBe("#0066cc");

    const usage = JSON.parse(
      documents["out/sandpack/usage/button/button-default.json"]!.chunks![0]!
        .content
    );
    expect(usage.files["/App.tsx"].code).toContain("<Button>Click</Button>");

    const install = documents["out/sandpack/INSTALL.md"]!.chunks![0]!.content;
    expect(install).toContain("demo-theme");
    expect(install).toContain("button-default");
  });

  it("generateSandpackTheme mirrors plugin generate output", () => {
    const documents = generateSandpackTheme(spec, {
      mapTheme: mapDarkTheme,
      includeUsage: false
    });

    expect(documents["sandpack/themes/demo-dark.json"]).toBeDefined();
    expect(documents["sandpack/INSTALL.md"]).toBeDefined();
    expect(
      Object.keys(documents).some(path => path.includes("/usage/"))
    ).toBe(false);
  });

  it("fills theme.font from spec.fonts when mapTheme omits font", () => {
    const documents = generateSandpackTheme(
      {
        ...spec,
        fonts: {
          inter: {
            name: "inter",
            title: "Inter",
            source: "google",
            family: "Inter",
            role: "sans"
          },
          mono: {
            name: "mono",
            title: "JetBrains Mono",
            source: "google",
            family: "JetBrains Mono",
            role: "mono"
          }
        }
      },
      { mapTheme: mapDarkTheme, includeUsage: false }
    );

    const json = documents["sandpack/themes/demo-dark.json"]?.chunks?.[0]
      ?.content;
    expect(json).toContain('"body": "Inter"');
    expect(json).toContain('"mono": "JetBrains Mono"');
  });

  it("emits one theme file per mapped theme", () => {
    const documents = generateSandpackTheme(
      { ...spec, tokens: multiThemeTokens, components: {} } as Schema,
      {
        mapTheme: input => {
          const sets = resolveTokenSets(input);
          return sets.map(set => {
            const flat = flattenTokens(set.tokens);
            const color = (path: string) =>
              flat.find(token => token.path === path)?.cssValue ?? "#000000";
            return {
              name: `demo-${set.id}`,
              colors: {
                surface1: color("color.bg"),
                base: color("color.fg")
              }
            };
          });
        },
        includeUsage: false
      }
    );

    expect(Object.keys(documents).sort()).toEqual([
      "sandpack/INSTALL.md",
      "sandpack/themes/demo-dark.json",
      "sandpack/themes/demo-light.json"
    ]);
  });

  it("honors installGuide override", () => {
    const documents = generateSandpackTheme(spec, {
      mapTheme: mapDarkTheme,
      includeUsage: false,
      installGuide: "# Custom install\n"
    });
    expect(documents["sandpack/INSTALL.md"]!.chunks![0]!.content).toBe(
      "# Custom install\n"
    );
  });
});
