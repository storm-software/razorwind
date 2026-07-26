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

export { formatTokenValue, toCssVar } from "@razorwind/core/utils";

/**
 * Convert an arbitrary label into a lowercase, dash-separated file slug.
 */
export function toSlug(value: string): string {
  return value
    .trim()
    .replaceAll(/[^\w-]+/g, "-")
    .replaceAll(/-{2,}/g, "-")
    .replaceAll(/^-|-$/g, "")
    .toLowerCase();
}

/**
 * Escape a value so it renders safely inside an MDX markdown table cell.
 */
export function escapeTableCell(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("|", "\\|")
    .replaceAll("<", "\\<")
    .replaceAll("{", "\\{")
    .replaceAll(/\r?\n/g, " ");
}
