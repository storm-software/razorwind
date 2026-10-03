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

import type { TokenReferenceStyle } from "../types";
import type { FixFunction, SourceCode } from "./ast";
import type { ParsedTemplate, ValueLeaf } from "./sources";

/** Replace `[start, end)` of a value with a token reference. */
export interface ValueReplacement {
  start: number;
  end: number;
  reference: string;
}

function escapeTemplate(text: string): string {
  return text.replaceAll(/[\\`]|\$\{/g, match => `\\${match}`);
}

/**
 * Fix replacing parts of a string or number literal with token references.
 * `css-var` references stay inside the string; `function` references turn
 * the literal into a call or a template literal.
 */
export function leafReplacementFix(
  leaf: ValueLeaf,
  replacements: ValueReplacement[],
  style: TokenReferenceStyle,
  sourceCode: SourceCode
): FixFunction | undefined {
  const inAttribute = leaf.node.parent?.type === "JSXAttribute";
  const expression = (code: string) => (inAttribute ? `{${code}}` : code);

  if (leaf.kind === "number") {
    const [replacement] = replacements;
    if (!replacement) {
      return undefined;
    }
    const code =
      style === "function"
        ? replacement.reference
        : JSON.stringify(replacement.reference);

    return fixer => fixer.replaceText(leaf.node, expression(code));
  }

  if (leaf.kind !== "string") {
    return undefined;
  }

  const raw = sourceCode.getText(leaf.node);
  const quote = raw[0]!;
  if (raw.slice(1, -1) !== leaf.text) {
    return undefined;
  }

  const sorted = replacements.toSorted((a, b) => a.start - b.start);
  if (style === "css-var") {
    let text = leaf.text;
    for (const replacement of sorted.toReversed()) {
      text =
        text.slice(0, replacement.start) +
        replacement.reference +
        text.slice(replacement.end);
    }
    return fixer => fixer.replaceText(leaf.node, `${quote}${text}${quote}`);
  }

  const [only] = sorted;
  if (
    sorted.length === 1 &&
    only &&
    leaf.text.slice(0, only.start).trim() === "" &&
    leaf.text.slice(only.end).trim() === ""
  ) {
    return fixer => fixer.replaceText(leaf.node, expression(only.reference));
  }

  let cursor = 0;
  let template = "";
  for (const replacement of sorted) {
    template += `${escapeTemplate(leaf.text.slice(cursor, replacement.start))}\${${replacement.reference}}`;
    cursor = replacement.end;
  }
  template += escapeTemplate(leaf.text.slice(cursor));

  return fixer => fixer.replaceText(leaf.node, expression(`\`${template}\``));
}

/**
 * Fix replacing ranges of a CSS tagged template's text (offsets into
 * {@link ParsedTemplate.text}) with token references.
 */
export function templateReplacementFix(
  parsed: ParsedTemplate,
  replacements: ValueReplacement[],
  style: TokenReferenceStyle
): FixFunction | undefined {
  const ranges = replacements.map(replacement => ({
    range: parsed.range(replacement.start, replacement.end),
    text:
      style === "function"
        ? `\${${replacement.reference}}`
        : replacement.reference
  }));
  if (ranges.some(({ range }) => !range)) {
    return undefined;
  }

  return fixer =>
    ranges.map(({ range, text }) => fixer.replaceTextRange(range!, text));
}
