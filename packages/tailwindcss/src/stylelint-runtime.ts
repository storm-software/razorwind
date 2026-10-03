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
 * Runtime for the Stylelint guardrails emitted by
 * `@razorwind/tailwindcss/stylelint`.
 *
 * The rules match the same class patterns as the ESLint guardrails, read from
 * `@apply` preludes, and check the theme variables stylesheets reference
 * (`var(--color-x)`, `theme(--color-x)`, `--theme(--color-x)`) against the
 * schema-derived {@link GuardrailTheme}.
 *
 * Stylelint is imported when a rule first runs, so building the rules (to
 * render INSTALL.md, for example) works without it installed. The PostCSS
 * shapes below are the subset the rules need, typed locally so this entry
 * stays dependency-free.
 */

import type { GuardrailPattern } from "./guardrail-rules";
import {
  createGuardrailPatterns,
  createGuardrailSeverity
} from "./guardrail-rules";
import type {
  GuardrailRuleId,
  GuardrailSeverity,
  GuardrailTheme,
  StylelintGuardrailOptions
} from "./types";

export type {
  GuardrailRuleId,
  GuardrailSeverity,
  GuardrailTheme,
  StylelintGuardrailOptions
} from "./types";

interface PostcssNode {
  type: string;
  toString: () => string;
}

interface Declaration extends PostcssNode {
  type: "decl";
  prop: string;
  value: string;
  raws: { between?: string };
}

interface AtRule extends PostcssNode {
  type: "atrule";
  name: string;
  params: string;
  raws: { afterName?: string };
}

interface Root {
  walk: (callback: (node: PostcssNode) => void) => void;
}

interface StylelintUtils {
  report: (problem: {
    ruleName: string;
    result: unknown;
    message: string;
    node: PostcssNode;
    index?: number;
    endIndex?: number;
    word?: string;
  }) => void;
  validateOptions: (
    result: unknown,
    ruleName: string,
    ...options: { actual: unknown; possible?: unknown }[]
  ) => boolean;
}

/** A Stylelint rule function with the metadata Stylelint reads from it. */
export type StylelintGuardrailRule = ((
  primary: unknown
) => (root: Root, result: unknown) => Promise<void>) & {
  ruleName: string;
  messages: Record<string, string>;
  meta: { url: string; description: string };
};

export interface StylelintGuardrailPlugin {
  ruleName: string;
  rule: StylelintGuardrailRule;
}

export type StylelintRuleSetting =
  null | [true, { severity: "error" | "warning" }];

export interface StylelintGuardrailConfig {
  plugins: StylelintGuardrailPlugin[];
  ignoreFiles?: string[];
  rules?: Record<string, StylelintRuleSetting>;
  overrides?: {
    files: string[];
    rules: Record<string, StylelintRuleSetting>;
  }[];
}

export interface StylelintGuardrails {
  /** One Stylelint plugin per rule, to list in `plugins`. */
  plugins: StylelintGuardrailPlugin[];
  rules: Record<GuardrailRuleId, StylelintGuardrailRule>;
  defaultSeverity: Record<GuardrailRuleId, GuardrailSeverity>;
  /** Build the `plugins` / `rules` to spread into `stylelint.config.*`. */
  config: (options?: StylelintGuardrailOptions) => StylelintGuardrailConfig;
}

const DOCS_URL =
  "https://github.com/storm-software/razorwind/tree/main/packages/tailwindcss#stylelint-guardrails";

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

/** Stylelint rule setting for a severity. */
export function ruleSetting(severity: GuardrailSeverity): StylelintRuleSetting {
  return severity === "off"
    ? null
    : [true, { severity: severity === "warn" ? "warning" : "error" }];
}

/** Text a rule scans in a node, with its offset in the node's source. */
interface Scanned {
  text: string;
  offset: number;
}

function prelude(atRule: AtRule): Scanned {
  return {
    text: atRule.params,
    offset: 1 + atRule.name.length + (atRule.raws.afterName ?? " ").length
  };
}

/** `@apply` prelude: the class list. */
function applyPrelude(node: PostcssNode): Scanned | undefined {
  return node.type === "atrule" && (node as AtRule).name === "apply"
    ? prelude(node as AtRule)
    : undefined;
}

/** A declaration value or at-rule prelude that can reference theme vars. */
function themeReferences(node: PostcssNode): Scanned | undefined {
  if (node.type === "decl") {
    const decl = node as Declaration;

    return {
      text: decl.value,
      offset: decl.prop.length + (decl.raws.between ?? ":").length
    };
  }

  return node.type === "atrule" ? prelude(node as AtRule) : undefined;
}

/** Leading class-boundary character a pattern consumed (`:`, quote, space). */
const BOUNDARY = /^[\s"'`:!]/;

function guardrailRule(
  ruleName: string,
  { description, pattern, message, accept }: GuardrailPattern,
  scan: (node: PostcssNode) => Scanned | undefined
): StylelintGuardrailRule {
  const global = new RegExp(
    pattern.source,
    pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`
  );
  const messages = { violation: `${message} (${ruleName})` };

  const rule = (primary: unknown) => async (root: Root, result: unknown) => {
    const stylelint = await loadStylelint();
    if (
      !stylelint.validateOptions(result, ruleName, {
        actual: primary,
        possible: [true]
      })
    ) {
      return;
    }

    root.walk(node => {
      const scanned = scan(node);
      if (!scanned) {
        return;
      }
      const source = node.toString();
      for (const match of scanned.text.matchAll(global)) {
        if (accept && !accept(match)) {
          continue;
        }
        const lead = match[0].length > 1 && BOUNDARY.test(match[0]) ? 1 : 0;
        const text = match[0].slice(lead).trim();
        const index = scanned.offset + match.index + lead;
        const located = source.slice(index, index + text.length) === text;
        stylelint.report({
          ruleName,
          result,
          node,
          message: messages.violation.replace("{{match}}", text),
          ...(located
            ? { index, endIndex: index + text.length }
            : { word: text })
        });
      }
    });
  };

  return Object.assign(rule, {
    ruleName,
    messages,
    meta: { url: DOCS_URL, description }
  });
}

/**
 * Build the Stylelint guardrail rules, default severities and config factory
 * for a schema-derived Tailwind theme. Class rules read `@apply` preludes;
 * `no-unknown-theme-var` also reads declaration values and at-rule preludes.
 *
 * @param options.rulePrefix - Prepended to every rule id in the rule names
 * (`tailwind-` gives `<prefix>/tailwind-no-color-literal`).
 */
export function createGuardrails(
  theme: GuardrailTheme,
  options: { rulePrefix?: string } = {}
): StylelintGuardrails {
  const patterns = createGuardrailPatterns(theme);
  const ruleName = (id: GuardrailRuleId) =>
    `${theme.prefix}/${options.rulePrefix ?? ""}${id}`;

  const rules = Object.fromEntries(
    (Object.keys(patterns) as GuardrailRuleId[]).map(id => [
      id,
      guardrailRule(
        ruleName(id),
        patterns[id],
        id === "no-unknown-theme-var" ? themeReferences : applyPrelude
      )
    ])
  ) as Record<GuardrailRuleId, StylelintGuardrailRule>;
  const defaultSeverity = createGuardrailSeverity(theme);
  const plugins = (Object.keys(rules) as GuardrailRuleId[]).map(id => ({
    ruleName: rules[id].ruleName,
    rule: rules[id]
  }));

  return {
    plugins,
    rules,
    defaultSeverity,
    config({ files, ignoreFiles, severity = {} } = {}) {
      const ruleConfig: Record<string, StylelintRuleSetting> = {};
      for (const id of Object.keys(rules) as GuardrailRuleId[]) {
        ruleConfig[ruleName(id)] = ruleSetting(
          severity[id] ?? defaultSeverity[id]
        );
      }

      return {
        plugins,
        ...(ignoreFiles ? { ignoreFiles } : {}),
        ...(files
          ? { overrides: [{ files, rules: ruleConfig }] }
          : { rules: ruleConfig })
      };
    }
  };
}
