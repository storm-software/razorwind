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

import { kebabCase } from "@stryke/string-format/kebab-case";

/**
 * Convert a theme name into a filesystem-safe slug.
 *
 * @example
 * slugifyThemeName("My Dark Theme") // "my-dark-theme"
 */
export function slugifyThemeName(name: string): string {
  return kebabCase(name);
}
