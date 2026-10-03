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
 * Runtime for the Stylelint plugin emitted by `@razorwind/stylelint`.
 *
 * The generated module serializes a {@link DesignSystemManifest} (tokens,
 * components and fonts derived from the Razorwind schema) and passes it to
 * {@link createDesignSystemPlugin}. The core rules port
 * `@atlaskit/stylelint-design-system` onto that manifest alongside the
 * `@razorwind/eslint` rules that apply to stylesheets, and the
 * `@razorwind/tailwindcss` guardrails are exposed as `tailwind-*` rules.
 *
 * @see https://bitbucket.org/atlassian/atlassian-frontend-mirror/src/master/design-system/stylelint/
 */

import type { StylelintGuardrailRule as TailwindRule } from "@razorwind/tailwindcss/stylelint-runtime";
import { createGuardrails as createTailwindGuardrails } from "@razorwind/tailwindcss/stylelint-runtime";
import type { StylelintRule } from "./runtime/postcss";
import { createStyleRules } from "./runtime/rules/styles";
import { createTokenRules } from "./runtime/rules/tokens";
import type { TokenIndex } from "./runtime/tokens";
import { createTokenIndex } from "./runtime/tokens";
import type {
  CoreRuleId,
  DesignSystemManifest,
  DesignSystemOptions,
  DesignSystemRuleId,
  DesignSystemSeverity
} from "./types";

export { normalizeColor } from "./runtime/values";
export type {
  ComponentRole,
  CoreRuleId,
  DesignSystemManifest,
  DesignSystemOptions,
  DesignSystemRuleId,
  DesignSystemSeverity,
  FallbackUsage,
  ManifestComponent,
  ManifestFont,
  ManifestToken,
  TokenCategory,
  TokenUsageDomains
} from "./types";

export type AnyRule = StylelintRule | TailwindRule;

/** A Stylelint plugin: one namespaced rule. */
export interface DesignSystemStylelintPlugin {
  ruleName: string;
  rule: AnyRule;
}

/** Stylelint rule setting: off, or the primary option with severity. */
export type RuleSetting =
  | null
  | [unknown, { severity: "error" | "warning"; [option: string]: unknown }];

/** The `plugins` / `rules` to spread into `stylelint.config.*`. */
export interface DesignSystemConfig {
  plugins: DesignSystemStylelintPlugin[];
  ignoreFiles?: string[];
  rules?: Record<string, RuleSetting>;
  overrides?: { files: string[]; rules: Record<string, RuleSetting> }[];
}

export interface DesignSystemPlugin {
  /** One Stylelint plugin per rule, to list in `plugins`. */
  plugins: DesignSystemStylelintPlugin[];
  rules: Partial<Record<DesignSystemRuleId, AnyRule>>;
  defaultSeverity: Partial<Record<DesignSystemRuleId, DesignSystemSeverity>>;
  /** Build the `plugins` / `rules` to spread into `stylelint.config.*`. */
  config: (options?: DesignSystemOptions) => DesignSystemConfig;
}

function prefixed<T>(
  prefix: string,
  record: Record<string, T> | undefined
): Record<string, T> {
  return Object.fromEntries(
    Object.entries(record ?? {}).map(([id, value]) => [
      `${prefix}-${id}`,
      value
    ])
  );
}

/**
 * Default severity of each core rule: token rules are enabled when the
 * schema defines the category, component-backed rules when it defines the
 * component, and the remaining rules follow Atlassian's recommended set.
 */
function coreSeverity(
  manifest: DesignSystemManifest,
  tokens: TokenIndex
): Record<CoreRuleId, DesignSystemSeverity> {
  const on = (enabled: boolean, severity: DesignSystemSeverity) =>
    enabled ? severity : "off";

  return {
    "ensure-design-token-usage": on(tokens.has("color", "shadow"), "error"),
    "no-unsafe-design-token-usage": on(manifest.tokens.length > 0, "error"),
    "no-deprecated-design-token-usage": on(
      manifest.tokens.some(token => token.deprecated),
      "warn"
    ),
    "use-tokens-space": on(tokens.has("space"), "warn"),
    "use-tokens-shape": on(tokens.has("radius", "borderWidth"), "warn"),
    "use-tokens-typography": on(
      tokens.has(
        "fontSize",
        "fontWeight",
        "fontFamily",
        "lineHeight",
        "letterSpacing",
        "typography"
      ) || manifest.fonts.length > 0,
      "warn"
    ),
    "use-tokens-motion": on(tokens.has("duration", "easing"), "warn"),
    "expand-motion-shorthand": "off",
    "no-physical-properties": "off",
    // Stylesheets hold resets (`margin: 0`) the JSX rule never sees.
    "no-margin": "off",
    "use-visually-hidden": on(
      manifest.components.some(component =>
        component.roles.includes("visually-hidden")
      ),
      "warn"
    )
  };
}

/** Stylelint rule setting for a severity, primary option and secondary options. */
function ruleSetting(
  severity: DesignSystemSeverity,
  primary: unknown = true,
  secondary: Record<string, unknown> = {}
): RuleSetting {
  return severity === "off"
    ? null
    : [
        primary,
        { ...secondary, severity: severity === "warn" ? "warning" : "error" }
      ];
}

/**
 * Build the design-system rules, default severities and Stylelint config
 * factory for a schema-derived manifest.
 */
export function createDesignSystemPlugin(
  manifest: DesignSystemManifest
): DesignSystemPlugin {
  const tokens = createTokenIndex(manifest);
  const tailwind = manifest.tailwind
    ? createTailwindGuardrails(manifest.tailwind, { rulePrefix: "tailwind-" })
    : undefined;

  const rules = {
    ...createTokenRules(manifest, tokens),
    ...createStyleRules(manifest),
    ...prefixed("tailwind", tailwind?.rules)
  } as Partial<Record<DesignSystemRuleId, AnyRule>>;

  const defaultSeverity = {
    ...coreSeverity(manifest, tokens),
    ...prefixed("tailwind", tailwind?.defaultSeverity)
  } as Partial<Record<DesignSystemRuleId, DesignSystemSeverity>>;

  const ids = Object.keys(rules) as DesignSystemRuleId[];
  const plugins = ids.map(id => ({
    ruleName: rules[id]!.ruleName,
    rule: rules[id]!
  }));

  const config = (options: DesignSystemOptions = {}): DesignSystemConfig => {
    const { files, ignoreFiles, severity = {} } = options;

    const ruleConfig: Record<string, RuleSetting> = {};
    for (const id of ids) {
      const level = severity[id] ?? defaultSeverity[id] ?? "off";
      ruleConfig[rules[id]!.ruleName] =
        id === "ensure-design-token-usage"
          ? ruleSetting(level, options.tokenUsage ?? true)
          : id === "no-unsafe-design-token-usage" && options.fallbackUsage
            ? ruleSetting(level, true, { fallbackUsage: options.fallbackUsage })
            : ruleSetting(level);
    }

    return {
      plugins,
      ...(ignoreFiles ? { ignoreFiles } : {}),
      ...(files
        ? { overrides: [{ files, rules: ruleConfig }] }
        : { rules: ruleConfig })
    };
  };

  return { plugins, rules, defaultSeverity, config };
}
