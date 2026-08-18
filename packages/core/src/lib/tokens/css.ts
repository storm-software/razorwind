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

import { nestFlatTokens } from "./infer";

const CUSTOM_PROPERTY_NAME_RE = /^--[A-Z_][\w-]*/i;
const PROPERTY_AT_RULE_RE = /^@property\s+(--[A-Z_][\w-]*)\s*\{/i;
const INITIAL_VALUE_RE = /initial-value\s*:\s*([^;]+)/i;
const IMPORTANT_RE = /\s*!important\s*$/i;

function stripCssComments(contents: string): string {
  return contents.replace(/\/\*[\s\S]*?\*\//g, "");
}

function stripImportant(value: string): string {
  return value.replace(IMPORTANT_RE, "").trim();
}

function skipQuoted(source: string, start: number): number {
  const quote = source[start];
  let i = start + 1;
  while (i < source.length) {
    const ch = source[i];
    if (ch === "\\") {
      i += 2;
      continue;
    }
    if (ch === quote) {
      return i + 1;
    }
    i += 1;
  }
  return source.length;
}

/**
 * Read a CSS value starting at `start`, stopping at a top-level `;` or the
 * `}` that closes the enclosing rule. Nested `()`, `[]`, and `{}` (including
 * JSON composite token values) are kept intact.
 */
function readCssValue(
  source: string,
  start: number
): { value: string; end: number } {
  let i = start;
  let paren = 0;
  let bracket = 0;
  let brace = 0;

  while (i < source.length) {
    const ch = source[i]!;

    if (ch === '"' || ch === "'") {
      i = skipQuoted(source, i);
      continue;
    }

    if (ch === "(") {
      paren += 1;
      i += 1;
      continue;
    }
    if (ch === ")") {
      paren = Math.max(0, paren - 1);
      i += 1;
      continue;
    }
    if (ch === "[") {
      bracket += 1;
      i += 1;
      continue;
    }
    if (ch === "]") {
      bracket = Math.max(0, bracket - 1);
      i += 1;
      continue;
    }
    if (ch === "{") {
      brace += 1;
      i += 1;
      continue;
    }
    if (ch === "}") {
      if (brace === 0 && paren === 0 && bracket === 0) {
        return { value: stripImportant(source.slice(start, i)), end: i };
      }
      brace = Math.max(0, brace - 1);
      i += 1;
      continue;
    }
    if (ch === ";" && brace === 0 && paren === 0 && bracket === 0) {
      return { value: stripImportant(source.slice(start, i)), end: i + 1 };
    }

    i += 1;
  }

  return { value: stripImportant(source.slice(start)), end: source.length };
}

function readBlockBody(
  source: string,
  start: number
): { body: string; end: number } {
  let i = start;
  let brace = 0;

  while (i < source.length) {
    const ch = source[i]!;
    if (ch === '"' || ch === "'") {
      i = skipQuoted(source, i);
      continue;
    }
    if (ch === "{") {
      brace += 1;
      i += 1;
      continue;
    }
    if (ch === "}") {
      if (brace === 0) {
        return { body: source.slice(start, i), end: i + 1 };
      }
      brace -= 1;
      i += 1;
      continue;
    }
    i += 1;
  }

  return { body: source.slice(start), end: source.length };
}

function tryParseDeclaration(
  source: string,
  start: number
): { name: string; value: string; end: number } | null {
  const nameMatch = source.slice(start).match(CUSTOM_PROPERTY_NAME_RE);
  if (!nameMatch?.[0]) {
    return null;
  }

  const name = nameMatch[0];
  let i = start + name.length;
  while (i < source.length && /\s/.test(source[i]!)) {
    i += 1;
  }
  if (source[i] !== ":") {
    return null;
  }

  i += 1;
  const { value, end } = readCssValue(source, i);
  if (!value) {
    return { name, value: "", end };
  }
  return { name, value, end };
}

/**
 * Collect `--custom-property` declarations from an entire stylesheet.
 *
 * Every rule is scanned (`:root`, `@theme`, `.dark`, `@layer`, `@media`,
 * `@property`, component selectors, …), not only `:root`. Later declarations
 * of the same name overwrite earlier ones. `var(--token)` usages are ignored.
 */
export function collectCssCustomProperties(
  contents: string
): Record<string, string> {
  const source = stripCssComments(contents);
  const flat: Record<string, string> = {};
  let i = 0;

  while (i < source.length) {
    const ch = source[i]!;

    if (ch === '"' || ch === "'") {
      i = skipQuoted(source, i);
      continue;
    }

    if (ch === "@" && /^@property\b/i.test(source.slice(i))) {
      const header = source.slice(i).match(PROPERTY_AT_RULE_RE);
      if (!header?.[0] || !header[1]) {
        i += 1;
        continue;
      }

      const name = header[1];
      const bodyStart = i + header[0].length;
      const { body, end } = readBlockBody(source, bodyStart);
      const initial = body.match(INITIAL_VALUE_RE)?.[1]?.trim();
      if (initial) {
        flat[name] = stripImportant(initial);
      }
      i = end;
      continue;
    }

    if (ch === "-" && source[i + 1] === "-") {
      const parsed = tryParseDeclaration(source, i);
      if (parsed) {
        if (parsed.value) {
          flat[parsed.name] = parsed.value;
        }
        i = parsed.end;
        continue;
      }
    }

    i += 1;
  }

  return flat;
}

/**
 * Extract CSS custom properties from stylesheet text into a nested token tree.
 * Handles `:root`, `[data-theme]`, Tailwind v4 `@theme`, `@property`, and any
 * other rule that declares custom properties.
 */
export function parseCssCustomProperties(
  contents: string
): Record<string, unknown> {
  return nestFlatTokens(collectCssCustomProperties(contents));
}
