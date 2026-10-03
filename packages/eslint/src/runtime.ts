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
 * Runtime for the ESLint plugin emitted by `@razorwind/eslint`.
 *
 * The generated module serializes a {@link DesignSystemManifest} (tokens,
 * components, icons and fonts derived from the Razorwind schema) and passes
 * it to {@link createDesignSystemPlugin}. The core rules port
 * `@atlaskit/eslint-plugin-design-system` onto that manifest, and the
 * `@razorwind/tailwindcss` / `@razorwind/tamagui` guardrails are exposed
 * alongside them as `tailwind-*` / `tamagui-*` rules.
 *
 * @see https://bitbucket.org/atlassian/atlassian-frontend-mirror/src/master/design-system/eslint-plugin/
 */

import type { GuardrailRuleModule as TailwindRuleModule } from "@razorwind/tailwindcss/eslint-runtime";
import {
  createGuardrails as createTailwindGuardrails,
  DEFAULT_CLASS_ATTRIBUTES,
  DEFAULT_CLASS_CALLEES,
  SETTINGS_KEY as TAILWIND_SETTINGS_KEY
} from "@razorwind/tailwindcss/eslint-runtime";
import type { GuardrailRuleModule as TamaguiRuleModule } from "@razorwind/tamagui/eslint-runtime";
import {
  createGuardrails as createTamaguiGuardrails,
  DEFAULT_STYLED_CALLEES,
  SETTINGS_KEY as TAMAGUI_SETTINGS_KEY
} from "@razorwind/tamagui/eslint-runtime";
import type { RuleModule } from "./runtime/ast";
import type { ComponentIndex } from "./runtime/components";
import { createComponentIndex } from "./runtime/components";
import {
  createComponentRules,
  HTML_ELEMENT_RULES
} from "./runtime/rules/components";
import { createStyleRules } from "./runtime/rules/styles";
import { createTokenRules } from "./runtime/rules/tokens";
import { SETTINGS_KEY } from "./runtime/settings";
import type { TokenIndex } from "./runtime/tokens";
import { createTokenIndex } from "./runtime/tokens";
import type {
  CoreRuleId,
  DesignSystemManifest,
  DesignSystemOptions,
  DesignSystemRuleId,
  DesignSystemSettings,
  DesignSystemSeverity,
  HtmlElementRuleId
} from "./types";

export { SETTINGS_KEY } from "./runtime/settings";
export { normalizeColor } from "./runtime/values";
export type {
  ComponentRole,
  CoreRuleId,
  DesignSystemManifest,
  DesignSystemOptions,
  DesignSystemRuleId,
  DesignSystemSettings,
  DesignSystemSeverity,
  ManifestComponent,
  ManifestFont,
  ManifestToken,
  TokenCategory,
  TokenReferenceStyle
} from "./types";

export type AnyRuleModule = RuleModule | TailwindRuleModule | TamaguiRuleModule;

export interface DesignSystemConfig {
  files: string[];
  ignores: string[];
  plugins: Record<string, DesignSystemEslintPlugin>;
  settings: Record<string, unknown>;
  rules: Record<string, DesignSystemSeverity>;
}

export interface DesignSystemEslintPlugin {
  meta: { name: string; version: string };
  rules: Partial<Record<DesignSystemRuleId, AnyRuleModule>>;
  configs: { recommended?: DesignSystemConfig };
}

export interface DesignSystemPlugin {
  plugin: DesignSystemEslintPlugin;
  rules: Partial<Record<DesignSystemRuleId, AnyRuleModule>>;
  defaultSeverity: Partial<Record<DesignSystemRuleId, DesignSystemSeverity>>;
  configs: DesignSystemEslintPlugin["configs"];
  /** Build a flat-config block to spread into `eslint.config.*`. */
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
 * schema defines the category, component rules when it defines the
 * replacement, and the remaining rules follow Atlassian's recommended set.
 */
function coreSeverity(
  manifest: DesignSystemManifest,
  tokens: TokenIndex,
  components: ComponentIndex
): Record<CoreRuleId, DesignSystemSeverity> {
  const on = (enabled: boolean, severity: DesignSystemSeverity) =>
    enabled ? severity : "off";
  const htmlRules = Object.fromEntries(
    (Object.keys(HTML_ELEMENT_RULES) as HtmlElementRuleId[]).map(id => [
      id,
      on(components.has(HTML_ELEMENT_RULES[id].role), "warn")
    ])
  ) as Record<HtmlElementRuleId, DesignSystemSeverity>;

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
    "no-margin": on(components.has("primitive"), "warn"),
    "no-physical-properties": "off",
    "no-nested-styles": "warn",
    "no-exported-css": "off",
    "no-exported-keyframes": "off",
    "no-empty-styled-expression": "off",
    "no-css-tagged-template-expression": "off",
    "no-styled-tagged-template-expression": "off",
    "no-keyframes-tagged-template-expression": "off",
    "no-banned-imports": "error",
    "no-deprecated-imports": on(components.deprecated().length > 0, "error"),
    "no-unsafe-style-overrides": on(manifest.components.length > 0, "warn"),
    "prefer-primitives": "off",
    "use-primitives-text": on(components.has("text"), "warn"),
    "use-visually-hidden": on(components.has("visually-hidden"), "warn"),
    "icon-label": on(
      manifest.icons.length > 0 || components.has("icon"),
      "warn"
    ),
    "no-empty-icon-button-label": on(components.has("icon-button"), "error"),
    "no-placeholder": on(components.has("text-input", "textarea"), "warn"),
    "no-readonly-or-disabled-inputs": on(
      components.has(
        "text-input",
        "textarea",
        "select",
        "checkbox",
        "radio",
        "range"
      ),
      "warn"
    ),
    ...htmlRules
  };
}

const SETTING_KEYS: (keyof DesignSystemSettings)[] = [
  "tokenFunctions",
  "tokenReference",
  "styleCallees",
  "styleAttributes",
  "unsafeStyleProps",
  "componentModules",
  "bannedImports"
];

/**
 * Build the design-system rules, default severities and flat-config factory
 * for a schema-derived manifest.
 */
export function createDesignSystemPlugin(
  manifest: DesignSystemManifest
): DesignSystemPlugin {
  const tokens = createTokenIndex(manifest);
  const components = createComponentIndex(manifest);
  const tailwind = manifest.tailwind
    ? createTailwindGuardrails(manifest.tailwind)
    : undefined;
  const tamagui = manifest.tamagui
    ? createTamaguiGuardrails(manifest.tamagui)
    : undefined;

  const rules = {
    ...createTokenRules(manifest, tokens),
    ...createStyleRules(components),
    ...createComponentRules(components),
    ...prefixed("tailwind", tailwind?.rules),
    ...prefixed("tamagui", tamagui?.rules)
  } as Partial<Record<DesignSystemRuleId, AnyRuleModule>>;

  const defaultSeverity = {
    ...coreSeverity(manifest, tokens, components),
    ...prefixed("tailwind", tailwind?.defaultSeverity),
    ...prefixed("tamagui", tamagui?.defaultSeverity)
  } as Partial<Record<DesignSystemRuleId, DesignSystemSeverity>>;

  const plugin: DesignSystemEslintPlugin = {
    meta: { name: manifest.name, version: manifest.version },
    rules,
    configs: {}
  };

  const config = (options: DesignSystemOptions = {}): DesignSystemConfig => {
    const {
      files = ["src/**/*.{js,jsx,ts,tsx}"],
      ignores = [],
      severity = {}
    } = options;

    const ruleConfig: Record<string, DesignSystemSeverity> = {};
    for (const id of Object.keys(rules) as DesignSystemRuleId[]) {
      ruleConfig[`${manifest.prefix}/${id}`] =
        severity[id] ?? defaultSeverity[id] ?? "off";
    }

    const settings: Record<string, unknown> = {
      [SETTINGS_KEY]: Object.fromEntries(
        SETTING_KEYS.filter(key => options[key] !== undefined).map(key => [
          key,
          options[key]
        ])
      )
    };
    if (tailwind) {
      settings[TAILWIND_SETTINGS_KEY] = {
        attributes: options.tailwind?.attributes ?? DEFAULT_CLASS_ATTRIBUTES,
        callees: options.tailwind?.callees ?? DEFAULT_CLASS_CALLEES
      };
    }
    if (tamagui) {
      settings[TAMAGUI_SETTINGS_KEY] = {
        ...(options.tamagui?.components
          ? { components: options.tamagui.components }
          : {}),
        callees: options.tamagui?.callees ?? DEFAULT_STYLED_CALLEES
      };
    }

    return {
      files,
      ignores,
      plugins: { [manifest.prefix]: plugin },
      settings,
      rules: ruleConfig
    };
  };

  plugin.configs.recommended = config();

  return {
    plugin,
    rules,
    defaultSeverity,
    configs: plugin.configs,
    config
  };
}
