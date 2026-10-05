import type { Plugin } from "@razorwind/core/plugin";
import type { Schema, Tokens } from "@razorwind/core/schema";
import { describe, expect, it, vi } from "vitest";
import { uniquePlugins } from "../../core/src/lib/resolve-config";
import preset, {
  mapChromeTheme,
  mapCursorTheme,
  mapGhosttyTheme,
  mapNotepadPlusPlusTheme,
  mapSandpackTheme,
  mapShellShockTheme,
  mapShikiTheme,
  mapStorybookTheme,
  mapThunderbirdTheme,
  mapVivaldiTheme,
  mapVsceTheme,
  mapZedTheme,
  mapZshTheme,
  presetPlugin
} from "../src/index";

const tokens = {
  color: {
    bg: { $value: "#111111" },
    fg: { $value: "#eeeeee" }
  }
} satisfies Tokens;

const spec = {
  components: {},
  icons: {},
  fonts: {},
  tokens
} as Schema;

const theme = {
  name: "demo-dark",
  displayName: "Demo Dark",
  appearance: "dark" as const,
  primary: { background: "#111111", foreground: "#eeeeee" },
  secondary: { background: "#223344", foreground: "#445566" },
  success: "#44cc88",
  error: "#ee5566",
  warning: "#ffcc66",
  muted: "#778899",
  border: "#334455",
  selection: { background: "#223344" },
  cursor: "#ffffff"
};

function themePlugin(
  name: string,
  mapTheme?: (tokens: Tokens) => unknown
): Plugin {
  return {
    name,
    generate: input => ({
      [`${name}.json`]: {
        content: JSON.stringify(mapTheme?.(input.tokens as Tokens)),
        plugin: { name }
      }
    })
  };
}

describe("preset", () => {
  it("maps one shared theme to every selected plugin", async () => {
    const mapTheme = vi.fn(() => theme);
    const shiki = (options?: { mapTheme?: (tokens: Tokens) => unknown }) =>
      themePlugin("shiki", options?.mapTheme);
    const zsh = (options?: { mapTheme?: (tokens: Tokens) => unknown }) =>
      themePlugin("zsh", options?.mapTheme);

    const plugin = preset({ plugins: [shiki, zsh], mapTheme });

    expect(plugin.name).toBe("preset");
    expect(plugin.plugins?.map(child => child.name)).toEqual(["shiki", "zsh"]);
    expect(uniquePlugins([plugin]).map(child => child.name)).toEqual([
      "shiki",
      "zsh"
    ]);
    const shikiOutput = await plugin.plugins![0].generate!(spec, {} as never);
    expect(shikiOutput).toEqual(
      expect.objectContaining({
        "shiki.json": expect.objectContaining({
          content: JSON.stringify(mapShikiTheme(theme))
        })
      })
    );
    const zshOutput = await plugin.plugins![1].generate!(spec, {} as never);
    expect(zshOutput).toEqual(
      expect.objectContaining({
        "zsh.json": expect.objectContaining({
          content: JSON.stringify(mapZshTheme(theme))
        })
      })
    );
    expect(mapTheme).toHaveBeenCalledTimes(1);
    expect(mapTheme).toHaveBeenCalledWith(tokens);
  });

  it("accepts target-specific plugin options", () => {
    const vsce = vi.fn(
      (options?: {
        name: string;
        publisher: string;
        mapTheme?: (tokens: Tokens) => unknown;
      }) => themePlugin("vsce", options?.mapTheme)
    );

    preset({
      plugins: [presetPlugin(vsce, { name: "demo", publisher: "acme" })],
      mapTheme: () => theme
    });

    expect(vsce).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "demo",
        publisher: "acme",
        mapTheme: expect.any(Function)
      })
    );
  });

  it("rejects plugins without a preset theme adapter", () => {
    const unsupported = (
      options?: { mapTheme?: (tokens: Tokens) => unknown }
    ) => themePlugin("unsupported", options?.mapTheme);
    const plugin = preset({ plugins: [unsupported], mapTheme: () => theme });

    expect(() => plugin.plugins![0].generate!(spec, {} as never)).toThrow(
      /no adapter for "unsupported"/
    );
  });

  it("requires mapTheme and at least one plugin", () => {
    expect(() => preset()).toThrow(/requires options.mapTheme/);
    expect(() => preset({ plugins: [], mapTheme: () => theme })).toThrow(
      /requires at least one plugin/
    );
  });

  it("exports adapters for every mapTheme output plugin", () => {
    const mappedThemes = [
      mapChromeTheme(theme),
      mapCursorTheme(theme),
      mapGhosttyTheme(theme),
      mapNotepadPlusPlusTheme(theme),
      mapSandpackTheme(theme),
      mapShellShockTheme(theme),
      mapShikiTheme(theme),
      mapStorybookTheme(theme),
      mapThunderbirdTheme(theme),
      mapVivaldiTheme(theme),
      mapVsceTheme(theme),
      mapZedTheme(theme),
      mapZshTheme(theme)
    ];

    expect(mappedThemes).toHaveLength(13);
    expect(mapShellShockTheme(theme)).toMatchObject({
      name: "demo-dark",
      primary: theme.primary.foreground,
      secondary: theme.secondary.foreground,
      muted: theme.muted,
      border: theme.border,
      success: theme.success,
      warning: theme.warning,
      danger: theme.error,
      error: theme.error
    });
    expect(mapChromeTheme(theme).colors.frame).toBe(
      theme.primary.background
    );
    expect(mapStorybookTheme(theme).base).toBe(theme.appearance);
    expect(mapThunderbirdTheme(theme).gecko.id).toBe(
      "demo-dark@razorwind"
    );
    expect(mapZedTheme(theme).themes[0].style).toMatchObject({
      "editor.background": theme.primary.background
    });
  });
});
