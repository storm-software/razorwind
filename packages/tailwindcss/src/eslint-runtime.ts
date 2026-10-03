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
 * Runtime for the ESLint guardrails emitted by `@razorwind/tailwindcss/eslint`.
 *
 * The generated module serializes a {@link GuardrailTheme} (the Tailwind v4
 * `@theme` namespaces derived from the Razorwind schema) and passes it to
 * {@link createGuardrails}. Every rule reads its allowlist from that theme, so
 * the lint surface tracks the tokens the Tailwind CSS generator emits.
 *
 * No dependency on eslint's types: the rule shapes below are the subset the
 * plugin needs, typed locally so this entry stays dependency-free.
 */

import {
  createGuardrailPatterns,
  createGuardrailSeverity
} from "./guardrail-rules";
import type {
  GuardrailOptions,
  GuardrailRuleId,
  GuardrailSettings,
  GuardrailSeverity,
  GuardrailTheme
} from "./types";

export type {
  GuardrailOptions,
  GuardrailRuleId,
  GuardrailSettings,
  GuardrailSeverity,
  GuardrailTheme
} from "./types";

interface Node {
  type: string;
  parent?: Node;
  [key: string]: unknown;
}

interface ReportDescriptor {
  node: Node;
  messageId: string;
  data?: Record<string, string>;
}

interface RuleContext {
  report: (descriptor: ReportDescriptor) => void;
  settings?: Record<string, unknown>;
}

export interface GuardrailRuleModule {
  meta: {
    type: "problem" | "suggestion";
    docs: { description: string };
    messages: Record<string, string>;
    schema: [];
  };
  create: (context: RuleContext) => Record<string, (node: Node) => void>;
}

export interface GuardrailPlugin {
  meta: { name: string; version: string };
  rules: Record<GuardrailRuleId, GuardrailRuleModule>;
}

export interface Guardrails {
  plugin: GuardrailPlugin;
  rules: Record<GuardrailRuleId, GuardrailRuleModule>;
  defaultSeverity: Record<GuardrailRuleId, GuardrailSeverity>;
  /** Build a flat-config block to spread into `eslint.config.*`. */
  config: (options?: GuardrailOptions) => {
    files: string[];
    ignores: string[];
    plugins: Record<string, GuardrailPlugin>;
    settings: Record<string, GuardrailSettings>;
    rules: Record<string, GuardrailSeverity>;
  };
}

/** Settings key the plugin reads class sources from. */
export const SETTINGS_KEY = "razorwind";

export const DEFAULT_CLASS_ATTRIBUTES = ["className", "class"];

export const DEFAULT_CLASS_CALLEES = [
  "cn",
  "clsx",
  "cx",
  "cva",
  "classNames",
  "twMerge",
  "twJoin",
  "tw"
];

// ─── class source discovery ─────────────────────────────────────────────────

const SKIP_KEYS = new Set(["parent", "loc", "range", "tokens", "comments"]);

function walk(node: Node, visit: (n: Node) => void): void {
  visit(node);
  for (const key of Object.keys(node)) {
    if (SKIP_KEYS.has(key)) {
      continue;
    }
    const value = node[key];
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item && typeof item === "object" && "type" in item) {
          walk(item as Node, visit);
        }
      }
    } else if (value && typeof value === "object" && "type" in value) {
      walk(value as Node, visit);
    }
  }
}

interface ClassChunk {
  node: Node;
  text: string;
}

/** Every string chunk under `root`: literals and template quasis. */
function classChunks(root: Node): ClassChunk[] {
  const out: ClassChunk[] = [];
  walk(root, n => {
    if (n.type === "Literal" && typeof n.value === "string") {
      out.push({ node: n, text: n.value });
    } else if (n.type === "TemplateElement") {
      const cooked = (n.value as { cooked?: string } | undefined)?.cooked;
      if (typeof cooked === "string") {
        out.push({ node: n, text: cooked });
      }
    }
  });

  return out;
}

function readSettings(context: RuleContext): Required<GuardrailSettings> {
  const settings = (context.settings?.[SETTINGS_KEY] ??
    {}) as GuardrailSettings;

  return {
    attributes: settings.attributes ?? DEFAULT_CLASS_ATTRIBUTES,
    callees: settings.callees ?? DEFAULT_CLASS_CALLEES
  };
}

function calleeName(node: Node): string | undefined {
  const target = (
    node.type === "TaggedTemplateExpression" ? node.tag : node.callee
  ) as Node | undefined;
  if (!target) {
    return undefined;
  }
  if (target.type === "Identifier") {
    return target.name as string;
  }
  if (target.type === "MemberExpression") {
    const property = target.property as Node | undefined;
    if (property?.type === "Identifier") {
      return property.name as string;
    }
  }

  return undefined;
}

/**
 * Visitor factory: calls `check` once per class source (class attribute or
 * helper call), skipping helper calls nested inside another class source so
 * nothing is reported twice.
 */
function classSources(
  context: RuleContext,
  check: (source: Node) => void
): Record<string, (node: Node) => void> {
  const { attributes, callees } = readSettings(context);
  const attributeSet = new Set(attributes);
  const calleeSet = new Set(callees);

  const isClassAttribute = (node: Node) => {
    const name = node.name as { name?: unknown } | undefined;
    return (
      node.type === "JSXAttribute" &&
      typeof name?.name === "string" &&
      attributeSet.has(name.name)
    );
  };
  const isClassCall = (node: Node) => {
    if (
      node.type !== "CallExpression" &&
      node.type !== "TaggedTemplateExpression"
    ) {
      return false;
    }
    const name = calleeName(node);
    return name !== undefined && calleeSet.has(name);
  };
  const insideSource = (node: Node) => {
    for (let cur = node.parent; cur; cur = cur.parent) {
      if (isClassAttribute(cur) || isClassCall(cur)) {
        return true;
      }
    }
    return false;
  };
  const onCall = (node: Node) => {
    if (isClassCall(node) && !insideSource(node)) {
      check(node);
    }
  };

  return {
    JSXAttribute(node) {
      if (isClassAttribute(node)) {
        check(node);
      }
    },
    CallExpression: onCall,
    TaggedTemplateExpression: onCall
  };
}

// ─── rule builders ──────────────────────────────────────────────────────────

/**
 * A rule that reports every class chunk match of `pattern`, optionally
 * filtered by `accept` (return `false` to allow the match).
 */
function classPatternRule(
  description: string,
  pattern: RegExp,
  message: string,
  accept?: (match: RegExpMatchArray) => boolean
): GuardrailRuleModule {
  const global = new RegExp(
    pattern.source,
    pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`
  );

  return {
    meta: {
      type: "problem",
      docs: { description },
      messages: { violation: message },
      schema: []
    },
    create(context) {
      return classSources(context, source => {
        for (const chunk of classChunks(source)) {
          for (const match of chunk.text.matchAll(global)) {
            if (accept && !accept(match)) {
              continue;
            }
            context.report({
              node: chunk.node,
              messageId: "violation",
              data: { match: match[0].trim() }
            });
          }
        }
      });
    }
  };
}

/**
 * Build the guardrail rules, default severities and flat-config factory for a
 * schema-derived Tailwind theme.
 */
export function createGuardrails(theme: GuardrailTheme): Guardrails {
  const patterns = createGuardrailPatterns(theme);
  const rules = Object.fromEntries(
    (Object.keys(patterns) as GuardrailRuleId[]).map(id => {
      const { description, pattern, message, accept } = patterns[id];

      return [id, classPatternRule(description, pattern, message, accept)];
    })
  ) as Record<GuardrailRuleId, GuardrailRuleModule>;
  const defaultSeverity = createGuardrailSeverity(theme);

  const plugin: GuardrailPlugin = {
    meta: { name: theme.name, version: theme.version },
    rules
  };

  return {
    plugin,
    rules,
    defaultSeverity,
    config({
      files = ["src/**/*.{js,jsx,ts,tsx}"],
      ignores = [],
      severity = {},
      attributes,
      callees
    } = {}) {
      const ruleConfig: Record<string, GuardrailSeverity> = {};
      for (const id of Object.keys(rules) as GuardrailRuleId[]) {
        ruleConfig[`${theme.prefix}/${id}`] =
          severity[id] ?? defaultSeverity[id];
      }

      return {
        files,
        ignores,
        plugins: { [theme.prefix]: plugin },
        settings: {
          [SETTINGS_KEY]: {
            attributes: attributes ?? DEFAULT_CLASS_ATTRIBUTES,
            callees: callees ?? DEFAULT_CLASS_CALLEES
          }
        },
        rules: ruleConfig
      };
    }
  };
}
