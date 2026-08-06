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
  generateZshTheme,
  normalizeThemes,
  renderInstallMd,
  renderZshTheme,
  toZshFg
} from "../src/generate";
import zsh, { type ZshTheme } from "../src/index";

const tokens = {
  color: {
    $type: "color",
    success: {
      $value: {
        colorSpace: "srgb",
        components: [0.314, 0.98, 0.482],
        hex: "#50fa7b"
      }
    },
    error: {
      $value: "#ff5555"
    },
    primary: {
      $value: "#bd93f9"
    },
    accent: {
      $value: "#8be9fd"
    },
    secondary: {
      $value: "#ff79c6"
    },
    warning: {
      $value: "#f1fa8c"
    }
  }
} satisfies Tokens;

const multiThemeTokens = {
  dark: tokens,
  light: {
    color: {
      $type: "color",
      success: { $value: "#16a34a" },
      error: { $value: "#dc2626" },
      primary: { $value: "#7c3aed" },
      accent: { $value: "#0891b2" },
      secondary: { $value: "#db2777" },
      warning: { $value: "#ca8a04" }
    }
  }
} satisfies Record<string, Tokens>;

const spec = {
  components: {},
  icons: {},
  tokens
} as Schema;

function mapDemoTheme(): ZshTheme {
  return {
    name: "demo-dark",
    displayName: "Demo Dark",
    colors: {
      success: "#50fa7b",
      error: "#ff5555",
      warning: "#f1fa8c",
      directory: "#bd93f9",
      git: "#8be9fd",
      context: "#ff79c6"
    },
    displayGit: true,
    displayTime: false
  };
}

describe("formatTokenValue", () => {
  it("formats DTCG color values to hex", () => {
    expect(
      formatTokenValue(
        {
          colorSpace: "srgb",
          components: [0.314, 0.98, 0.482],
          hex: "#50fa7b"
        },
        "color"
      )
    ).toBe("#50fa7b");
  });
});

describe("toZshFg", () => {
  it("lowercases hex colors for %F", () => {
    expect(toZshFg("#50FA7B")).toBe("#50fa7b");
  });

  it("passes named colors through", () => {
    expect(toZshFg("cyan")).toBe("cyan");
  });
});

describe("flattenTokens / resolveTokenSets", () => {
  it("walks nested DTCG tokens", () => {
    const flat = flattenTokens(tokens);
    expect(flat.map(token => token.path)).toEqual(
      expect.arrayContaining([
        "color.success",
        "color.error",
        "color.primary",
        "color.accent"
      ])
    );
    expect(flat.find(token => token.path === "color.success")?.cssValue).toBe(
      "#50fa7b"
    );
  });

  it("splits multi-theme records", () => {
    const sets = resolveTokenSets(multiThemeTokens);
    expect(sets.map(set => set.id).sort()).toEqual(["dark", "light"]);
  });
});

describe("normalizeThemes", () => {
  it("accepts a single theme, array, or record", () => {
    const single = mapDemoTheme();
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
      normalizeThemes([{ colors: {} } as unknown as ZshTheme])
    ).toThrow(/must be a ZshTheme/);
    expect(() =>
      normalizeThemes({ bad: { colors: {} } as unknown as ZshTheme })
    ).toThrow(/must be a ZshTheme/);
  });
});

describe("renderZshTheme", () => {
  it("writes Oh My Zsh theme with segment colors and git prompt vars", () => {
    const body = renderZshTheme(mapDemoTheme());
    expect(body).toContain("setopt PROMPT_SUBST");
    expect(body).toContain("%F{#50fa7b}");
    expect(body).toContain("%F{#ff5555}");
    expect(body).toContain("%F{#bd93f9}");
    expect(body).toContain("%F{#8be9fd}");
    expect(body).toContain("git_prompt_info");
    expect(body).toContain("ZSH_THEME_GIT_PROMPT_PREFIX");
    expect(body).toContain("RW_ZSH_DISPLAY_GIT=${RW_ZSH_DISPLAY_GIT:-1}");
  });

  it("honors prompt override", () => {
    const body = renderZshTheme({
      name: "custom",
      prompt: "%F{cyan}%~%f %# "
    });
    expect(body).toContain("PROMPT='%F{cyan}%~%f %# '");
    expect(body).not.toContain("rw_zsh_arrow");
  });
});

describe("renderInstallMd", () => {
  it("documents Oh My Zsh copy + ZSH_THEME steps", () => {
    const md = renderInstallMd({
      themes: [
        {
          name: "demo-dark",
          displayName: "Demo Dark",
          fileName: "demo-dark.zsh-theme"
        }
      ]
    });
    expect(md).toContain("Demo Dark");
    expect(md).toContain("demo-dark.zsh-theme");
    expect(md).toContain('ZSH_THEME="demo-dark"');
    expect(md).toContain("oh-my-zsh");
    expect(md).toContain("draculatheme.com/zsh");
  });
});

describe("zsh plugin", () => {
  it("is a Razorwind Plugin", () => {
    const plugin = zsh({ mapTheme: mapDemoTheme });
    expect(plugin.name).toBe("zsh");
    expect(typeof plugin.generate).toBe("function");
  });

  it("requires options", async () => {
    const plugin = zsh();
    await expect(plugin.generate!(spec, {} as never)).rejects.toThrow(
      /requires options/
    );
  });

  it("requires mapTheme", () => {
    expect(() => generateZshTheme(spec, {} as never)).toThrow(
      /requires options.mapTheme/
    );
  });

  it("generates zsh-theme files and INSTALL.md", async () => {
    const plugin = zsh({
      outputPath: "out/zsh",
      mapTheme: input => {
        const flat = flattenTokens(input);
        const color = (path: string) =>
          flat.find(token => token.path === path)?.cssValue ?? "#000000";

        return {
          name: "demo-theme",
          colors: {
            success: color("color.success"),
            error: color("color.error"),
            directory: color("color.primary"),
            git: color("color.accent"),
            context: color("color.secondary"),
            warning: color("color.warning")
          }
        };
      }
    });

    const documents = await plugin.generate!(spec, {} as never);
    const paths = Object.keys(documents).sort();

    expect(paths).toEqual(["out/zsh/INSTALL.md", "out/zsh/demo-theme.zsh-theme"]);

    const theme = documents["out/zsh/demo-theme.zsh-theme"]!.chunks![0]!.content;
    expect(theme).toContain("%F{#50fa7b}");
    expect(theme).toContain("%F{#bd93f9}");
    expect(theme).toContain("%F{#8be9fd}");

    const install = documents["out/zsh/INSTALL.md"]!.chunks![0]!.content;
    expect(install).toContain("demo-theme.zsh-theme");
    expect(install).toContain('ZSH_THEME="demo-theme"');
    expect(install).toContain("source ~/.zshrc");
  });

  it("generateZshTheme mirrors plugin generate output", () => {
    const documents = generateZshTheme(spec, {
      mapTheme: mapDemoTheme
    });

    expect(documents["zsh-themes/demo-dark.zsh-theme"]).toBeDefined();
    expect(documents["zsh-themes/INSTALL.md"]).toBeDefined();
    const theme =
      documents["zsh-themes/demo-dark.zsh-theme"]!.chunks![0]!.content;
    expect(theme).toContain("Demo Dark");
  });

  it("emits one file per mapped theme", () => {
    const documents = generateZshTheme(
      { ...spec, tokens: multiThemeTokens } as Schema,
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
                success: color("color.success"),
                directory: color("color.primary")
              }
            };
          });
        }
      }
    );

    expect(Object.keys(documents).sort()).toEqual([
      "zsh-themes/INSTALL.md",
      "zsh-themes/demo-dark.zsh-theme",
      "zsh-themes/demo-light.zsh-theme"
    ]);
  });

  it("uses installGuide override when provided", () => {
    const documents = generateZshTheme(spec, {
      mapTheme: mapDemoTheme,
      installGuide: "# Custom install\n"
    });
    expect(documents["zsh-themes/INSTALL.md"]!.chunks![0]!.content).toBe(
      "# Custom install\n"
    );
  });
});
