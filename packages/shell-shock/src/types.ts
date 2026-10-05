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
import type { Schema } from "@razorwind/core/schema";
import type { McpPluginOptions } from "@shell-shock/plugin-mcp";
import type { ThemeUserConfig } from "@shell-shock/plugin-theme/types/theme";
import type { GuidelineDocument } from "./runtime/records";

export type { ThemeUserConfig } from "@shell-shock/plugin-theme/types/theme";

/**
 * A flattened design token ready for theme mapping.
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
 * Semantic color roles used to build a Shell Shock CLI theme.
 *
 * Every value is a six-digit hex color string. Missing roles fall back to
 * sensible neighbors (`secondary` → `primary`, `error` → `danger`, …).
 *
 * @remarks
 * Shell Shock's {@link ThemeUserConfig} is organized by UI surface (banner,
 * heading, body, message, prompt, spinner, borders, …). This palette is the
 * compact intermediate that {@link paletteToTheme} expands into that shape.
 */
export interface ShellShockPalette {
  /** Stable theme id. Becomes the theme's `$theme` name. */
  name?: string;
  /** Primary accent — headings, banner title, active prompts, spinners. */
  primary: string;
  /** Secondary accent — sub-headings, command names. */
  secondary?: string;
  /** Tertiary accent — dynamic command segments, less prominent labels. */
  tertiary?: string;
  /** Default body text. */
  text?: string;
  /** Muted text — descriptions, disabled / inactive prompts. */
  muted?: string;
  /** Hyperlink color. */
  link?: string;
  /** Border and divider color. */
  border?: string;
  /** `success` message state. */
  success?: string;
  /** `info` message state. */
  info?: string;
  /** `help` message state. Defaults to {@link info}. */
  help?: string;
  /** `debug` message state. Defaults to {@link muted}. */
  debug?: string;
  /** `warning` message state. */
  warning?: string;
  /** `danger` message state. Defaults to {@link error}. */
  danger?: string;
  /** `error` message state. Defaults to {@link danger}. */
  error?: string;
}

/**
 * The Shell Shock theme document produced for a design system.
 *
 * Either a compact {@link ShellShockPalette} or a full
 * {@link ThemeUserConfig} (anything with `colors`, `borderStyles`, …).
 */
export type ShellShockTheme =
  | (ShellShockPalette & { $theme?: string })
  | (ThemeUserConfig & { name?: string });

/**
 * Map extracted design tokens to one or more Shell Shock theme documents.
 *
 * Return a single theme, an array, or a record keyed by theme id.
 */
export type GenerateShellShockTheme = (
  spec: Schema
) => ShellShockTheme | ShellShockTheme[] | Record<string, ShellShockTheme>;

/**
 * Options for the Razorwind Shell Shock theme generator plugin.
 */
export interface ShellShockPluginOptions {
  /**
   * Directory (relative to the execution cwd) for generated files.
   *
   * @defaultValue `"shell-shock"`
   */
  outputPath?: string;

  /**
   * Map extracted tokens to Shell Shock theme document(s).
   *
   * Required — without a mapping there is nothing to emit. Use
   * {@link inferPalette} inside the mapping for a heuristic starting point.
   */
  mapTheme: GenerateShellShockTheme;

  /**
   * Restrict flattened helper tokens to these DTCG `$type` values.
   * Does not filter what {@link mapTheme} receives.
   */
  includeTypes?: TokenType[];

  /**
   * Also write a `design-system.json` snapshot of the extracted spec, for
   * use with the Shell Shock plugin's `specFile` option.
   *
   * @defaultValue true
   */
  snapshot?: boolean;

  /**
   * Omit component / icon `files[].content` from the snapshot to keep it
   * small. Usage examples are always retained.
   *
   * @defaultValue true
   */
  stripFileContents?: boolean;

  /**
   * Override body for generated `INSTALL.md`.
   */
  installGuide?: string;
}

/**
 * Options describing where the Shell Shock plugin should load the design
 * system from. Exactly one source is used, in this order of precedence:
 * {@link spec}, {@link specFile}, then a `razorwind.config.*` resolved from
 * {@link root}.
 */
export interface DesignSystemSourceOptions {
  /** An already-extracted Razorwind schema. */
  spec?: Schema;
  /**
   * Path to a JSON file containing a Razorwind schema or a snapshot written
   * by the Razorwind Shell Shock plugin (`design-system.json`).
   */
  specFile?: string;
  /**
   * Project root containing a `razorwind.config.*` file. Defaults to the
   * Shell Shock project root.
   */
  root?: string;
  /** Explicit Razorwind config file path (relative to {@link root}). */
  configFile?: string;
  /**
   * Active theme id to use when the token record is multi-theme (`light`,
   * `dark`, …). Defaults to the first non-shared theme.
   */
  themeId?: string;
  /**
   * Additional guideline documents served by the `guidelines` command. A
   * string is treated as a directory of Markdown files; each file's front
   * matter `keywords` (or filename) become the search keywords.
   */
  guidelines?: GuidelineDocument[] | string;
  /**
   * Omit component / icon `files[].content` from the baked snapshot.
   *
   * @defaultValue true
   */
  stripFileContents?: boolean;
}

/**
 * Identifiers of the design-system commands contributed by the Shell Shock
 * plugin. Each becomes an MCP tool through `@shell-shock/plugin-mcp`.
 */
export type DesignSystemCommandId =
  | "search-tokens"
  | "list-tokens"
  | "search-components"
  | "list-components"
  | "search-icons"
  | "list-icons"
  | "search-fonts"
  | "list-fonts"
  | "plan"
  | "guidelines"
  | "analyze-a11y";

/**
 * Options for the Shell Shock plugin exported from
 * `@razorwind/shell-shock/plugin`.
 */
export interface ShellShockDesignSystemPluginOptions extends DesignSystemSourceOptions {
  /**
   * Prefix applied to every contributed command name, for example `"ds"`
   * produces `ds-search-tokens`.
   */
  prefix?: string;
  /**
   * Restrict the contributed commands. Defaults to all commands.
   */
  commands?:
    DesignSystemCommandId[] | Partial<Record<DesignSystemCommandId, boolean>>;
  /**
   * Map the loaded design system to the Shell Shock CLI theme. Defaults to
   * {@link inferPalette} — a heuristic lookup of common token roles.
   */
  mapTheme?: (spec: Schema) => ShellShockTheme;
  /**
   * Explicit theme values merged over the mapped theme (explicit values
   * win). Pass `false` to skip the `@shell-shock/plugin-theme` child plugin
   * and leave the CLI theme untouched.
   */
  theme?: Partial<ThemeUserConfig> | false;
  /**
   * Options for the `@shell-shock/plugin-mcp` child plugin (`command`,
   * `include` / `exclude`, `includeTags` / `excludeTags`). Pass `false` to
   * skip exposing the commands as an MCP server.
   *
   * @remarks
   * The generated MCP server imports `@modelcontextprotocol/server` and
   * `zod` at runtime — add both to the CLI project's dependencies.
   */
  mcp?: McpPluginOptions | false;
}
