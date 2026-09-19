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
 * The color variants that can be created.
 */
export type ColorVariant =
  | "dimmed"
  | "high-contrast"
  | "protanopia"
  | "deuteranopia"
  | "tritanopia"
  | "achromatopsia"
  | "monochromatic";

/** Default variants created when the plugin is called with no options. */
export const DEFAULT_COLOR_VARIANTS: ColorVariant[] = [
  "dimmed",
  "high-contrast"
];

/**
 * Options for the color-variants extract plugin.
 */
export interface ColorVariantsPluginOptions {
  /**
   * Color variants to generate from each extracted token set.
   *
   * @defaultValue `["dimmed", "high-contrast"]`
   */
  variants?: ColorVariant[];
}

/** Short `$description` written on each generated variant token set. */
export const VARIANT_DESCRIPTIONS: Record<ColorVariant, string> = {
  dimmed: "Dimmed (soft contrast) color variant.",
  "high-contrast": "High contrast color variant.",
  protanopia: "Protanopia (red-blind) simulated color variant.",
  deuteranopia: "Deuteranopia (green-blind) simulated color variant.",
  tritanopia: "Tritanopia (blue-blind) simulated color variant.",
  achromatopsia: "Achromatopsia (full color blindness) grayscale variant.",
  monochromatic: "Monochromatic (grayscale) color variant."
};
