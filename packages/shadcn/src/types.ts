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
 * Options for the Razorwind shadcn extract plugin.
 */
export interface ShadcnExtractPluginOptions {
  /**
   * Path to the shadcn `registry.json` file.
   *
   * @defaultValue `"registry.json"`
   * @example
   * ```ts
   * import { defineConfig } from "@razorwind/core";
   * import shadcn from "@razorwind/shadcn/extract";
   *
   * export default defineConfig({
   *   plugins: [shadcn({ configFile: "components/registry.json" })]
   * });
   * ```
   */
  configFile?: string;
}

/**
 * Options for the Razorwind shadcn generate plugin.
 */
export interface ShadcnGeneratePluginOptions {
  /**
   * Output path for the generated `registry.json` file.
   *
   * @defaultValue `"registry.json"`
   */
  configFile?: string;

  /**
   * Registry `name` field written into `registry.json`.
   */
  name?: string;

  /**
   * Registry `homepage` field written into `registry.json`.
   */
  homepage?: string;

  /**
   * Override body for generated `INSTALL.md`. When omitted, shadcn registry
   * wiring steps are generated for the output file.
   */
  installGuide?: string;
}
