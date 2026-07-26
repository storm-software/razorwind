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

export { formatTokenValue } from "@razorwind/core/utils";

/**
 * Convert a token path into a DESIGN.md token name.
 *
 * Strips a leading group segment (e.g. `color`, `colors`, `radius`) when it
 * matches the section the token is emitted into, then joins the rest with
 * `-` (DESIGN.md token names are flat kebab-case).
 *
 * @example
 * toTokenName("color.primary", ["color", "colors"]) // "primary"
 */
export function toTokenName(path: string, stripPrefixes: string[]): string {
  const segments = path.split(".").filter(Boolean);

  while (
    segments.length > 1 &&
    stripPrefixes.includes(segments[0]!.toLowerCase())
  ) {
    segments.shift();
  }

  return segments
    .join("-")
    .replaceAll(/[^\w-]+/g, "-")
    .toLowerCase();
}

/**
 * Serialize a value as a YAML scalar, quoting when required (values starting
 * with `#`, `{`, containing YAML-significant characters, etc.).
 */
export function toYamlScalar(value: unknown): string {
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  const text = String(value);

  if (/^[a-z][\w-]*$/i.test(text)) {
    return text;
  }

  return JSON.stringify(text);
}

/**
 * Convert a token name into title-cased prose (e.g. `on-primary` →
 * `On Primary`).
 */
export function toTitleCase(name: string): string {
  return name
    .split(/[-_.]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
