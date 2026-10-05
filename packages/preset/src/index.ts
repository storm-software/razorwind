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

import type { Plugin } from "@razorwind/core/plugin";
import { definePlugin } from "@razorwind/core/plugin";
import type { Tokens } from "@razorwind/core/schema";
import {
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
  mapZshTheme
} from "./map";
import type {
  GeneratePresetTheme,
  PresetPlugin,
  PresetPluginFactory,
  PresetPluginInput,
  PresetPluginOptions,
  PresetTheme,
  ThemeColor
} from "./types";

export {
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
  mapZshTheme
} from "./map";

export type {
  GeneratePresetTheme,
  PresetPlugin,
  PresetPluginFactory,
  PresetPluginInput,
  PresetPluginOptions,
  PresetTheme,
  ThemeColor
};

/**
 * Attach non-`mapTheme` options to a plugin selected by {@link preset}.
 */
export function presetPlugin<TOptions extends { mapTheme?: unknown }>(
  factory: (options?: TOptions) => Plugin,
  options?: Omit<TOptions, "mapTheme">
): PresetPlugin {
  return {
    factory,
    options
  };
}

function isPresetPlugin(value: PresetPluginInput): value is PresetPlugin {
  return typeof value !== "function";
}

function assertOptions(
  options: PresetPluginOptions | undefined
): asserts options is PresetPluginOptions {
  if (!options?.mapTheme) {
    throw new Error("@razorwind/preset requires options.mapTheme");
  }
  if (!options.plugins?.length) {
    throw new Error("@razorwind/preset requires at least one plugin");
  }
}

function getMappedTheme(
  mapTheme: GeneratePresetTheme,
  cache: WeakMap<object, PresetTheme>,
  tokens: Tokens | Record<string, Tokens>
): PresetTheme {
  const cached = cache.get(tokens);
  if (cached) {
    return cached;
  }

  const mappedTheme = mapTheme(tokens);
  if (
    !mappedTheme ||
    typeof mappedTheme !== "object" ||
    Array.isArray(mappedTheme)
  ) {
    throw new TypeError(
      "@razorwind/preset mapTheme() must return a theme record"
    );
  }

  cache.set(tokens, mappedTheme);
  return mappedTheme;
}

function mapPluginTheme(pluginName: string, theme: PresetTheme): unknown {
  switch (pluginName) {
    case "chrome":
      return mapChromeTheme(theme);
    case "cursor":
      return mapCursorTheme(theme);
    case "ghostty":
      return mapGhosttyTheme(theme);
    case "notepad-plus-plus":
      return mapNotepadPlusPlusTheme(theme);
    case "sandpack":
      return mapSandpackTheme(theme);
    case "shell-shock":
      return mapShellShockTheme(theme);
    case "shiki":
      return mapShikiTheme(theme);
    case "storybook":
      return mapStorybookTheme(theme);
    case "thunderbird":
      return mapThunderbirdTheme(theme);
    case "vivaldi":
      return mapVivaldiTheme(theme);
    case "vsce":
      return mapVsceTheme(theme);
    case "zed":
      return mapZedTheme(theme);
    case "zsh":
      return mapZshTheme(theme);
    default:
      throw new Error(`@razorwind/preset has no adapter for "${pluginName}"`);
  }
}

function createPlugins(options: PresetPluginOptions): Plugin[] {
  const cache = new WeakMap<object, PresetTheme>();
  const plugins: Plugin[] = [];

  for (const input of options.plugins) {
    const entry = isPresetPlugin(input) ? input : { factory: input };
    let plugin: Plugin;

    // eslint-disable-next-line prefer-const
    plugin = (
      entry.factory as unknown as (
        pluginOptions: Record<string, unknown>
      ) => Plugin
    )({
      ...entry.options,
      mapTheme: (tokens: Tokens | Record<string, Tokens>) => {
        const mappedTheme = getMappedTheme(options.mapTheme, cache, tokens);

        return mapPluginTheme(plugin.name, mappedTheme);
      }
    });

    if (!plugin.generate) {
      throw new TypeError(
        `@razorwind/preset plugin "${plugin.name}" must define generate()`
      );
    }
    plugins.push(plugin);
  }

  return plugins;
}

/**
 * Compose Razorwind theme generators around one shared token mapping.
 *
 * The preset expands into the selected plugins during config resolution, so
 * their native multi-theme behavior and generated artifacts stay unchanged.
 */
export default definePlugin((options?: PresetPluginOptions) => {
  assertOptions(options);

  return {
    name: "preset",
    plugins: createPlugins(options)
  };
});
