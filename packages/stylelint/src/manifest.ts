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
import { cssVarPrefixFromName, resolveTokenSets } from "@razorwind/core/utils";
import {
  collectManifestComponents,
  collectManifestTokens,
  DEFAULT_PREFIX
} from "@razorwind/eslint";
import { flattenThemeTokens } from "@razorwind/tailwindcss/generate";
import { buildGuardrailTheme as buildTailwindTheme } from "@razorwind/tailwindcss/stylelint";
import type {
  DesignSystemManifest,
  ManifestFont,
  StylelintPluginOptions,
  TailwindGuardrailTheme
} from "./types";

export { DEFAULT_PREFIX };

function collectManifestFonts(fonts: Schema["fonts"]): ManifestFont[] {
  return Object.values(fonts ?? {}).map(font => ({
    family: font.family ?? font.title ?? font.name,
    ...(font.role ? { role: font.role } : {})
  }));
}

function hasTokens(tokens: Schema["tokens"] | undefined): boolean {
  return !!tokens && resolveTokenSets(tokens).length > 0;
}

/**
 * Build the design-system manifest the generated Stylelint module
 * serializes: the schema's tokens, components and fonts, plus the Tailwind
 * guardrail theme when that integration is enabled. Tokens are collected
 * exactly as `\@razorwind/eslint` collects them, so both linters agree on
 * CSS variable names, categories and deprecations.
 */
export function buildManifest(
  spec: Schema,
  options: StylelintPluginOptions = {}
): DesignSystemManifest {
  const prefix = options.prefix ?? DEFAULT_PREFIX;
  const cssVarPrefix =
    options.cssVarPrefix === false
      ? undefined
      : (options.cssVarPrefix ?? cssVarPrefixFromName(spec.name));

  const manifest: DesignSystemManifest = {
    name: spec.name ?? DEFAULT_PREFIX,
    version: "0.0.0",
    prefix,
    ...(cssVarPrefix ? { cssVarPrefix } : {}),
    themes: hasTokens(spec.tokens)
      ? resolveTokenSets(spec.tokens)
          .map(set => set.id)
          .filter(id => id !== "default")
      : [],
    tokens: hasTokens(spec.tokens)
      ? collectManifestTokens(spec.tokens, cssVarPrefix)
      : [],
    components: collectManifestComponents(spec.components),
    fonts: collectManifestFonts(spec.fonts)
  };

  const tailwind =
    options.tailwind === false ? undefined : buildTailwind(spec, prefix);
  if (tailwind) {
    manifest.tailwind = tailwind;
  }

  return manifest;
}

function buildTailwind(
  spec: Schema,
  prefix: string
): TailwindGuardrailTheme | undefined {
  const theme = buildTailwindTheme(
    hasTokens(spec.tokens) ? flattenThemeTokens(spec.tokens) : [],
    { fonts: spec.fonts, name: spec.name, prefix }
  );

  return Object.keys(theme.namespaces).length > 0 ? theme : undefined;
}
