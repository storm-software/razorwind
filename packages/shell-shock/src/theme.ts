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

import type { Schema, Tokens } from "@razorwind/core/schema";
import {
  flattenTokens,
  isObject,
  isSharedThemeId,
  resolveTokenSets,
  slugifyThemeName
} from "@razorwind/core/utils";
import { toHexColor } from "./runtime/color";
import type {
  ShellShockPalette,
  ShellShockTheme,
  ThemeUserConfig
} from "./types";

/** Hex colors used when a role cannot be inferred from tokens. */
export const DEFAULT_PALETTE: Required<Omit<ShellShockPalette, "name">> = {
  primary: "#3fa6ff",
  secondary: "#8b9cff",
  tertiary: "#a3b8cc",
  text: "#e6edf3",
  muted: "#8b949e",
  link: "#3fa6ff",
  border: "#3d444d",
  success: "#45b27e",
  info: "#3fa6ff",
  help: "#818cf8",
  debug: "#8b949e",
  warning: "#f3d371",
  danger: "#d8314a",
  error: "#d8314a"
};

const PALETTE_KEYS = new Set<keyof ShellShockPalette>([
  "name",
  "primary",
  "secondary",
  "tertiary",
  "text",
  "muted",
  "link",
  "border",
  "success",
  "info",
  "help",
  "debug",
  "warning",
  "danger",
  "error"
]);

/**
 * True when `value` is a compact {@link ShellShockPalette} rather than a full
 * Shell Shock {@link ThemeUserConfig}.
 */
export function isPalette(value: unknown): value is ShellShockPalette {
  if (!isObject(value) || typeof value.primary !== "string") {
    return false;
  }

  return Object.keys(value).every(
    key => key === "$theme" || PALETTE_KEYS.has(key as keyof ShellShockPalette)
  );
}

/**
 * Fill missing palette roles from their neighbors and the defaults.
 */
export function resolvePalette(
  palette: ShellShockPalette
): Required<Omit<ShellShockPalette, "name">> & Pick<ShellShockPalette, "name"> {
  const primary = palette.primary || DEFAULT_PALETTE.primary;
  const danger = palette.danger ?? palette.error ?? DEFAULT_PALETTE.danger;
  const info = palette.info ?? primary;
  const muted = palette.muted ?? DEFAULT_PALETTE.muted;

  return {
    ...(palette.name ? { name: palette.name } : {}),
    primary,
    secondary: palette.secondary ?? primary,
    tertiary: palette.tertiary ?? palette.secondary ?? muted,
    text: palette.text ?? DEFAULT_PALETTE.text,
    muted,
    link: palette.link ?? primary,
    border: palette.border ?? muted,
    success: palette.success ?? DEFAULT_PALETTE.success,
    info,
    help: palette.help ?? info,
    debug: palette.debug ?? muted,
    warning: palette.warning ?? DEFAULT_PALETTE.warning,
    danger,
    error: palette.error ?? danger
  };
}

/**
 * Expand a compact {@link ShellShockPalette} into the surface-oriented
 * Shell Shock {@link ThemeUserConfig} consumed by `@shell-shock/plugin-theme`.
 */
export function paletteToTheme(palette: ShellShockPalette): ThemeUserConfig {
  const p = resolvePalette(palette);
  const variants = (
    primary: string,
    secondary = primary,
    tertiary = secondary
  ) => ({
    primary,
    secondary,
    tertiary
  });
  const states = {
    help: p.help,
    success: p.success,
    info: p.info,
    debug: p.debug,
    warning: p.warning,
    danger: p.danger,
    error: p.error
  };
  const promptStates = {
    active: p.primary,
    warning: p.warning,
    error: p.error,
    submitted: p.success,
    cancelled: p.muted,
    disabled: p.muted
  };
  const spinnerStates = {
    active: p.primary,
    error: p.error,
    success: p.success,
    help: p.help,
    info: p.info,
    warning: p.warning
  };

  return {
    ...(p.name ? { $theme: slugifyThemeName(p.name) } : {}),
    colors: {
      text: {
        banner: {
          title: variants(p.primary, p.secondary, p.tertiary),
          header: variants(p.secondary, p.tertiary),
          footer: variants(p.muted),
          command: variants(p.primary, p.secondary, p.tertiary),
          description: variants(p.text, p.muted),
          link: variants(p.link)
        },
        heading: variants(p.primary, p.secondary, p.tertiary),
        body: {
          primary: p.text,
          secondary: p.muted,
          tertiary: p.muted,
          link: p.link
        },
        message: {
          link: {
            help: p.link,
            success: p.link,
            info: p.link,
            debug: p.link,
            warning: p.link,
            danger: p.link,
            error: p.link
          },
          header: states,
          footer: {
            help: p.muted,
            success: p.muted,
            info: p.muted,
            debug: p.muted,
            warning: p.muted,
            danger: p.muted,
            error: p.muted
          },
          description: {
            help: p.text,
            success: p.text,
            info: p.text,
            debug: p.text,
            warning: p.text,
            danger: p.text,
            error: p.text
          }
        },
        usage: {
          bin: p.primary,
          command: p.secondary,
          dynamic: p.tertiary,
          options: p.info,
          args: p.warning,
          description: p.muted
        },
        prompt: {
          icon: promptStates,
          message: { ...promptStates, active: p.text },
          input: {
            ...promptStates,
            active: p.text,
            inactive: p.muted,
            placeholder: p.muted
          },
          description: { ...promptStates, active: p.muted, inactive: p.muted }
        },
        spinner: {
          icon: spinnerStates,
          message: { ...spinnerStates, active: p.text }
        },
        tags: {
          $default: p.primary
        }
      },
      border: {
        app: {
          table: variants(p.border),
          divider: variants(p.border),
          blockquote: variants(p.muted)
        },
        banner: {
          outline: variants(p.primary, p.secondary, p.tertiary),
          divider: variants(p.border)
        },
        message: {
          outline: states,
          divider: states
        }
      }
    }
  };
}

/**
 * Resolve any {@link ShellShockTheme} to a full {@link ThemeUserConfig}.
 */
export function resolveTheme(theme: ShellShockTheme): ThemeUserConfig {
  if (isPalette(theme)) {
    return paletteToTheme(theme);
  }

  const { name, ...rest } = theme;

  return {
    ...rest,
    ...(rest.$theme || !name ? {} : { $theme: slugifyThemeName(name) })
  };
}

/**
 * Stable id for a theme document (used for file names).
 */
export function themeName(
  theme: ShellShockTheme,
  fallback = "default"
): string {
  const record = theme;

  return record.name || record.$theme || fallback;
}

/**
 * Normalize `mapTheme` results into a theme list.
 */
export function normalizeThemes(
  result: ShellShockTheme | ShellShockTheme[] | Record<string, ShellShockTheme>
): ShellShockTheme[] {
  const assertTheme = (value: unknown, label: string): ShellShockTheme => {
    if (
      !isObject(value) ||
      !(
        isPalette(value) ||
        "colors" in value ||
        "$theme" in value ||
        "borderStyles" in value ||
        "icons" in value ||
        "labels" in value ||
        "spinner" in value ||
        "padding" in value ||
        "settings" in value
      )
    ) {
      throw new TypeError(
        `@razorwind/shell-shock mapTheme()${label} must be a palette with "primary" or a Shell Shock theme config`
      );
    }
    return value;
  };

  if (Array.isArray(result)) {
    return result.map((theme, index) => assertTheme(theme, `[${index}]`));
  }

  if (
    isObject(result) &&
    (isPalette(result) || "colors" in result || "$theme" in result)
  ) {
    return [assertTheme(result, "")];
  }

  if (!isObject(result)) {
    throw new TypeError(
      "@razorwind/shell-shock mapTheme() must return a theme, theme array, or theme record"
    );
  }

  return Object.entries(result).map(([key, theme]) => {
    const resolved = assertTheme(theme, `["${key}"]`);

    return themeName(resolved, "") ? resolved : { ...resolved, name: key };
  });
}

// ---------------------------------------------------------------------------
// Heuristic palette inference
// ---------------------------------------------------------------------------

type PaletteRole = Exclude<keyof ShellShockPalette, "name">;

/**
 * Token-path patterns consulted for each palette role, in priority order.
 * Patterns match against the lower-cased dot path.
 */
const ROLE_PATTERNS: Record<PaletteRole, RegExp[]> = {
  primary: [
    /(^|\.)(primary|brand|accent)(\.|$)/,
    /(^|\.)(primary|brand|accent)/
  ],
  secondary: [/(^|\.)secondary(\.|$)/, /(^|\.)secondary/],
  tertiary: [/(^|\.)tertiary(\.|$)/, /(^|\.)tertiary/],
  text: [
    /(^|\.)(text|fg|foreground)(\.(default|primary|base))?$/,
    /(^|\.)(text|fg|foreground)(\.|$)/
  ],
  muted: [
    /(^|\.)(muted|subtle|subtlest|disabled|placeholder)(\.|$)/,
    /(^|\.)(text|fg|foreground)\.(muted|subtle|secondary|tertiary)/,
    /(^|\.)(muted|subtle|disabled)/
  ],
  link: [/(^|\.)(link|anchor)(\.|$)/, /(^|\.)(link|anchor)/],
  border: [
    /(^|\.)(border|divider|outline|stroke)(\.(default|primary|base))?$/,
    /(^|\.)(border|divider|outline|stroke)(\.|$)/
  ],
  success: [/(^|\.)(success|positive|green)(\.|$)/, /(^|\.)(success|positive)/],
  info: [/(^|\.)(info|information|informative)(\.|$)/, /(^|\.)info/],
  help: [
    /(^|\.)(help|discovery|purple|violet)(\.|$)/,
    /(^|\.)(help|discovery)/
  ],
  debug: [/(^|\.)(debug|neutral|gray|grey)(\.|$)/, /(^|\.)debug/],
  warning: [
    /(^|\.)(warning|warn|caution|yellow|amber)(\.|$)/,
    /(^|\.)(warning|warn|caution)/
  ],
  danger: [
    /(^|\.)(danger|destructive|critical)(\.|$)/,
    /(^|\.)(danger|destructive|critical)/
  ],
  error: [/(^|\.)(error|negative|red)(\.|$)/, /(^|\.)(error|negative)/]
};

/** Trailing path segments that mark a group's canonical value. */
const CANONICAL_SUFFIX = /\.(?:default|base|main|500|600|solid|rest)$/i;

interface ColorCandidate {
  path: string;
  hex: string;
  theme?: string;
}

function collectColorCandidates(
  tokens: Tokens | Record<string, Tokens>
): ColorCandidate[] {
  const candidates: ColorCandidate[] = [];

  for (const token of flattenTokens(tokens)) {
    if (token.type && token.type !== "color") {
      continue;
    }
    const hex = toHexColor(token.value) ?? toHexColor(token.cssValue);
    if (hex) {
      candidates.push({
        path: token.path.toLowerCase(),
        hex,
        theme: token.theme
      });
    }
  }

  return candidates;
}

function pickRole(
  candidates: ColorCandidate[],
  role: PaletteRole
): string | undefined {
  for (const pattern of ROLE_PATTERNS[role]) {
    const matches = candidates.filter(candidate =>
      pattern.test(candidate.path)
    );
    if (matches.length === 0) {
      continue;
    }

    // Prefer canonical / shortest paths: `color.primary` over
    // `color.primary.hover`, `color.primary.500` over `color.primary.50`.
    matches.sort((a, b) => {
      const aCanonical = CANONICAL_SUFFIX.test(a.path) ? 0 : 1;
      const bCanonical = CANONICAL_SUFFIX.test(b.path) ? 0 : 1;
      if (aCanonical !== bCanonical) {
        return aCanonical - bCanonical;
      }
      const depth = a.path.split(".").length - b.path.split(".").length;

      return depth !== 0 ? depth : a.path.localeCompare(b.path);
    });

    return matches[0]!.hex;
  }

  return undefined;
}

/**
 * Select the token set to infer from: the requested theme, otherwise the
 * first non-shared theme, otherwise the whole document.
 */
export function selectThemeTokens(
  tokens: Tokens | Record<string, Tokens>,
  themeId?: string
): { id?: string; tokens: Tokens } {
  const sets = resolveTokenSets(tokens);
  if (sets.length <= 1 && (!sets[0] || sets[0].id === "default")) {
    return { tokens };
  }

  const requested = themeId
    ? sets.find(set => set.id.toLowerCase() === themeId.toLowerCase())
    : undefined;
  const chosen =
    requested ?? sets.find(set => !isSharedThemeId(set.id)) ?? sets[0]!;

  return { id: chosen.id, tokens: chosen.tokens };
}

/**
 * Infer a {@link ShellShockPalette} from token paths (`color.primary`,
 * `color.text.muted`, `color.success`, …). Roles that cannot be inferred
 * are left undefined so {@link resolvePalette} fills them.
 *
 * Multi-theme token records are reduced to one set via
 * {@link selectThemeTokens}.
 */
export function inferPalette(
  spec: Pick<Schema, "tokens" | "theme" | "name">,
  themeId: string | undefined = spec.theme
): ShellShockPalette {
  const selected = selectThemeTokens(spec.tokens, themeId);
  const candidates = collectColorCandidates(selected.tokens);

  const palette: ShellShockPalette = {
    primary: pickRole(candidates, "primary") ?? DEFAULT_PALETTE.primary
  };
  if (selected.id ?? spec.theme) {
    palette.name = selected.id ?? spec.theme;
  }

  for (const role of Object.keys(ROLE_PATTERNS) as PaletteRole[]) {
    if (role === "primary") {
      continue;
    }
    const hex = pickRole(candidates, role);
    if (hex) {
      palette[role] = hex;
    }
  }

  return palette;
}

/**
 * Default `mapTheme`: infer a palette from the spec and expand it.
 */
export function inferTheme(spec: Schema, themeId?: string): ThemeUserConfig {
  return paletteToTheme(inferPalette(spec, themeId));
}
