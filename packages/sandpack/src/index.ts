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
import { flattenTokens, resolveTokenSets } from "./flatten";
import { formatTokenValue, toCssVar } from "./format";
import {
  generateSandpackTheme,
  normalizeThemes,
  normalizeUsages,
  renderInstallMd,
  renderThemeJson,
  renderUsageJson
} from "./generate";
import type {
  FlatToken,
  GenerateSandpackFiles,
  GenerateSandpackTheme,
  SandpackFile,
  SandpackFiles,
  SandpackPluginOptions,
  SandpackSyntaxStyle,
  SandpackTheme,
  SandpackThemeColors,
  SandpackThemeFont,
  SandpackThemeSyntax,
  SandpackUsage
} from "./types";
import { buildUsageFromComponents, usageToSandpackFiles } from "./usage";

export {
  buildUsageFromComponents,
  flattenTokens,
  formatTokenValue,
  generateSandpackTheme,
  normalizeThemes,
  normalizeUsages,
  renderInstallMd,
  renderThemeJson,
  renderUsageJson,
  resolveTokenSets,
  toCssVar,
  usageToSandpackFiles
};
export type {
  FlatToken,
  GenerateSandpackFiles,
  GenerateSandpackTheme,
  SandpackFile,
  SandpackFiles,
  SandpackPluginOptions,
  SandpackSyntaxStyle,
  SandpackTheme,
  SandpackThemeColors,
  SandpackThemeFont,
  SandpackThemeSyntax,
  SandpackUsage
};

/**
 * Razorwind plugin that turns design tokens into Sandpack themes and component
 * usage demos (`files` prop payloads).
 *
 * Provide {@link SandpackPluginOptions.mapTheme} to map extracted tokens to one
 * or more theme documents. Component `usage` examples are emitted as Sandpack
 * `files` JSON under `usage/` (override with {@link SandpackPluginOptions.mapFiles}).
 *
 * @see https://sandpack.codesandbox.io/docs/getting-started/themes#custom-theme
 * @see https://sandpack.codesandbox.io/docs/getting-started/usage#files
 *
 * @example
 * ```ts
 * import { defineConfig } from "@razorwind/core";
 * import sandpack, { flattenTokens } from "@razorwind/sandpack";
 *
 * export default defineConfig({
 *   plugins: [
 *     sandpack({
 *       mapTheme: tokens => {
 *         const flat = flattenTokens(tokens);
 *         const color = (path: string) =>
 *           flat.find(t => t.path === path)?.cssValue ?? "#000000";
 *
 *         return {
 *           name: "my-theme",
 *           colors: {
 *             surface1: color("color.bg"),
 *             base: color("color.fg"),
 *             accent: color("color.accent")
 *           },
 *           syntax: {
 *             plain: color("color.fg"),
 *             comment: color("color.muted"),
 *             string: color("color.accent")
 *           }
 *         };
 *       }
 *     })
 *   ]
 * });
 * ```
 */
export default definePlugin((options?: SandpackPluginOptions) => ({
  name: "sandpack",
  generate: async spec => {
    if (!options) {
      throw new Error("@razorwind/sandpack requires options: { mapTheme }");
    }
    return generateSandpackTheme(spec, options);
  }
}));
