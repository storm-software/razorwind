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

/**
 * Options for the Razorwind CSS generate plugin.
 */
export interface CssGeneratePluginOptions {
  /**
   * Output file path (relative to the execution cwd).
   *
   * @defaultValue "src/styles.css"
   */
  outputPath?: string;
}

/**
 * Options for the Razorwind CSS extract plugin.
 */
export interface CssExtractPluginOptions {
  /**
   * Path to the CSS file to parse for custom-property tokens
   * (relative to the execution cwd, or absolute). When omitted, common
   * workspace CSS entry candidates are checked (`src/styles.css`, …).
   *
   * @defaultValue "src/styles.css"
   */
  cssPath?: string | null;
}
