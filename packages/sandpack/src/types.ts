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

import type { TokenType } from "@power-plant/dtcg-schema";
import type { Components, Tokens } from "@razorwind/core/schema";

/**
 * A flattened design token ready for Sandpack theme mapping.
 */
export interface FlatToken {
  /** Dot-separated token path (e.g. `color.primary`). */
  path: string;
  /** DTCG `$type`, when known. */
  type?: TokenType | string;
  /** Raw `$value` from the token document. */
  value: unknown;
  /** CSS-friendly string form of {@link value}. */
  cssValue: string;
  /** Optional DTCG `$description`. */
  description?: string;
  /** Theme / set id when tokens are a `Record<string, Tokens>`. */
  theme?: string;
}

/**
 * Syntax style token for Sandpack themes.
 *
 * @see https://sandpack.codesandbox.io/docs/getting-started/themes#custom-theme
 */
export interface SandpackSyntaxStyle {
  color?: string;
  fontStyle?: "normal" | "italic";
  fontWeight?:
    | "normal"
    | "bold"
    | "100"
    | "200"
    | "300"
    | "400"
    | "500"
    | "600"
    | "700"
    | "800"
    | "900";
  textDecoration?:
    | "none"
    | "underline"
    | "line-through"
    | "underline line-through";
}

/**
 * Sandpack UI color tokens (`theme.colors`).
 *
 * @see https://sandpack.codesandbox.io/docs/getting-started/themes#custom-theme
 */
export interface SandpackThemeColors {
  surface1?: string;
  surface2?: string;
  surface3?: string;
  disabled?: string;
  base?: string;
  clickable?: string;
  hover?: string;
  accent?: string;
  error?: string;
  errorSurface?: string;
  warning?: string;
  warningSurface?: string;
}

/**
 * Sandpack syntax highlight tokens (`theme.syntax`).
 *
 * @see https://sandpack.codesandbox.io/docs/getting-started/themes#custom-theme
 */
export interface SandpackThemeSyntax {
  plain?: string | SandpackSyntaxStyle;
  comment?: string | SandpackSyntaxStyle;
  keyword?: string | SandpackSyntaxStyle;
  definition?: string | SandpackSyntaxStyle;
  punctuation?: string | SandpackSyntaxStyle;
  property?: string | SandpackSyntaxStyle;
  tag?: string | SandpackSyntaxStyle;
  static?: string | SandpackSyntaxStyle;
  string?: string | SandpackSyntaxStyle;
}

/**
 * Sandpack typography tokens (`theme.font`).
 *
 * @see https://sandpack.codesandbox.io/docs/getting-started/themes#custom-theme
 */
export interface SandpackThemeFont {
  body?: string;
  mono?: string;
  size?: string;
  lineHeight?: string;
}

/**
 * Sandpack custom theme document.
 *
 * Pass the emitted JSON (minus Razorwind `name` / `displayName`) to
 * `<Sandpack theme={...} />`. Partial objects override the default light theme.
 *
 * @see https://sandpack.codesandbox.io/docs/getting-started/themes#custom-theme
 */
export interface SandpackTheme {
  /** Stable theme id — used for the theme file name. */
  name: string;
  /** Human-readable label for INSTALL.md. Defaults to {@link name}. */
  displayName?: string;
  colors?: SandpackThemeColors;
  syntax?: SandpackThemeSyntax;
  font?: SandpackThemeFont;
}

/**
 * Map extracted design tokens to one or more Sandpack theme documents.
 *
 * Return a single theme, an array, or a record keyed by theme id.
 */
export type GenerateSandpackTheme = (
  tokens: Tokens | Record<string, Tokens>
) => SandpackTheme | SandpackTheme[] | Record<string, SandpackTheme>;

/**
 * A single Sandpack file entry for the `files` prop.
 *
 * @see https://sandpack.codesandbox.io/docs/getting-started/usage#files
 */
export interface SandpackFile {
  code: string;
  hidden?: boolean;
  active?: boolean;
  readOnly?: boolean;
}

/**
 * Sandpack `files` prop — path keys map to source strings or file objects.
 *
 * @see https://sandpack.codesandbox.io/docs/getting-started/usage#files
 */
export type SandpackFiles = Record<string, string | SandpackFile>;

/**
 * A component usage demo ready for `<Sandpack files={...} />`.
 *
 * @see https://sandpack.codesandbox.io/docs/getting-started/usage#files
 */
export interface SandpackUsage {
  /** Stable demo id — used for the usage file name. */
  name: string;
  /** Human-readable label for INSTALL.md. Defaults to {@link name}. */
  displayName?: string;
  /** Component id this demo belongs to. */
  component?: string;
  title?: string;
  description?: string;
  /**
   * Sandpack template preset.
   *
   * @defaultValue `"react"`
   */
  template?: string;
  /** Sandpack `files` prop payload. */
  files: SandpackFiles;
  /**
   * Theme id matching a generated theme `name`, or an inline theme payload
   * (without Razorwind `name` / `displayName`).
   */
  theme?: string | Omit<SandpackTheme, "name" | "displayName">;
  /** Extra npm dependencies for `customSetup.dependencies`. */
  dependencies?: Record<string, string>;
  /** Optional sandbox entry path (`customSetup.entry`). */
  entry?: string;
}

/**
 * Map extracted components (and tokens) to Sandpack usage demos.
 *
 * Return a single demo, an array, or a record keyed by demo id.
 * When omitted, demos are built from `schema.components[].usage`.
 */
export type GenerateSandpackFiles = (
  components: Components,
  tokens: Tokens | Record<string, Tokens>
) => SandpackUsage | SandpackUsage[] | Record<string, SandpackUsage>;

/**
 * Options for the Razorwind Sandpack theme / usage generator.
 *
 * @see https://sandpack.codesandbox.io/docs/getting-started/themes#custom-theme
 * @see https://sandpack.codesandbox.io/docs/getting-started/usage#files
 */
export interface SandpackPluginOptions {
  /**
   * Directory (relative to the execution cwd) for generated theme and usage
   * files.
   *
   * @defaultValue `"sandpack"`
   */
  outputPath?: string;

  /**
   * Map extracted tokens to Sandpack theme document(s).
   *
   * Required — without a mapping there is nothing to emit for themes.
   */
  mapTheme: GenerateSandpackTheme;

  /**
   * Map extracted components to Sandpack usage demos (`files` prop payloads).
   *
   * When omitted and {@link includeUsage} is not `false`, demos are derived
   * from `schema.components[].usage`.
   */
  mapFiles?: GenerateSandpackFiles;

  /**
   * Emit component usage demos under `usage/`.
   *
   * @defaultValue `true`
   */
  includeUsage?: boolean;

  /**
   * Default Sandpack template for auto-built usage demos.
   *
   * @defaultValue `"react"`
   */
  template?: string;

  /**
   * Override body for generated `INSTALL.md`. When omitted, Sandpack install
   * steps are written (import theme / files into `<Sandpack />`).
   */
  installGuide?: string;

  /**
   * Restrict flattened helper tokens to these DTCG `$type` values.
   * Does not filter what {@link mapTheme} receives.
   */
  includeTypes?: TokenType[];
}
