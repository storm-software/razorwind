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
