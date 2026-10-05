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

import { definePlugin } from "@razorwind/core/plugin";
import {
  flattenTokens,
  formatTokenValue,
  resolveTokenSets,
  toCssVar
} from "@razorwind/core/utils";
import {
  generateShellShockTheme,
  renderInstallMd,
  renderThemeJson,
  SNAPSHOT_FILE_NAME
} from "./generate";
import { createSnapshot, isSnapshot } from "./snapshot";
import {
  DEFAULT_PALETTE,
  inferPalette,
  inferTheme,
  isPalette,
  normalizeThemes,
  paletteToTheme,
  resolvePalette,
  resolveTheme,
  selectThemeTokens,
  themeName
} from "./theme";
import type {
  DesignSystemCommandId,
  DesignSystemSourceOptions,
  FlatToken,
  GenerateShellShockTheme,
  ShellShockDesignSystemPluginOptions,
  ShellShockPalette,
  ShellShockPluginOptions,
  ShellShockTheme,
  ThemeUserConfig
} from "./types";

export type {
  DesignSystemSnapshot,
  GuidelineDocument
} from "./runtime/records";
export {
  createSnapshot,
  DEFAULT_PALETTE,
  flattenTokens,
  formatTokenValue,
  generateShellShockTheme,
  inferPalette,
  inferTheme,
  isPalette,
  isSnapshot,
  normalizeThemes,
  paletteToTheme,
  renderInstallMd,
  renderThemeJson,
  resolvePalette,
  resolveTheme,
  resolveTokenSets,
  selectThemeTokens,
  SNAPSHOT_FILE_NAME,
  themeName,
  toCssVar
};
export type {
  DesignSystemCommandId,
  DesignSystemSourceOptions,
  FlatToken,
  GenerateShellShockTheme,
  ShellShockDesignSystemPluginOptions,
  ShellShockPalette,
  ShellShockPluginOptions,
  ShellShockTheme,
  ThemeUserConfig
};

/**
 * Razorwind plugin that turns design tokens into a Shell Shock CLI theme.
 *
 * Provide {@link ShellShockPluginOptions.mapTheme} to map extracted tokens to
 * a compact {@link ShellShockPalette} (or a full Shell Shock theme config).
 * The plugin writes `<name>.theme.json`, a `design-system.json` snapshot and
 * an `INSTALL.md` describing how to wire them into a Shell Shock project via
 * `@razorwind/shell-shock/plugin`.
 *
 * @see https://github.com/storm-software/shell-shock/tree/main/packages/plugin-theme
 *
 * @example
 * ```ts
 * import { defineConfig } from "@razorwind/core";
 * import shellShock, { inferPalette } from "@razorwind/shell-shock";
 *
 * export default defineConfig({
 *   plugins: [
 *     shellShock({
 *       mapTheme: spec => ({
 *         // Heuristic defaults from `color.primary`, `color.success`, …
 *         ...inferPalette(spec),
 *         // …with explicit overrides where the heuristics miss.
 *         link: "#3fa6ff"
 *       })
 *     })
 *   ]
 * });
 * ```
 */
export default definePlugin((options?: ShellShockPluginOptions) => ({
  name: "shell-shock",
  generate: async spec => {
    if (!options) {
      throw new Error("@razorwind/shell-shock requires options: { mapTheme }");
    }
    return generateShellShockTheme(spec, options);
  }
}));
