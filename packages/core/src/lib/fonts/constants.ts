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

import type { FontFileFormat, FontRole } from "../../schema/fonts";

export const FONT_EXTENSIONS = new Set([
  "woff2",
  "woff",
  "ttf",
  "otf",
  "otc",
  "svg"
]);

export const FONT_FORMAT_FROM_EXTENSION: Record<string, FontFileFormat> = {
  woff2: "woff2",
  woff: "woff",
  ttf: "truetype",
  otf: "opentype",
  otc: "opentype",
  svg: "svg"
};

export const WEIGHT_FROM_SUFFIX: Record<string, number> = {
  thin: 100,
  hairline: 100,
  extralight: 200,
  ultralight: 200,
  light: 300,
  regular: 400,
  normal: 400,
  book: 400,
  roman: 400,
  medium: 500,
  semibold: 600,
  demibold: 600,
  bold: 700,
  extrabold: 800,
  ultrabold: 800,
  black: 900,
  heavy: 900
};

export const GENERIC_FALLBACK_FROM_ROLE: Record<FontRole, string> = {
  sans: "sans-serif",
  serif: "serif",
  mono: "monospace",
  display: "sans-serif",
  heading: "sans-serif",
  body: "sans-serif",
  code: "monospace"
};

export const SANS_ROLES: FontRole[] = ["sans", "body", "heading", "display"];
export const MONO_ROLES: FontRole[] = ["mono", "code"];
