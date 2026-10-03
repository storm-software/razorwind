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

/*
 * The PostCSS and Stylelint surface the rules use, typed locally so the
 * runtime stays dependency-free. Stylelint itself is imported when a rule
 * first runs, so building the rules (to render INSTALL.md, for example)
 * works without it installed.
 */

export interface Node {
  type: string;
  toString: () => string;
}

export interface Declaration extends Node {
  type: "decl";
  prop: string;
  value: string;
  raws: { between?: string; value?: { raw: string; value: string } };
  cloneBefore: (overrides: { prop: string; value: string }) => Declaration;
  remove: () => void;
}

export interface CssRule extends Node {
  type: "rule";
  selector: string;
  nodes: Node[];
}

export interface Root extends Node {
  walkDecls: (callback: (decl: Declaration) => void) => void;
  walkRules: (callback: (rule: CssRule) => void) => void;
}

interface StylelintUtils {
  report: (problem: {
    ruleName: string;
    result: unknown;
    message: string;
    node: Node;
    index?: number;
    endIndex?: number;
    fix?: () => void;
  }) => void;
  validateOptions: (
    result: unknown,
    ruleName: string,
    ...options: { actual: unknown; possible?: unknown; optional?: boolean }[]
  ) => boolean;
}

let utils: Promise<StylelintUtils> | undefined;

function loadStylelint(): Promise<StylelintUtils> {
  utils ??= import("stylelint").then(module => {
    const api = module as unknown as {
      default?: { utils: StylelintUtils };
      utils: StylelintUtils;
    };

    return (api.default ?? api).utils;
  });

  return utils;
}

export const DOCS_URL =
  "https://github.com/storm-software/razorwind/tree/main/packages/stylelint#rules";

/** A Stylelint rule function with the metadata Stylelint reads from it. */
export type StylelintRule = ((
  primary: unknown,
  secondary: unknown
) => (root: Root, result: unknown) => Promise<void>) & {
  ruleName: string;
  messages: Record<string, string>;
  meta: { url: string; fixable: boolean; description: string };
};

export interface ReportDescriptor {
  node: Node;
  messageId: string;
  data?: Record<string, string>;
  /** Offsets into `node.toString()`; the whole node when omitted. */
  index?: number;
  endIndex?: number;
  fix?: () => void;
}

export type Report = (descriptor: ReportDescriptor) => void;

/** `{{key}}` placeholders filled from `data`. */
function format(template: string, data: Record<string, string> = {}): string {
  return template.replaceAll(
    /\{\{(\w+)\}\}/g,
    (_, key: string) => data[key] ?? ""
  );
}

/**
 * Build a Stylelint rule. `run` receives the validated primary and secondary
 * options and returns the visitor for a root; reports carry an optional fix
 * that Stylelint applies in `--fix` mode, honouring disable comments.
 */
export function createRule<P = true, S = Record<string, unknown>>(options: {
  ruleName: string;
  description: string;
  messages: Record<string, string>;
  fixable?: boolean;
  /** Valid primary option values, in `validateOptions` form. */
  primary?: unknown;
  /** Valid secondary option values, in `validateOptions` form. */
  secondary?: Record<string, unknown>;
  run: (primary: P, secondary: S) => (root: Root, report: Report) => void;
}): StylelintRule {
  const { ruleName, messages, run } = options;
  const suffixed = Object.fromEntries(
    Object.entries(messages).map(([id, text]) => [id, `${text} (${ruleName})`])
  );

  const rule =
    (primary: unknown, secondary: unknown) =>
    async (root: Root, result: unknown) => {
      const stylelint = await loadStylelint();
      // An empty `possible` rejects every secondary option, `severity`
      // included, so secondary options are only validated when declared.
      const valid = stylelint.validateOptions(
        result,
        ruleName,
        { actual: primary, possible: options.primary ?? [true] },
        ...(options.secondary
          ? [{ actual: secondary, possible: options.secondary, optional: true }]
          : [])
      );
      if (!valid) {
        return;
      }

      run(primary as P, (secondary ?? {}) as S)(root, descriptor => {
        stylelint.report({
          ruleName,
          result,
          node: descriptor.node,
          message: format(suffixed[descriptor.messageId]!, descriptor.data),
          ...(descriptor.index === undefined ||
          descriptor.endIndex === undefined
            ? {}
            : { index: descriptor.index, endIndex: descriptor.endIndex }),
          ...(descriptor.fix ? { fix: descriptor.fix } : {})
        });
      });
    };

  return Object.assign(rule, {
    ruleName,
    messages: suffixed,
    meta: {
      url: DOCS_URL,
      fixable: options.fixable ?? false,
      description: options.description
    }
  });
}

/** True for a custom property declaration (`--brand: …`). */
export function isCustomProperty(decl: Declaration): boolean {
  return decl.prop.startsWith("--");
}

/**
 * Offset of a declaration's value in `decl.toString()`, or `undefined` when
 * the source value differs from `decl.value` (comments were stripped).
 */
export function valueOffset(decl: Declaration): number | undefined {
  if (decl.raws.value && decl.raws.value.raw !== decl.value) {
    return undefined;
  }

  return decl.prop.length + (decl.raws.between ?? ":").length;
}

/** `[start, end)` of a value replaced by `length` characters. */
interface Edit {
  start: number;
  end: number;
  length: number;
}

/**
 * Value edits per declaration, shared by every rule in a lint run so each
 * can map offsets in the value it read back to the source text, which is
 * what Stylelint resolves report positions against.
 */
const history = new WeakMap<Declaration, Edit[]>();

/** Map an offset through `edits`, oldest first. */
function forward(edits: Edit[], offset: number): number {
  return edits.reduce(
    (position, edit) =>
      position >= edit.end
        ? position + edit.length - (edit.end - edit.start)
        : position > edit.start
          ? edit.start + Math.min(position - edit.start, edit.length)
          : position,
    offset
  );
}

/** Map an offset back through `edits`, newest first. */
function backward(edits: Edit[], offset: number): number {
  return edits.reduceRight(
    (position, edit) =>
      position >= edit.start + edit.length
        ? position - edit.length + (edit.end - edit.start)
        : Math.min(position, edit.start),
    offset
  );
}

/**
 * Reads and edits declaration values. Offsets passed to `replace` and
 * `range` refer to the value `read` returned, so several fixes in one value
 * apply in any order without shifting each other.
 */
export interface ValueEdits {
  /** The declaration value the other methods' offsets refer to. */
  read: (decl: Declaration) => string;
  /** Replace `[start, end)` of the value `read` returned. */
  replace: (
    decl: Declaration,
    start: number,
    end: number,
    text: string
  ) => void;
  /** Report range in the source for `[start, end)` of the value `read` returned. */
  range: (
    decl: Declaration,
    start: number,
    end: number
  ) => { index: number; endIndex: number } | undefined;
}

export function createValueEdits(): ValueEdits {
  // Number of edits a declaration had when this rule read it.
  const read = new WeakMap<Declaration, number>();
  const edits = (decl: Declaration) => history.get(decl) ?? [];

  return {
    read(decl) {
      read.set(decl, edits(decl).length);

      return decl.value;
    },
    replace(decl, start, end, text) {
      const later = edits(decl).slice(read.get(decl) ?? 0);
      const from = forward(later, start);
      const to = forward(later, end);
      decl.value = decl.value.slice(0, from) + text + decl.value.slice(to);
      history.set(decl, [
        ...edits(decl),
        { start: from, end: to, length: text.length }
      ]);
    },
    range(decl, start, end) {
      const offset = valueOffset(decl);
      const earlier = edits(decl).slice(0, read.get(decl) ?? 0);

      return offset === undefined
        ? undefined
        : {
            index: offset + backward(earlier, start),
            endIndex: offset + backward(earlier, end)
          };
    }
  };
}
