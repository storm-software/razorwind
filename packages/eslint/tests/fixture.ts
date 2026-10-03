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

import type { Schema } from "@razorwind/core/schema";
import { Linter } from "eslint";
import { buildManifest } from "../src/manifest";
import type { DesignSystemPlugin } from "../src/runtime";
import { createDesignSystemPlugin } from "../src/runtime";
import type {
  DesignSystemOptions,
  DesignSystemRuleId,
  EslintPluginOptions
} from "../src/types";

const px = (value: number) => ({ value, unit: "px" });

export const tokens = {
  light: {
    color: {
      $type: "color",
      blue: { 500: { $value: "#0066cc" } },
      primary: { $value: "{color.blue.500}" },
      text: { $value: "#1a1a1a" },
      legacy: {
        $value: "#ff0000",
        $deprecated: "Use {color.primary} instead."
      },
      retired: { $value: "#00ff00", $deprecated: true }
    },
    space: {
      $type: "dimension",
      1: { $value: px(4) },
      2: { $value: px(8) },
      4: { $value: px(16) }
    },
    radius: {
      $type: "dimension",
      sm: { $value: px(4) },
      full: { $value: px(9999) }
    },
    border: {
      width: { $type: "dimension", thin: { $value: px(1) } }
    },
    font: {
      size: { $type: "dimension", md: { $value: { value: 1, unit: "rem" } } },
      weight: { $type: "fontWeight", bold: { $value: 700 } },
      family: { $type: "fontFamily", sans: { $value: ["Inter", "sans-serif"] } }
    },
    shadow: {
      $type: "shadow",
      sm: { $value: "0 1px 2px #0000001a" }
    },
    motion: {
      duration: {
        $type: "duration",
        fast: { $value: { value: 100, unit: "ms" } }
      },
      easing: { $type: "cubicBezier", standard: { $value: [0.2, 0, 0, 1] } }
    }
  },
  dark: {
    color: {
      $type: "color",
      blue: { 500: { $value: "#66aaff" } },
      primary: { $value: "{color.blue.500}" },
      text: { $value: "#f5f5f5" }
    }
  }
} as unknown as Schema["tokens"];

export const spec = {
  name: "Acme",
  tokens,
  components: {
    button: { name: "button", title: "Button" },
    "icon-button": { name: "icon-button", title: "Icon Button" },
    heading: { name: "heading", title: "Heading" },
    input: { name: "input", title: "Input" },
    text: { name: "text", title: "Text" },
    stack: { name: "stack", title: "Stack" },
    "visually-hidden": { name: "visually-hidden", title: "Visually Hidden" },
    card: { name: "card", title: "Card" },
    "old-card": {
      name: "old-card",
      title: "Old Card",
      tags: ["deprecated"],
      related: ["card"]
    }
  },
  icons: {
    "arrow-right": {
      name: "arrow-right",
      title: "Arrow Right",
      aliases: ["chevron-right"]
    }
  },
  fonts: {
    inter: { name: "inter", title: "Inter", role: "sans", source: "google" }
  }
} as unknown as Schema;

export const manifest = buildManifest(spec, { tamagui: true });

export const designSystem = createDesignSystemPlugin(manifest);

export function createPlugin(
  overrides: Partial<Schema> = {},
  options: EslintPluginOptions = {}
): DesignSystemPlugin {
  return createDesignSystemPlugin(
    buildManifest({ ...spec, ...overrides }, options)
  );
}

const languageOptions = {
  ecmaVersion: "latest",
  sourceType: "module",
  parserOptions: { ecmaFeatures: { jsx: true } }
} as const;

function configFor(
  options: DesignSystemOptions,
  plugin: DesignSystemPlugin
): Linter.Config[] {
  return [
    {
      ...plugin.config({ files: ["**/*.jsx"], ...options }),
      languageOptions
    } as unknown as Linter.Config
  ];
}

/** Severity overrides enabling only `rule`. */
export function only(
  rule: DesignSystemRuleId,
  plugin: DesignSystemPlugin = designSystem
): DesignSystemOptions["severity"] {
  return Object.fromEntries(
    Object.keys(plugin.rules).map(id => [id, id === rule ? "error" : "off"])
  );
}

export function lint(
  code: string,
  options: DesignSystemOptions = {},
  plugin: DesignSystemPlugin = designSystem
): Linter.LintMessage[] {
  const messages = new Linter({ configType: "flat" }).verify(
    code,
    configFor(options, plugin),
    "component.jsx"
  );
  const fatal = messages.find(message => message.fatal);
  if (fatal) {
    throw new Error(fatal.message);
  }

  return messages;
}

/** Messages of a single rule, with every other rule switched off. */
export function lintRule(
  rule: DesignSystemRuleId,
  code: string,
  options: DesignSystemOptions = {},
  plugin: DesignSystemPlugin = designSystem
): Linter.LintMessage[] {
  return lint(code, { ...options, severity: only(rule, plugin) }, plugin);
}

/** Output after applying a single rule's autofixes. */
export function fixRule(
  rule: DesignSystemRuleId,
  code: string,
  options: DesignSystemOptions = {}
): string {
  return new Linter({ configType: "flat" }).verifyAndFix(
    code,
    configFor({ ...options, severity: only(rule) }, designSystem),
    "component.jsx"
  ).output;
}

/** Apply the `index`-th suggestion of a message. */
export function applySuggestion(
  code: string,
  message: Linter.LintMessage | undefined,
  index = 0
): string {
  const fix = message?.suggestions?.[index]?.fix;
  if (!fix) {
    throw new Error("No suggestion to apply");
  }

  return code.slice(0, fix.range[0]) + fix.text + code.slice(fix.range[1]);
}
