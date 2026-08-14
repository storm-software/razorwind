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

import { isObject as isObjectFn } from "@stryke/type-checks/is-object";

export function isObject(value: unknown): value is Record<string, unknown> {
  return isObjectFn(value);
}

export {
  flattenTokens,
  isSharedThemeId,
  isTokenLeaf,
  resolveTokenSets,
  SHARED_THEME_ID,
  TOKEN_SET_THEME_PATTERN,
  type BaseFlatToken,
  type FlattenTokensOptions,
  type TokenSet
} from "./flatten-tokens";
export { mergeTokenTrees } from "./merge-tokens";
export {
  resolveSchemaIdentity,
  type SchemaIdentity,
  type SchemaIdentityOverrides
} from "./schema-identity";
export { slugifyThemeName } from "./slugify-theme-name";
export { themeDisplayName, type ThemeNamed } from "./theme-display-name";
export {
  appendThemeToFilePath,
  applyThemeToDocuments,
  applyThemeToTitle
} from "./theme-output";
export { titleCase } from "./title-case";
export {
  formatColorValue,
  formatCssAliasReferences,
  formatDimensionValue,
  formatShadowValue,
  formatTokenValue,
  normalizeFunctionalColorString,
  toThemeCssVar
} from "./token-format";

import type { GeneratorFunctionResult } from "@power-plant/core";

/**
 * Convert a token path into a CSS custom property name.
 *
 * @example
 * toCssVar("color.primary", "rw") // "--rw-color-primary"
 */
export function toCssVar(path: string, prefix: string): string {
  const slug = path
    .split(".")
    .filter(Boolean)
    .join("-")
    .replaceAll(/[^\w-]+/g, "-");

  return `--${prefix}-${slug}`;
}

/**
 * Build a single-chunk generator result document entry.
 */
export function createDocument<TSchema, TOptions extends object>(
  path: string,
  content: string,
  meta: { name: string },
  appendTheme?: false | ((path: string, theme: string) => string),
  language?: string
): GeneratorFunctionResult<TSchema, TOptions>[string] {
  return {
    path,
    language,
    meta: {
      ...meta,
      data:
        appendTheme !== false
          ? {
              appendTheme
            }
          : undefined
    },
    chunks: [{ content, meta }]
  };
}
