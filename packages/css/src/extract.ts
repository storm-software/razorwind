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

import { mergeFonts, parseCssFonts } from "@razorwind/core/lib/fonts";
import {
  collectCssCustomProperties,
  parseCssCustomProperties
} from "@razorwind/core/lib/tokens";
import { definePlugin } from "@razorwind/core/plugin";
import type { Tokens } from "@razorwind/core/schema";
import { existsSync } from "@stryke/fs/exists";
import { readFile } from "@stryke/fs/read-file";
import { isAbsolute, resolve } from "node:path";
import type { CssExtractPluginOptions } from "./types";

export type { CssExtractPluginOptions } from "./types";

/**
 * Basename pattern for CSS token files.
 */
export const CSS_FILE_PATTERN = /\.css$/i;

/** Default CSS entry when `cssPath` is omitted. */
export const DEFAULT_CSS_PATH = "src/styles.css";

/** Candidate workspace paths checked for a CSS token file. */
export const CSS_PATH_CANDIDATES = [
  DEFAULT_CSS_PATH,
  "styles.css",
  "src/globals.css",
  "globals.css",
  "src/app.css",
  "tokens.css"
] as const;

const CUSTOM_PROPERTY_DECLARATION_RE = /--[A-Z_][\w-]*\s*:/gi;
const CSS_VARIABLE_RE = /var\s*\(\s*(--[A-Z_][\w-]*)\s*/iy;

type CssVariableReference = {
  name: string;
  value?: string;
  kind?: "embedded" | "fallback";
};

function skipQuotedValue(source: string, start: number): number {
  const quote = source[start]!;
  let i = start + 1;

  while (i < source.length) {
    if (source[i] === "\\") {
      i += 2;
    } else if (source[i] === quote) {
      return i + 1;
    } else {
      i += 1;
    }
  }

  return source.length;
}

function readCssDeclaration(
  source: string,
  start: number
): { value: string; end: number } {
  let i = start;
  let paren = 0;
  let bracket = 0;
  let brace = 0;

  while (i < source.length) {
    const character = source[i]!;

    if (character === '"' || character === "'") {
      i = skipQuotedValue(source, i);
      continue;
    }

    if (character === "(") {
      paren += 1;
    } else if (character === ")") {
      paren = Math.max(0, paren - 1);
    } else if (character === "[") {
      bracket += 1;
    } else if (character === "]") {
      bracket = Math.max(0, bracket - 1);
    } else if (character === "{") {
      brace += 1;
    } else if (character === "}") {
      if (paren === 0 && bracket === 0 && brace === 0) {
        return { value: source.slice(start, i), end: i };
      }
      brace = Math.max(0, brace - 1);
    } else if (
      character === ";" &&
      paren === 0 &&
      bracket === 0 &&
      brace === 0
    ) {
      return { value: source.slice(start, i), end: i + 1 };
    }

    i += 1;
  }

  return { value: source.slice(start), end: source.length };
}

function readCssVariableValue(
  source: string,
  start: number
): { value: string; end: number } {
  let i = start;
  let paren = 1;

  while (i < source.length) {
    const character = source[i]!;

    if (character === '"' || character === "'") {
      i = skipQuotedValue(source, i);
      continue;
    }

    if (character === "(") {
      paren += 1;
    } else if (character === ")") {
      paren -= 1;
      if (paren === 0) {
        return { value: source.slice(start, i).trim(), end: i + 1 };
      }
    }

    i += 1;
  }

  return { value: source.slice(start).trim(), end: source.length };
}

function findCssVariableReferences(source: string): CssVariableReference[] {
  const references: CssVariableReference[] = [];
  let i = 0;

  while (i < source.length) {
    if (source[i] === '"' || source[i] === "'") {
      i = skipQuotedValue(source, i);
      continue;
    }

    if (source[i] === "/" && source[i + 1] === "*") {
      const end = source.indexOf("*/", i + 2);
      i = end === -1 ? source.length : end + 2;
      continue;
    }

    CSS_VARIABLE_RE.lastIndex = i;
    const match = CSS_VARIABLE_RE.exec(source);
    if (!match?.[1]) {
      i += 1;
      continue;
    }

    const valueStart = CSS_VARIABLE_RE.lastIndex;
    const separator = source[valueStart];
    if (separator !== ":" && separator !== ",") {
      references.push({ name: match[1] });
      i = valueStart;
      continue;
    }

    const { value } = readCssVariableValue(source, valueStart + 1);

    if (value) {
      references.push({
        name: match[1],
        value,
        kind: separator === ":" ? "embedded" : "fallback"
      });
    }
    i = valueStart + 1;
  }

  return references;
}

function hasEmbeddedCustomProperties(contents: string): boolean {
  return findCssVariableReferences(contents).some(
    reference => reference.kind === "embedded"
  );
}

function removeMalformedCustomPropertyDeclarations(contents: string): string {
  let result = "";
  let previousEnd = 0;
  let removed = false;
  let match: RegExpExecArray | null;

  while ((match = CUSTOM_PROPERTY_DECLARATION_RE.exec(contents))) {
    const { value, end } = readCssDeclaration(
      contents,
      CUSTOM_PROPERTY_DECLARATION_RE.lastIndex
    );

    if (!hasEmbeddedCustomProperties(value)) {
      CUSTOM_PROPERTY_DECLARATION_RE.lastIndex = end;
      continue;
    }

    result += contents.slice(previousEnd, match.index);
    previousEnd = end;
    removed = true;
    CUSTOM_PROPERTY_DECLARATION_RE.lastIndex = end;
  }

  return removed ? result + contents.slice(previousEnd) : contents;
}

function recoverReferencedCustomProperties(contents: string): string {
  const references = findCssVariableReferences(contents);
  const normalizedContents = references.some(
    reference => reference.kind === "embedded"
  )
    ? removeMalformedCustomPropertyDeclarations(contents)
    : contents;
  const declared = collectCssCustomProperties(normalizedContents);
  const recovered = new Map<string, string>();

  for (const reference of references) {
    if (reference.kind === "embedded" && reference.value) {
      recovered.set(reference.name, reference.value);
    }
  }

  for (const reference of references) {
    if (
      reference.kind === "fallback" &&
      reference.value &&
      !recovered.has(reference.name)
    ) {
      recovered.set(reference.name, reference.value);
    }
  }

  const declarations = Array.from(recovered)
    .filter(([name]) => !Object.hasOwn(declared, name))
    .map(([name, value]) => `${name}: ${value};`)
    .join("\n");

  return declarations
    ? `${normalizedContents}\n${declarations}`
    : normalizedContents;
}

function hasTokens(tokens: unknown): tokens is Tokens {
  return (
    typeof tokens === "object" &&
    tokens !== null &&
    Object.keys(tokens).length > 0
  );
}

/**
 * Parse CSS custom properties from an entire stylesheet into a nested DTCG
 * token tree.
 *
 * Declarations are collected from every rule — `:root`, `@theme`, `.dark`,
 * `@layer`, `@property`, `[data-theme]`, component selectors, and so on — not
 * only `:root`. Referenced variables are also collected when an explicit
 * declaration or fallback value can be found.
 */
export function parseCssTokens(contents: string): Tokens {
  return parseCssCustomProperties(
    recoverReferencedCustomProperties(contents)
  ) as Tokens;
}

/**
 * Resolve an absolute CSS file path from an explicit hint or common defaults.
 */
export function resolveCssPath(
  cwd: string,
  cssPath?: string | null
): string | null {
  if (cssPath) {
    const absolute = isAbsolute(cssPath) ? cssPath : resolve(cwd, cssPath);

    return existsSync(absolute) ? absolute : null;
  }

  for (const candidate of CSS_PATH_CANDIDATES) {
    const absolute = resolve(cwd, candidate);
    if (existsSync(absolute)) {
      return absolute;
    }
  }

  return null;
}

/**
 * Extract design tokens by reading and parsing a CSS file.
 */
export async function extractCssTokens(
  options: CssExtractPluginOptions & { cwd: string }
): Promise<Tokens | undefined> {
  const path = resolveCssPath(options.cwd, options.cssPath);
  if (!path) {
    return undefined;
  }

  const tokens = parseCssTokens(await readFile(path));
  if (!hasTokens(tokens)) {
    return undefined;
  }

  return tokens;
}

/**
 * Razorwind plugin: extract design tokens from a CSS file of custom properties.
 *
 * @example
 * ```ts
 * import { defineConfig } from "@razorwind/core";
 * import css from "@razorwind/css/extract";
 *
 * export default defineConfig({
 *   plugins: [css({ cssPath: "src/styles.css" })]
 * });
 * ```
 */
export default definePlugin((options?: CssExtractPluginOptions) => ({
  name: "css:extract",
  parsers: [
    {
      name: "css",
      pattern: CSS_FILE_PATTERN,
      parser: (contents: string): Tokens => parseCssTokens(contents)
    }
  ],
  extract: async (spec, config) => {
    const cwd = config.cwd;
    const path = resolveCssPath(cwd, options?.cssPath);
    let next = spec;

    if (!hasTokens(spec.tokens)) {
      const tokens = await extractCssTokens({
        cwd,
        cssPath: options?.cssPath
      });

      if (hasTokens(tokens)) {
        next = { ...next, tokens };
      }
    }

    if (path) {
      const fonts = parseCssFonts(await readFile(path));
      next = { ...next, fonts: mergeFonts(next.fonts, fonts) };
    }

    return next;
  }
}));
