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

import type { Config, PlatformConfig } from "style-dictionary/types";

/**
 * Options for the Razorwind Style Dictionary generator plugin.
 *
 * Mirrors Style Dictionary config except `tokens` (supplied from the Razorwind
 * schema). Set {@link StyleDictionaryPluginOptions.platforms | platforms} to
 * declare build targets (transform groups, formats, build paths, files).
 *
 * @see https://styledictionary.com/reference/config/#platform
 *
 * @example
 * ```ts
 * {
 *   platforms: {
 *     css: {
 *       transformGroup: "css",
 *       buildPath: "build/css/",
 *       files: [{ destination: "variables.css", format: "css/variables" }]
 *     }
 *   }
 * }
 * ```
 */
export type StyleDictionaryPluginOptions = Omit<Config, "tokens"> & {
  /**
   * When true, Style Dictionary runs with `log.verbosity: "verbose"`.
   *
   * Overrides `log.verbosity` on this config, matching the Style Dictionary
   * CLI `--verbose` flag. When omitted or false, config `log.verbosity` (or
   * Style Dictionary defaults) still apply.
   *
   * @see https://styledictionary.com/reference/logging/
   *
   * @defaultValue false
   */
  verbose?: boolean;

  /**
   * Override body for generated `INSTALL.md`. When omitted, platform output
   * wiring steps are generated from emitted file paths.
   */
  installGuide?: string;

  /**
   * Path for generated `INSTALL.md` relative to cwd.
   *
   * @defaultValue parent directory of the first emitted file, or `"INSTALL.md"`
   */
  installPath?: string;
};

/** Re-export for consumers configuring {@link StyleDictionaryPluginOptions.platforms}. */
export type { PlatformConfig };
