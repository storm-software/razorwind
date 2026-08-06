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
import { createDocument, isObject } from "@razorwind/core/utils";
import { join } from "node:path";
import { renderInstallMd, themeDisplayName } from "./install";
import type {
  NppLexerStyle,
  NppWidgetStyle,
  NppWordsStyle,
  NotepadPlusPlusPluginOptions,
  NotepadPlusPlusTheme
} from "./types";

const PLUGIN_META = { name: "razorwind-notepad-plus-plus" } as const;
const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8" ?>';

function document(
  path: string,
  content: string,
  language?: string
): GeneratorFunctionResult<Schema, NotepadPlusPlusPluginOptions>[string] {
  return createDocument<Schema, NotepadPlusPlusPluginOptions>(
    path,
    content,
    PLUGIN_META,
    language
  );
}

function slugifyThemeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");
}

function isNotepadPlusPlusTheme(value: unknown): value is NotepadPlusPlusTheme {
  return (
    isObject(value) && typeof value.name === "string" && value.name.length > 0
  );
}

export function normalizeThemes(
  result:
    | NotepadPlusPlusTheme
    | NotepadPlusPlusTheme[]
    | Record<string, NotepadPlusPlusTheme>
): NotepadPlusPlusTheme[] {
  if (Array.isArray(result)) {
    return result.map((theme, index) => {
      if (!isNotepadPlusPlusTheme(theme)) {
        throw new TypeError(
          `@razorwind/notepad-plus-plus mapTheme()[${index}] must be a NotepadPlusPlusTheme with name`
        );
      }
      return theme;
    });
  }

  if (isNotepadPlusPlusTheme(result)) {
    return [result];
  }

  if (!isObject(result)) {
    throw new TypeError(
      "@razorwind/notepad-plus-plus mapTheme() must return a theme, theme array, or theme record"
    );
  }

  return Object.entries(result).map(([key, theme]) => {
    if (!isNotepadPlusPlusTheme(theme)) {
      throw new TypeError(
        `@razorwind/notepad-plus-plus mapTheme()["${key}"] must be a NotepadPlusPlusTheme with name`
      );
    }
    return {
      ...theme,
      name: theme.name || key
    };
  });
}

function assertOptions(
  options: NotepadPlusPlusPluginOptions
): asserts options is NotepadPlusPlusPluginOptions & {
  mapTheme: NonNullable<NotepadPlusPlusPluginOptions["mapTheme"]>;
} {
  if (!options.mapTheme) {
    throw new Error("@razorwind/notepad-plus-plus requires options.mapTheme");
  }
}

/**
 * Normalize a color for Notepad++ theme XML (`RRGGBB`, no `#`).
 *
 * @see https://draculatheme.com/notepad-plus-plus
 */
export function toNppColor(color: string): string {
  const trimmed = color.trim();
  if (trimmed.startsWith("#")) {
    const hex = trimmed.slice(1);
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
      throw new TypeError(`Invalid Notepad++ color: ${color}`);
    }
    return hex.toUpperCase();
  }
  if (/^[0-9a-fA-F]{6}$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }
  throw new TypeError(`Invalid Notepad++ color: ${color}`);
}

function escapeXmlAttr(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function maybeNppColor(color: string | undefined): string | undefined {
  if (color === undefined || color === "") {
    return undefined;
  }
  return toNppColor(color);
}

function renderAttrs(
  attrs: Record<string, string | number | undefined>
): string {
  return Object.entries(attrs)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => ` ${key}="${escapeXmlAttr(String(value))}"`)
    .join("");
}

function renderCommentBlock(lines: string[], indent = ""): string[] {
  return lines.map(line => `${indent}<!-- ${line} -->`);
}

function renderWordsStyle(style: NppWordsStyle, indent: string): string {
  const attrs = renderAttrs({
    name: style.name,
    styleID: style.styleID,
    fgColor: maybeNppColor(style.fgColor),
    bgColor: maybeNppColor(style.bgColor),
    fontName: style.fontName ?? "",
    fontStyle: style.fontStyle ?? "0",
    fontSize: style.fontSize ?? "",
    colorStyle: style.colorStyle,
    keywordClass: style.keywordClass
  });
  return `${indent}<WordsStyle${attrs} />`;
}

function renderLexerType(lexer: NppLexerStyle, indent: string): string[] {
  const attrs = renderAttrs({
    name: lexer.name,
    desc: lexer.desc,
    ext: lexer.ext ?? ""
  });
  const lines = [`${indent}<LexerType${attrs}>`];
  for (const style of lexer.wordsStyles) {
    lines.push(renderWordsStyle(style, `${indent}    `));
  }
  lines.push(`${indent}</LexerType>`);
  return lines;
}

function renderWidgetStyle(style: NppWidgetStyle, indent: string): string {
  const attrs = renderAttrs({
    name: style.name,
    styleID: style.styleID,
    fgColor: maybeNppColor(style.fgColor),
    bgColor: maybeNppColor(style.bgColor),
    fontName: style.fontName ?? "",
    fontStyle: style.fontStyle,
    fontSize: style.fontSize ?? "",
    colorStyle: style.colorStyle
  });
  return `${indent}<WidgetStyle${attrs}></WidgetStyle>`;
}

function hasStructuredContent(theme: NotepadPlusPlusTheme): boolean {
  return Boolean(
    theme.body ||
    (theme.lexerStyles && theme.lexerStyles.length > 0) ||
    (theme.globalStyles && theme.globalStyles.length > 0)
  );
}

function renderThemeComments(theme: NotepadPlusPlusTheme): string[] {
  const label = themeDisplayName(theme);
  const lines = [
    label,
    ...(theme.description ? [theme.description] : []),
    ...(theme.author ? [`Author: ${theme.author}`] : []),
    ...(theme.date ? [`Date: ${theme.date}`] : []),
    ...(theme.license ? [`License: ${theme.license}`] : []),
    "Generated by @razorwind/notepad-plus-plus"
  ];

  if (theme.comments?.length) {
    lines.push(...theme.comments);
  }

  return renderCommentBlock(lines);
}

function renderStructuredBody(theme: NotepadPlusPlusTheme): string {
  if (theme.body) {
    return theme.body.replace(/\n$/, "");
  }

  const lines: string[] = [];

  if (theme.lexerStyles?.length) {
    lines.push("    <LexerStyles>");
    for (const lexer of theme.lexerStyles) {
      lines.push(...renderLexerType(lexer, "        "));
    }
    lines.push("    </LexerStyles>");
  }

  if (theme.globalStyles?.length) {
    lines.push("    <GlobalStyles>");
    for (const style of theme.globalStyles) {
      lines.push(renderWidgetStyle(style, "        "));
    }
    lines.push("    </GlobalStyles>");
  }

  return lines.join("\n");
}

/**
 * Serialize a Notepad++ theme XML document.
 *
 * Format matches [Dracula for Notepad++](https://draculatheme.com/notepad-plus-plus)
 * and the [Notepad++ theme manual](https://npp-user-manual.org/docs/themes/).
 */
export function renderNotepadPlusPlusTheme(theme: NotepadPlusPlusTheme): string {
  if (theme.xml) {
    return theme.xml.endsWith("\n") ? theme.xml : `${theme.xml}\n`;
  }

  if (!hasStructuredContent(theme)) {
    throw new TypeError(
      `@razorwind/notepad-plus-plus theme "${theme.name}" must include lexerStyles, globalStyles, body, or xml`
    );
  }

  const lines = [
    XML_DECLARATION,
    "",
    "<NotepadPlus>",
    ...renderThemeComments(theme, "    "),
    renderStructuredBody(theme),
    "</NotepadPlus>",
    ""
  ];

  return lines.join("\n");
}

export { renderInstallMd };

export function generateNotepadPlusPlusTheme(
  spec: Schema,
  options: NotepadPlusPlusPluginOptions
): GeneratorFunctionResult<Schema, NotepadPlusPlusPluginOptions> {
  assertOptions(options);

  const outputPath = options.outputPath ?? "notepad-plus-plus-themes";
  const themes = normalizeThemes(options.mapTheme(spec.tokens));

  if (themes.length === 0) {
    throw new Error(
      "@razorwind/notepad-plus-plus mapTheme() returned no themes"
    );
  }

  const documents: GeneratorFunctionResult<
    Schema,
    NotepadPlusPlusPluginOptions
  > = {};
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
        `@razorwind/notepad-plus-plus theme name "${theme.name}" slugifies to an empty string`
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

    const fileName = `${slug}.xml`;
    const themePath = join(outputPath, fileName);
    documents[themePath] = document(
      themePath,
      renderNotepadPlusPlusTheme({ ...theme, name: slug }),
      "xml"
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
