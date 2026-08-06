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
 * A flattened design token ready for Notepad++ theme mapping.
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
 * Syntax style for a lexer token (`WordsStyle` in theme XML).
 *
 * @see https://npp-user-manual.org/docs/config-files/
 */
export interface NppWordsStyle {
  name: string;
  styleID: number | string;
  fgColor?: string;
  bgColor?: string;
  fontName?: string;
  fontStyle?: number | string;
  fontSize?: string | number;
  /**
   * Background inheritance mode (`0` = use fg/bg, `1` = inherit default bg).
   *
   * @see https://github.com/notepad-plus-plus/nppThemes/
   */
  colorStyle?: number | string;
  keywordClass?: string;
}

/**
 * Language lexer block (`LexerType` in theme XML).
 */
export interface NppLexerStyle {
  /** Lexer id (e.g. `cpp`, `xml`). */
  name: string;
  /** Human-readable label shown in Style Configurator. */
  desc?: string;
  /** File extensions associated with the lexer. */
  ext?: string;
  wordsStyles: NppWordsStyle[];
}

/**
 * Global / UI style (`WidgetStyle` under `GlobalStyles`).
 */
export interface NppWidgetStyle {
  name: string;
  styleID: number | string;
  fgColor?: string;
  bgColor?: string;
  fontName?: string;
  fontStyle?: number | string;
  fontSize?: string | number;
  colorStyle?: number | string;
}

/**
 * Notepad++ theme document — rendered to a UTF-8 `*.xml` theme file.
 *
 * Themes are XML documents rooted at `NotepadPlus` with `LexerStyles` and
 * `GlobalStyles` sections, matching [Dracula for Notepad++](https://draculatheme.com/notepad-plus-plus).
 *
 * @see https://npp-user-manual.org/docs/themes/
 * @see https://draculatheme.com/notepad-plus-plus
 */
export interface NotepadPlusPlusTheme {
  /**
   * Theme id — becomes the `*.xml` basename (e.g. `Dracula` → `Dracula.xml`).
   */
  name: string;
  /** Theme label for INSTALL.md. Defaults to {@link name}. */
  displayName?: string;
  author?: string;
  date?: string;
  license?: string;
  description?: string;
  /** Extra XML comments inserted after the XML declaration. */
  comments?: string[];
  /** Per-language syntax styles. */
  lexerStyles?: NppLexerStyle[];
  /** Global editor / UI styles (`GlobalStyles`). */
  globalStyles?: NppWidgetStyle[];
  /**
   * Inner XML body (inside `NotepadPlus`). When set, structured
   * {@link lexerStyles} / {@link globalStyles} are ignored.
   */
  body?: string;
  /** Complete XML document override (skips structured render entirely). */
  xml?: string;
}

/**
 * Map extracted design tokens to one or more Notepad++ theme documents.
 */
export type GenerateNotepadPlusPlusTheme = (
  tokens: Tokens | Record<string, Tokens>
) =>
  | NotepadPlusPlusTheme
  | NotepadPlusPlusTheme[]
  | Record<string, NotepadPlusPlusTheme>;

/**
 * Options for the Razorwind Notepad++ theme generator.
 *
 * @see https://draculatheme.com/notepad-plus-plus
 */
export interface NotepadPlusPlusPluginOptions {
  /**
   * Directory (relative to the execution cwd) for generated theme files.
   *
   * @defaultValue `"notepad-plus-plus-themes"`
   */
  outputPath?: string;

  /**
   * Map extracted tokens to Notepad++ theme document(s).
   *
   * Required — without a mapping there is nothing to emit.
   */
  mapTheme: GenerateNotepadPlusPlusTheme;

  /**
   * Override body for generated `INSTALL.md`. When omitted, Notepad++ install
   * steps are written (copy into `%AppData%\\Notepad++\\themes`, activate).
   *
   * @see https://draculatheme.com/notepad-plus-plus
   */
  installGuide?: string;

  /**
   * Restrict flattened helper tokens to these DTCG `$type` values.
   * Does not filter what {@link mapTheme} receives.
   */
  includeTypes?: TokenType[];
}
