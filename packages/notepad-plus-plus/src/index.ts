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

import { definePlugin } from "@razorwind/core/plugin";
import { flattenTokens, resolveTokenSets } from "./flatten";
import { formatTokenValue, toCssVar } from "./format";
import {
  generateNotepadPlusPlusTheme,
  normalizeThemes,
  renderInstallMd,
  renderNotepadPlusPlusTheme,
  toNppColor
} from "./generate";
import type {
  FlatToken,
  GenerateNotepadPlusPlusTheme,
  NppLexerStyle,
  NppWidgetStyle,
  NppWordsStyle,
  NotepadPlusPlusPluginOptions,
  NotepadPlusPlusTheme
} from "./types";

export {
  flattenTokens,
  formatTokenValue,
  generateNotepadPlusPlusTheme,
  normalizeThemes,
  renderInstallMd,
  renderNotepadPlusPlusTheme,
  resolveTokenSets,
  toCssVar,
  toNppColor
};
export type {
  FlatToken,
  GenerateNotepadPlusPlusTheme,
  NppLexerStyle,
  NppWidgetStyle,
  NppWordsStyle,
  NotepadPlusPlusPluginOptions,
  NotepadPlusPlusTheme
};

/**
 * Razorwind plugin that turns design tokens into Notepad++ `*.xml` theme files.
 *
 * Provide {@link NotepadPlusPlusPluginOptions.mapTheme} to map extracted tokens
 * to one or more theme documents. Generated output includes `INSTALL.md` with
 * Notepad++ activation steps.
 *
 * @see https://draculatheme.com/notepad-plus-plus
 * @see https://npp-user-manual.org/docs/themes/
 *
 * @example
 * ```ts
 * import { defineConfig } from "@razorwind/core";
 * import npp, { flattenTokens } from "@razorwind/notepad-plus-plus";
 *
 * export default defineConfig({
 *   plugins: [
 *     npp({
 *       mapTheme: tokens => {
 *         const flat = flattenTokens(tokens);
 *         const color = (path: string) =>
 *           flat.find(t => t.path === path)?.cssValue ?? "#282a36";
 *
 *         return {
 *           name: "my-theme",
 *           globalStyles: [
 *             {
 *               name: "Default Style",
 *               styleID: 32,
 *               fgColor: color("color.fg"),
 *               bgColor: color("color.bg")
 *             }
 *           ],
 *           lexerStyles: [
 *             {
 *               name: "xml",
 *               desc: "XML",
 *               wordsStyles: [
 *                 {
 *                   name: "DEFAULT",
 *                   styleID: 0,
 *                   fgColor: color("color.fg"),
 *                   bgColor: color("color.bg")
 *                 }
 *               ]
 *             }
 *           ]
 *         };
 *       }
 *     })
 *   ]
 * });
 * ```
 */
export default definePlugin((options?: NotepadPlusPlusPluginOptions) => ({
  name: "notepad-plus-plus",
  generate: async spec => {
    if (!options) {
      throw new Error(
        "@razorwind/notepad-plus-plus requires options: { mapTheme }"
      );
    }
    return generateNotepadPlusPlusTheme(spec, options);
  }
}));
