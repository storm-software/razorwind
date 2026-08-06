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
import type { Tokens } from "@razorwind/core/schema";

/**
 * A flattened design token ready for Oh My Zsh theme mapping.
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
 * Prompt segment colors for a generated Oh My Zsh theme.
 *
 * Values should be CSS hex (`#rrggbb`) or Zsh named/256 colors. Hex is written
 * as `%F{#rrggbb}` (truecolor), matching modern Zsh prompt styling used by
 * themes such as [Dracula for Zsh](https://draculatheme.com/zsh).
 *
 * @see https://draculatheme.com/zsh
 * @see https://zsh.sourceforge.io/Doc/Release/Prompt-Expansion.html
 */
export interface ZshThemeColors {
  /** Arrow when last command succeeded (Dracula: green). */
  success?: string;
  /** Arrow when last command failed (Dracula: red). */
  error?: string;
  /** Vi command mode / dirty git accent (Dracula: yellow). */
  warning?: string;
  /** Time segment (Dracula: green). */
  time?: string;
  /** Username / host context (Dracula: magenta). */
  context?: string;
  /** Working directory (Dracula: blue). */
  directory?: string;
  /** Custom variable segment (Dracula: yellow). */
  custom?: string;
  /** Git branch prefix (Dracula: cyan). */
  git?: string;
  /** Git clean indicator (Dracula: green). */
  gitClean?: string;
  /** Git dirty indicator (Dracula: yellow). */
  gitDirty?: string;
}

/**
 * Oh My Zsh theme document — rendered to a `*.zsh-theme` script.
 *
 * Segment layout follows the Dracula Zsh theme (arrow, optional time/context,
 * directory, git via `$(git_prompt_info)`). Override `prompt` / `rprompt` for
 * a fully custom prompt string.
 *
 * @see https://draculatheme.com/zsh
 * @see https://github.com/ohmyzsh/ohmyzsh/wiki/Customization#overriding-and-adding-themes
 */
export interface ZshTheme {
  /**
   * Theme id — becomes the `*.zsh-theme` basename and `ZSH_THEME` value.
   * Prefer lowercase with hyphens (e.g. `my-theme`).
   */
  name: string;
  /** Human-readable label for INSTALL.md. Defaults to {@link name}. */
  displayName?: string;
  /** Prompt segment colors. Unset keys fall back to Dracula-inspired defaults. */
  colors?: ZshThemeColors;
  /**
   * Arrow / prompt marker.
   *
   * @defaultValue `"➜ "`
   */
  arrowIcon?: string;
  /**
   * Full left `PROMPT` override. When set, segment builders are skipped
   * (git prompt vars still emit unless you clear them).
   */
  prompt?: string;
  /** Optional right prompt (`RPROMPT`). */
  rprompt?: string;
  /**
   * Show git status via Oh My Zsh `git_prompt_info`.
   *
   * @defaultValue `true`
   */
  displayGit?: boolean;
  /**
   * Show the time segment.
   *
   * @defaultValue `false`
   */
  displayTime?: boolean;
  /**
   * Show username (and host when SSH / root).
   *
   * @defaultValue `false`
   */
  displayContext?: boolean;
  /**
   * Use `%~` (full path under home) instead of `%c` (tail only).
   *
   * @defaultValue `false`
   */
  displayFullCwd?: boolean;
  /**
   * Put the arrow / command input on a new line.
   *
   * @defaultValue `false`
   */
  displayNewLine?: boolean;
  /**
   * When {@link displayFullCwd} is on, trim to this many path segments
   * (`%N~`). `0` = no trim.
   *
   * @defaultValue `0`
   */
  dirTrim?: number;
  /**
   * `strftime`-style time format for `%D{...}`.
   *
   * @defaultValue `"%-H:%M"`
   */
  timeFormat?: string;
  /** Override `ZSH_THEME_GIT_PROMPT_PREFIX`. */
  gitPromptPrefix?: string;
  /** Override `ZSH_THEME_GIT_PROMPT_SUFFIX`. */
  gitPromptSuffix?: string;
  /** Override `ZSH_THEME_GIT_PROMPT_CLEAN`. */
  gitPromptClean?: string;
  /** Override `ZSH_THEME_GIT_PROMPT_DIRTY`. */
  gitPromptDirty?: string;
  /** Extra shell appended after the generated theme body. */
  extra?: string;
}

/**
 * Map extracted design tokens to one or more Oh My Zsh theme documents.
 *
 * Return a single theme, an array, or a record keyed by theme id.
 */
export type GenerateZshTheme = (
  tokens: Tokens | Record<string, Tokens>
) => ZshTheme | ZshTheme[] | Record<string, ZshTheme>;

/**
 * Options for the Razorwind Oh My Zsh theme generator.
 *
 * @see https://draculatheme.com/zsh
 */
export interface ZshPluginOptions {
  /**
   * Directory (relative to the execution cwd) for generated theme files.
   *
   * @defaultValue `"zsh-themes"`
   */
  outputPath?: string;

  /**
   * Map extracted tokens to Oh My Zsh theme document(s).
   *
   * Required — without a mapping there is nothing to emit.
   */
  mapTheme: GenerateZshTheme;

  /**
   * Override body for generated `INSTALL.md`. When omitted, Oh My Zsh install
   * steps are written (copy into themes dir, set `ZSH_THEME`).
   *
   * @see https://draculatheme.com/zsh
   */
  installGuide?: string;

  /**
   * Restrict flattened helper tokens to these DTCG `$type` values.
   * Does not filter what {@link mapTheme} receives.
   */
  includeTypes?: TokenType[];
}
