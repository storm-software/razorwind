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

import type { ChromeTheme } from "@razorwind/chrome";
import type { CursorTheme } from "@razorwind/cursor";
import type { GhosttyTheme } from "@razorwind/ghostty";
import type { NotepadPlusPlusTheme } from "@razorwind/notepad-plus-plus";
import type { SandpackTheme } from "@razorwind/sandpack";
import type { ShellShockPalette } from "@razorwind/shell-shock";
import type { ShikiTheme } from "@razorwind/shiki";
import type { StorybookTheme } from "@razorwind/storybook";
import type { ThunderbirdTheme } from "@razorwind/thunderbird";
import type { VivaldiTheme } from "@razorwind/vivaldi";
import type { VsCodeTheme } from "@razorwind/vsce";
import type { ZedTheme } from "@razorwind/zed";
import type { ZshTheme } from "@razorwind/zsh";
import type { PresetTheme, ThemeColor } from "./types";

function foreground(color: ThemeColor | undefined): string | undefined {
  return typeof color === "string"
    ? color
    : (color?.foreground ?? color?.background);
}

function background(color: ThemeColor | undefined): string | undefined {
  return typeof color === "string"
    ? color
    : (color?.background ?? color?.foreground);
}

function resolveThemeColors(theme: PresetTheme) {
  const primaryForeground = foreground(theme.primary)!;
  const primaryBackground = background(theme.primary)!;
  const secondaryForeground = foreground(theme.secondary) ?? primaryForeground;
  const secondaryBackground = background(theme.secondary) ?? primaryBackground;

  return {
    primaryForeground,
    primaryBackground,
    secondaryForeground,
    secondaryBackground,
    muted: theme.muted ?? secondaryForeground,
    selectionForeground: foreground(theme.selection) ?? primaryForeground,
    selectionBackground: background(theme.selection) ?? secondaryBackground
  };
}

function colors(theme: PresetTheme): Record<string, string> {
  const color = resolveThemeColors(theme);

  return {
    "editor.background": color.primaryBackground,
    "editor.foreground": color.primaryForeground,
    "editorCursor.foreground": theme.cursor ?? color.primaryForeground,
    "editor.selectionBackground": color.selectionBackground,
    "editorLineNumber.foreground": color.muted,
    focusBorder: color.primaryForeground,
    "panel.border": theme.border ?? color.secondaryForeground,
    "textLink.foreground": color.primaryForeground
  };
}

function tokenColors(theme: PresetTheme) {
  const color = resolveThemeColors(theme);

  return [
    {
      scope: ["comment"],
      settings: { foreground: color.muted, fontStyle: "italic" }
    },
    {
      scope: ["keyword", "storage"],
      settings: { foreground: color.primaryForeground }
    },
    {
      scope: ["entity.name", "support.type"],
      settings: { foreground: color.secondaryForeground }
    },
    {
      scope: ["string", "constant.numeric"],
      settings: {
        foreground: foreground(theme.success) ?? color.primaryForeground
      }
    }
  ];
}

/** Map a shared preset theme to a Chrome extension theme. */
export function mapChromeTheme(theme: PresetTheme): ChromeTheme {
  const primaryForeground = foreground(theme.primary)!;
  const primaryBackground = background(theme.primary)!;
  const secondaryBackground = background(theme.secondary) || primaryBackground;
  const muted = theme.muted || foreground(theme.secondary) || primaryForeground;

  return {
    name: theme.name,
    displayName: theme.displayName,
    colors: {
      frame: primaryBackground,
      frame_inactive: primaryBackground,
      frame_incognito: primaryBackground,
      frame_incognito_inactive: primaryBackground,
      toolbar: secondaryBackground,
      toolbar_button_icon: primaryForeground,
      tab_text: primaryForeground,
      tab_background_text: muted,
      tab_background_text_inactive: muted,
      tab_background_text_incognito: muted,
      tab_background_text_incognito_inactive: muted,
      bookmark_text: primaryForeground,
      omnibox_text: primaryForeground,
      omnibox_background: primaryBackground,
      ntp_background: primaryBackground,
      ntp_text: primaryForeground,
      ntp_link: primaryForeground,
      ntp_header: primaryForeground,
      ntp_section: secondaryBackground,
      button_background: primaryForeground
    }
  };
}

/** Map a shared preset theme to a Cursor color theme. */
export function mapCursorTheme(theme: PresetTheme): CursorTheme {
  return {
    name: theme.name,
    displayName: theme.displayName,
    type: theme.appearance,
    colors: colors(theme),
    tokenColors: tokenColors(theme)
  };
}

/** Map a shared preset theme to a Ghostty terminal theme. */
export function mapGhosttyTheme(theme: PresetTheme): GhosttyTheme {
  const color = resolveThemeColors(theme);

  return {
    name: theme.name,
    displayName: theme.displayName,
    palette: {
      0: color.primaryBackground,
      1: foreground(theme.error) ?? color.primaryForeground,
      2: foreground(theme.success) ?? color.primaryForeground,
      3: foreground(theme.warning) ?? color.secondaryForeground,
      4: color.primaryForeground,
      5: color.secondaryForeground,
      6: color.muted,
      7: color.primaryForeground
    },
    background: color.primaryBackground,
    foreground: color.primaryForeground,
    cursorColor: theme.cursor ?? color.primaryForeground,
    cursorText: color.primaryBackground,
    selectionForeground: color.selectionForeground,
    selectionBackground: color.selectionBackground
  };
}

/** Map a shared preset theme to a Notepad++ XML theme. */
export function mapNotepadPlusPlusTheme(
  theme: PresetTheme
): NotepadPlusPlusTheme {
  const color = resolveThemeColors(theme);

  return {
    name: theme.name,
    displayName: theme.displayName,
    globalStyles: [
      {
        name: "Default Style",
        styleID: 32,
        fgColor: color.primaryForeground,
        bgColor: color.primaryBackground,
        fontName: theme.fontCode,
        fontSize: theme.fontSize
      },
      {
        name: "Caret colour",
        styleID: 2069,
        fgColor: theme.cursor ?? color.primaryForeground
      },
      {
        name: "Selected text colour",
        styleID: 0,
        fgColor: color.selectionForeground,
        bgColor: color.selectionBackground
      }
    ],
    lexerStyles: [
      {
        name: "default",
        wordsStyles: [
          {
            name: "DEFAULT",
            styleID: 0,
            fgColor: color.primaryForeground,
            bgColor: color.primaryBackground
          },
          {
            name: "COMMENT",
            styleID: 1,
            fgColor: color.muted,
            bgColor: color.primaryBackground
          },
          {
            name: "STRING",
            styleID: 2,
            fgColor: foreground(theme.success) ?? color.primaryForeground,
            bgColor: color.primaryBackground
          }
        ]
      }
    ]
  };
}

/** Map a shared preset theme to a Sandpack theme. */
export function mapSandpackTheme(theme: PresetTheme): SandpackTheme {
  const color = resolveThemeColors(theme);

  return {
    name: theme.name,
    displayName: theme.displayName,
    colors: {
      surface1: color.primaryBackground,
      surface2: color.secondaryBackground,
      surface3: color.selectionBackground,
      disabled: theme.muted,
      base: color.primaryForeground,
      clickable: color.primaryForeground,
      hover: color.secondaryForeground,
      accent: color.primaryForeground,
      error: foreground(theme.error),
      errorSurface: background(theme.error),
      warning: foreground(theme.warning),
      warningSurface: background(theme.warning)
    },
    syntax: {
      plain: color.primaryForeground,
      comment: { color: color.muted, fontStyle: "italic" },
      keyword: color.primaryForeground,
      definition: color.secondaryForeground,
      string: foreground(theme.success) ?? color.primaryForeground
    },
    font: {
      body: theme.fontBase,
      mono: theme.fontCode,
      size: theme.fontSize,
      lineHeight: theme.lineHeight
    }
  };
}

/** Map a shared preset theme to a Shiki / TextMate theme. */
export function mapShikiTheme(theme: PresetTheme): ShikiTheme {
  const color = resolveThemeColors(theme);

  return {
    name: theme.name,
    displayName: theme.displayName,
    type: theme.appearance,
    bg: color.primaryBackground,
    fg: color.primaryForeground,
    colors: colors(theme),
    settings: tokenColors(theme)
  };
}

/** Map a shared preset theme to Storybook's UI theme object. */
export function mapStorybookTheme(theme: PresetTheme): StorybookTheme {
  const color = resolveThemeColors(theme);

  return {
    base: theme.appearance,
    colorPrimary: color.primaryForeground,
    colorSecondary: color.secondaryForeground,
    appBg: color.primaryBackground,
    appContentBg: color.primaryBackground,
    appHoverBg: color.selectionBackground,
    appPreviewBg: color.primaryBackground,
    appBorderColor: theme.border ?? color.secondaryForeground,
    fontBase: theme.fontBase,
    fontCode: theme.fontCode,
    textColor: color.primaryForeground,
    textInverseColor: color.primaryBackground,
    textMutedColor: color.muted,
    barTextColor: color.primaryForeground,
    barHoverColor: color.primaryForeground,
    barSelectedColor: color.primaryForeground,
    barBg: color.primaryBackground,
    buttonBg: color.secondaryBackground,
    buttonBorder: theme.border ?? color.secondaryForeground,
    inputBg: color.primaryBackground,
    inputBorder: theme.border ?? color.secondaryForeground,
    inputTextColor: color.primaryForeground,
    brandTitle: theme.displayName ?? theme.name
  };
}

/** Map a shared preset theme to a Thunderbird extension theme. */
export function mapThunderbirdTheme(theme: PresetTheme): ThunderbirdTheme {
  const color = resolveThemeColors(theme);

  return {
    name: theme.name,
    displayName: theme.displayName,
    gecko: {
      id: `${theme.name.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}@razorwind`
    },
    colors: {
      button_background_active: color.secondaryBackground,
      button_background_hover: color.muted,
      frame: color.primaryBackground,
      icons: color.primaryForeground,
      icons_attention: color.primaryForeground,
      ntp_background: color.primaryBackground,
      ntp_text: color.primaryForeground,
      popup: color.primaryBackground,
      popup_border: theme.border ?? color.primaryForeground,
      popup_highlight: color.secondaryBackground,
      popup_highlight_text: color.primaryForeground,
      popup_text: color.primaryForeground,
      sidebar: color.primaryBackground,
      sidebar_border: theme.border ?? color.muted,
      sidebar_highlight: color.secondaryBackground,
      sidebar_highlight_text: color.primaryForeground,
      sidebar_text: color.primaryForeground,
      tab_background_separator: theme.border ?? color.muted,
      tab_background_text: color.muted,
      tab_line: color.primaryForeground,
      tab_loading: color.primaryForeground,
      tab_selected: color.secondaryBackground,
      tab_text: color.primaryForeground,
      toolbar: color.secondaryBackground,
      toolbar_bottom_separator: theme.border ?? color.muted,
      toolbar_field: color.primaryBackground,
      toolbar_field_border: theme.border ?? color.muted,
      toolbar_field_border_focus: color.primaryForeground,
      toolbar_field_highlight: color.secondaryBackground,
      toolbar_field_highlight_text: color.primaryForeground,
      toolbar_field_separator: theme.border ?? color.muted,
      toolbar_field_text: color.primaryForeground,
      toolbar_text: color.primaryForeground,
      toolbar_top_separator: theme.border ?? color.muted,
      toolbar_vertical_separator: theme.border ?? color.muted
    }
  };
}

/** Map a shared preset theme to a Vivaldi theme. */
export function mapVivaldiTheme(theme: PresetTheme): VivaldiTheme {
  const color = resolveThemeColors(theme);

  return {
    name: theme.name,
    displayName: theme.displayName,
    colorBg: color.primaryBackground,
    colorFg: color.primaryForeground,
    colorAccentBg: color.secondaryBackground,
    colorHighlightBg: color.selectionBackground,
    colorWindowBg: theme.border ?? color.secondaryBackground
  };
}

/** Map a shared preset theme to a VS Code extension theme. */
export function mapVsceTheme(theme: PresetTheme): VsCodeTheme {
  return {
    name: theme.name,
    displayName: theme.displayName,
    type: theme.appearance,
    colors: colors(theme),
    tokenColors: tokenColors(theme)
  };
}

/** Map a shared preset theme to a Zed theme collection. */
export function mapZedTheme(theme: PresetTheme): ZedTheme {
  const color = resolveThemeColors(theme);

  return {
    name: theme.name,
    themes: [
      {
        name: theme.displayName ?? theme.name,
        appearance: theme.appearance,
        style: {
          "editor.background": color.primaryBackground,
          "editor.foreground": color.primaryForeground,
          "editor.selection": color.selectionBackground,
          "editor.cursor": theme.cursor ?? color.primaryForeground,
          syntax: {
            comment: { color: color.muted, font_style: "italic" },
            keyword: { color: color.primaryForeground },
            string: {
              color: foreground(theme.success) ?? color.primaryForeground
            }
          }
        }
      }
    ]
  };
}

/** Map a shared preset theme to a Shell Shock CLI theme palette. */
export function mapShellShockTheme(theme: PresetTheme): ShellShockPalette {
  const color = resolveThemeColors(theme);
  const danger = foreground(theme.error);

  return {
    name: theme.name,
    primary: color.primaryForeground,
    secondary: color.secondaryForeground,
    text: color.primaryForeground,
    muted: color.muted,
    border: theme.border ?? color.muted,
    link: color.primaryForeground,
    success: foreground(theme.success),
    warning: foreground(theme.warning),
    danger,
    error: danger
  };
}

/** Map a shared preset theme to an Oh My Zsh prompt theme. */
export function mapZshTheme(theme: PresetTheme): ZshTheme {
  const color = resolveThemeColors(theme);

  return {
    name: theme.name,
    displayName: theme.displayName,
    colors: {
      success: foreground(theme.success) ?? color.primaryForeground,
      error: foreground(theme.error) ?? color.primaryForeground,
      warning: foreground(theme.warning) ?? color.secondaryForeground,
      time: foreground(theme.success) ?? color.primaryForeground,
      context: color.secondaryForeground,
      directory: color.primaryForeground,
      custom: foreground(theme.warning) ?? color.secondaryForeground,
      git: color.muted,
      gitClean: foreground(theme.success) ?? color.primaryForeground,
      gitDirty: foreground(theme.warning) ?? color.secondaryForeground
    }
  };
}
