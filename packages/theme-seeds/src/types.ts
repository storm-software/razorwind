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

export type ThemeSeedAppearance = "dark" | "light";

export interface ThemeSeeds {
  hue: number;
  chroma: number;
  warmth: number;
  energy: number;
  density: number;
  appearance: ThemeSeedAppearance;
  lightness?: number;
}

export const SEED_RANGES = {
  hue: [0, 360],
  chroma: [0, 0.25],
  warmth: [-1, 1],
  energy: [0, 1],
  density: [0.85, 1.15],
  lightness: [-1, 1]
} as const;

export interface NormalizedThemeSeeds extends Required<ThemeSeeds> {}
