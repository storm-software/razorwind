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
import stylelint from "stylelint";
import { buildManifest } from "../src/manifest";
import type { DesignSystemPlugin } from "../src/runtime";
import { createDesignSystemPlugin } from "../src/runtime";
import type {
  DesignSystemOptions,
  DesignSystemRuleId,
  StylelintPluginOptions
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
    stack: { name: "stack", title: "Stack" },
    box: { name: "box", title: "Box" },
    "visually-hidden": { name: "visually-hidden", title: "Visually Hidden" }
  },
  icons: {},
  fonts: {
    inter: { name: "inter", title: "Inter", role: "sans", source: "google" }
  }
} as unknown as Schema;

export const manifest = buildManifest(spec);

export const designSystem = createDesignSystemPlugin(manifest);

export function createPlugin(
  overrides: Partial<Schema> = {},
  options: StylelintPluginOptions = {}
): DesignSystemPlugin {
  return createDesignSystemPlugin(
    buildManifest({ ...spec, ...overrides }, options)
  );
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

async function run(
  code: string,
  options: DesignSystemOptions,
  plugin: Pick<DesignSystemPlugin, "config">,
  fix = false
) {
  const result = await stylelint.lint({
    code,
    config: plugin.config(options) as stylelint.Config,
    fix
  });
  const [first] = result.results;
  const invalid = first?.invalidOptionWarnings ?? [];
  if (invalid.length > 0) {
    throw new Error(invalid.map(warning => warning.text).join("\n"));
  }

  return { warnings: first?.warnings ?? [], code: result.code ?? code };
}

export async function lint(
  code: string,
  options: DesignSystemOptions = {},
  plugin: Pick<DesignSystemPlugin, "config"> = designSystem
): Promise<stylelint.Warning[]> {
  return (await run(code, options, plugin)).warnings;
}

/** Warnings of a single rule, with every other rule switched off. */
export async function lintRule(
  rule: DesignSystemRuleId,
  code: string,
  options: DesignSystemOptions = {},
  plugin: DesignSystemPlugin = designSystem
): Promise<stylelint.Warning[]> {
  return lint(code, { ...options, severity: only(rule, plugin) }, plugin);
}

/** Messages of a single rule. */
export async function messages(
  rule: DesignSystemRuleId,
  code: string,
  options: DesignSystemOptions = {},
  plugin: DesignSystemPlugin = designSystem
): Promise<string[]> {
  return (await lintRule(rule, code, options, plugin)).map(
    warning => warning.text
  );
}

/** Output after `stylelint --fix` with a single rule enabled. */
export async function fixRule(
  rule: DesignSystemRuleId,
  code: string,
  options: DesignSystemOptions = {}
): Promise<string> {
  return (
    await run(code, { ...options, severity: only(rule) }, designSystem, true)
  ).code;
}
