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

import type { GeneratorFunctionResult } from "@power-plant/core";
import type { Schema } from "@razorwind/core/schema";
import { createDocument, isObject, slugifyThemeName } from "@razorwind/core/utils";
import { join } from "node:path";
import { renderInstallMd, themeDisplayName } from "./install";
import type { ZshPluginOptions, ZshTheme, ZshThemeColors } from "./types";

const PLUGIN_META = { name: "razorwind-zsh" } as const;

/** Dracula-inspired defaults when mapTheme omits a segment color. */
const DEFAULT_COLORS: Required<ZshThemeColors> = {
  success: "#50fa7b",
  error: "#ff5555",
  warning: "#f1fa8c",
  time: "#50fa7b",
  context: "#ff79c6",
  directory: "#bd93f9",
  custom: "#f1fa8c",
  git: "#8be9fd",
  gitClean: "#50fa7b",
  gitDirty: "#f1fa8c"
};

function document(
  path: string,
  content: string,
  language?: string
): GeneratorFunctionResult<Schema, ZshPluginOptions>[string] {
  return createDocument<Schema, ZshPluginOptions>(
    path,
    content,
    PLUGIN_META,
    language
  );
}

function isZshTheme(value: unknown): value is ZshTheme {
  return (
    isObject(value) && typeof value.name === "string" && value.name.length > 0
  );
}

/**
 * Normalize {@link ZshPluginOptions.mapTheme} results into a theme list.
 */
export function normalizeThemes(
  result: ZshTheme | ZshTheme[] | Record<string, ZshTheme>
): ZshTheme[] {
  if (Array.isArray(result)) {
    return result.map((theme, index) => {
      if (!isZshTheme(theme)) {
        throw new TypeError(
          `@razorwind/zsh mapTheme()[${index}] must be a ZshTheme with name`
        );
      }
      return theme;
    });
  }

  if (isZshTheme(result)) {
    return [result];
  }

  if (!isObject(result)) {
    throw new TypeError(
      "@razorwind/zsh mapTheme() must return a theme, theme array, or theme record"
    );
  }

  return Object.entries(result).map(([key, theme]) => {
    if (!isZshTheme(theme)) {
      throw new TypeError(
        `@razorwind/zsh mapTheme()["${key}"] must be a ZshTheme with name`
      );
    }
    return {
      ...theme,
      name: theme.name || key
    };
  });
}

function assertOptions(
  options: ZshPluginOptions
): asserts options is ZshPluginOptions & {
  mapTheme: NonNullable<ZshPluginOptions["mapTheme"]>;
} {
  if (!options.mapTheme) {
    throw new Error("@razorwind/zsh requires options.mapTheme");
  }
}

function resolveColors(colors?: ZshThemeColors): Required<ZshThemeColors> {
  return {
    success: colors?.success ?? DEFAULT_COLORS.success,
    error: colors?.error ?? DEFAULT_COLORS.error,
    warning: colors?.warning ?? DEFAULT_COLORS.warning,
    time: colors?.time ?? DEFAULT_COLORS.time,
    context: colors?.context ?? DEFAULT_COLORS.context,
    directory: colors?.directory ?? DEFAULT_COLORS.directory,
    custom: colors?.custom ?? DEFAULT_COLORS.custom,
    git: colors?.git ?? DEFAULT_COLORS.git,
    gitClean: colors?.gitClean ?? DEFAULT_COLORS.gitClean,
    gitDirty: colors?.gitDirty ?? DEFAULT_COLORS.gitDirty
  };
}

/**
 * Format a color for Zsh `%F{...}` — hex keeps `#`, named/256 pass through.
 */
export function toZshFg(color: string): string {
  const trimmed = color.trim();
  if (trimmed.startsWith("#")) {
    return trimmed.toLowerCase();
  }
  return trimmed;
}

function shellSingleQuote(value: string): string {
  return `'${value.replaceAll("'", `'\"'\"'`)}'`;
}

function boolDefault(value: boolean | undefined, fallback: boolean): "0" | "1" {
  return (value ?? fallback) ? "1" : "0";
}

/**
 * Serialize an Oh My Zsh `*.zsh-theme` script.
 *
 * Segment layout follows [Dracula for Zsh](https://draculatheme.com/zsh):
 * status arrow, optional time/context, directory, custom var, git via
 * Oh My Zsh `git_prompt_info` (no async lib required).
 *
 * @see https://draculatheme.com/zsh
 */
export function renderZshTheme(theme: ZshTheme): string {
  const colors = resolveColors(theme.colors);
  const label = themeDisplayName(theme);
  const arrowIcon = theme.arrowIcon ?? "➜ ";
  const timeFormat = theme.timeFormat ?? "%-H:%M";
  const dirTrim = theme.dirTrim ?? 0;
  const displayGit = boolDefault(theme.displayGit, true);
  const displayTime = boolDefault(theme.displayTime, false);
  const displayContext = boolDefault(theme.displayContext, false);
  const displayFullCwd = boolDefault(theme.displayFullCwd, false);
  const displayNewLine = boolDefault(theme.displayNewLine, false);

  const success = toZshFg(colors.success);
  const error = toZshFg(colors.error);
  const warning = toZshFg(colors.warning);
  const time = toZshFg(colors.time);
  const context = toZshFg(colors.context);
  const directory = toZshFg(colors.directory);
  const custom = toZshFg(colors.custom);
  const git = toZshFg(colors.git);
  const gitClean = toZshFg(colors.gitClean);
  const gitDirty = toZshFg(colors.gitDirty);

  const gitPrefix =
    theme.gitPromptPrefix ?? `%F{${git}}%B(`;
  const gitSuffix = theme.gitPromptSuffix ?? "%f%b";
  const gitCleanStr =
    theme.gitPromptClean ?? `) %F{${gitClean}}%B✓ `;
  const gitDirtyStr =
    theme.gitPromptDirty ?? `) %F{${gitDirty}}%B✗ `;

  const lines: string[] = [
    "# -*- mode: sh; -*-",
    "# vim: set ft=sh :",
    `# ${label} — generated by @razorwind/zsh`,
    "#",
    "# Oh My Zsh theme. Segment layout inspired by Dracula for Zsh:",
    "# https://draculatheme.com/zsh",
    "#",
    "",
    "setopt PROMPT_SUBST",
    ""
  ];

  if (theme.prompt !== undefined) {
    lines.push(`PROMPT=${shellSingleQuote(theme.prompt)}`, "");
  } else {
    lines.push(
      "# Configuration (override in ~/.zshrc before the theme loads)",
      `RW_ZSH_DISPLAY_GIT=\${RW_ZSH_DISPLAY_GIT:-${displayGit}}`,
      `RW_ZSH_DISPLAY_TIME=\${RW_ZSH_DISPLAY_TIME:-${displayTime}}`,
      `RW_ZSH_DISPLAY_CONTEXT=\${RW_ZSH_DISPLAY_CONTEXT:-${displayContext}}`,
      `RW_ZSH_DISPLAY_FULL_CWD=\${RW_ZSH_DISPLAY_FULL_CWD:-${displayFullCwd}}`,
      `RW_ZSH_DIR_TRIM=\${RW_ZSH_DIR_TRIM:-${dirTrim}}`,
      `RW_ZSH_DISPLAY_NEW_LINE=\${RW_ZSH_DISPLAY_NEW_LINE:-${displayNewLine}}`,
      `RW_ZSH_ARROW_ICON=\${RW_ZSH_ARROW_ICON:-${shellSingleQuote(arrowIcon)}}`,
      `RW_ZSH_TIME_FORMAT=\${RW_ZSH_TIME_FORMAT:-${shellSingleQuote(timeFormat)}}`,
      "",
      "rw_zsh_arrow() {",
      '  if [[ "$1" = "start" ]] && (( ! RW_ZSH_DISPLAY_NEW_LINE )); then',
      '    print -P -- "$RW_ZSH_ARROW_ICON"',
      '  elif [[ "$1" = "end" ]] && (( RW_ZSH_DISPLAY_NEW_LINE )); then',
      '    print -P -- "\\n$RW_ZSH_ARROW_ICON"',
      "  fi",
      "}",
      "",
      "rw_zsh_time_segment() {",
      "  if (( RW_ZSH_DISPLAY_TIME )); then",
      '    print -P "%D{$RW_ZSH_TIME_FORMAT} "',
      "  fi",
      "}",
      "",
      "rw_zsh_context() {",
      "  if (( RW_ZSH_DISPLAY_CONTEXT )); then",
      '    if [[ -n "${SSH_CONNECTION-}${SSH_CLIENT-}${SSH_TTY-}" ]] || (( EUID == 0 )); then',
      "      print -- '%n@%m '",
      "    else",
      "      print -- '%n '",
      "    fi",
      "  fi",
      "}",
      "",
      "rw_zsh_directory() {",
      "  if (( RW_ZSH_DISPLAY_FULL_CWD )); then",
      '    print -P "%${RW_ZSH_DIR_TRIM}~ "',
      "  else",
      "    print -P '%c '",
      "  fi",
      "}",
      "",
      "rw_zsh_custom_variable() {",
      '  [[ -z "$RW_ZSH_CUSTOM_VARIABLE" ]] && return',
      `  print -- "%F{${custom}}$RW_ZSH_CUSTOM_VARIABLE "`,
      "}",
      "",
      "rw_zsh_git_info() {",
      "  (( ! RW_ZSH_DISPLAY_GIT )) && return",
      '  print -P -- "$(git_prompt_info)"',
      "}",
      "",
      "PROMPT=''",
      `# Status arrow — success=${success}, error=${error}, vi-cmd=${warning}`,
      `PROMPT+='%(?:%F{${success}}:%F{${error}})%B$(rw_zsh_arrow start)'`,
      `PROMPT+='%F{${time}}%B$(rw_zsh_time_segment)'`,
      `PROMPT+='%F{${context}}%B$(rw_zsh_context)'`,
      `PROMPT+='%F{${directory}}%B$(rw_zsh_directory)'`,
      "PROMPT+='$(rw_zsh_custom_variable)'",
      "PROMPT+='$(rw_zsh_git_info)'",
      `PROMPT+='%(?:%F{${success}}:%F{${error}})%B$(rw_zsh_arrow end)'`,
      "PROMPT+='%f%b'",
      ""
    );
  }

  if (theme.rprompt !== undefined) {
    lines.push(`RPROMPT=${shellSingleQuote(theme.rprompt)}`, "");
  }

  lines.push(
    `ZSH_THEME_GIT_PROMPT_PREFIX=${shellSingleQuote(gitPrefix)}`,
    `ZSH_THEME_GIT_PROMPT_SUFFIX=${shellSingleQuote(gitSuffix)}`,
    `ZSH_THEME_GIT_PROMPT_CLEAN=${shellSingleQuote(gitCleanStr)}`,
    `ZSH_THEME_GIT_PROMPT_DIRTY=${shellSingleQuote(gitDirtyStr)}`,
    ""
  );

  if (theme.extra) {
    lines.push(theme.extra.replace(/\n$/, ""), "");
  }

  return `${lines.join("\n")}\n`;
}

export { renderInstallMd };

/**
 * Generate Oh My Zsh `*.zsh-theme` files (plus INSTALL.md) from a Razorwind schema.
 *
 * @see https://draculatheme.com/zsh
 */
export function generateZshTheme(
  spec: Schema,
  options: ZshPluginOptions
): GeneratorFunctionResult<Schema, ZshPluginOptions> {
  assertOptions(options);

  const outputPath = options.outputPath ?? "zsh-themes";
  const themes = normalizeThemes(options.mapTheme(spec.tokens));

  if (themes.length === 0) {
    throw new Error("@razorwind/zsh mapTheme() returned no themes");
  }

  const documents: GeneratorFunctionResult<Schema, ZshPluginOptions> = {};
  const usedSlugs = new Set<string>();
  const themeMeta: Array<{
    name: string;
    displayName: string;
    fileName: string;
  }> = [];

  for (const theme of themes) {
    let slug = slugifyThemeName(theme.name);
    if (!slug) {
      throw new TypeError(
        `@razorwind/zsh theme name "${theme.name}" slugifies to an empty string`
      );
    }
    if (usedSlugs.has(slug)) {
      let suffix = 2;
      while (usedSlugs.has(`${slugifyThemeName(theme.name)}-${suffix}`)) {
        suffix += 1;
      }
      slug = `${slugifyThemeName(theme.name)}-${suffix}`;
    }
    usedSlugs.add(slug);

    const fileName = `${slug}.zsh-theme`;
    const themePath = join(outputPath, fileName);
    documents[themePath] = document(
      themePath,
      renderZshTheme({ ...theme, name: slug }),
      "shellscript"
    );
    themeMeta.push({
      name: slug,
      displayName: themeDisplayName(theme),
      fileName
    });
  }

  const installBody =
    options.installGuide ?? renderInstallMd({ themes: themeMeta });
  const installPath = join(outputPath, "INSTALL.md");
  documents[installPath] = document(installPath, installBody, "markdown");

  return documents;
}
