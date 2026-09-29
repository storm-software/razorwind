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
 * Derive a compact CSS custom-property prefix from a schema name.
 *
 * Multi-word names use their initials (`Acme Design System` → `ads`), while
 * single-word names remain recognizable (`Acme` → `acme`). Scoped names use
 * the package segment after the slash.
 */
export function cssVarPrefixFromName(
  name: string | undefined
): string | undefined {
  const unscopedName = name?.trim().split("/").at(-1) ?? "";
  const words = unscopedName.match(/[\p{L}\p{N}]+/gu) ?? [];

  if (words.length === 0) {
    return undefined;
  }

  return (words.length === 1 ? words[0] : words.map(word => word[0]).join(""))
    .toLocaleLowerCase()
    .replaceAll(/[^a-z0-9-]/g, "");
}
