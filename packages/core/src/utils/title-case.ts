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

import { titleCase as strykeTitleCase } from "@stryke/string-format/title-case";

/**
 * Convert a slug or identifier into title case for display labels.
 *
 * @example
 * titleCase("my-dark-theme") // "My Dark Theme"
 * titleCase("darkHighContrast") // "Dark High Contrast"
 */
export function titleCase(value: string): string {
  return strykeTitleCase(value);
}
