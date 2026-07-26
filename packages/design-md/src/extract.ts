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
import { flattenTokens } from "./flatten";
import { formatTokenValue, toTokenName } from "./format";
import type {
  DesignMdDocument,
  FlatToken,
  Options,
  TypographyToken
} from "./types";

/** DESIGN.md component properties considered valid by the spec linter. */
const VALID_COMPONENT_PROPS = new Set([
  "backgroundColor",
  "textColor",
  "typography",
  "rounded",
  "padding",
  "size",
  "height",
  "width"
]);

/** Common token property names mapped onto valid DESIGN.md component props. */
const COMPONENT_PROP_ALIASES: Record<string, string> = {
  background: "backgroundColor",
  backgroundcolor: "backgroundColor",
  bg: "backgroundColor",
  fill: "backgroundColor",
  color: "textColor",
  foreground: "textColor",
  text: "textColor",
  textcolor: "textColor",
  font: "typography",
  radius: "rounded",
  borderradius: "rounded",
  corner: "rounded"
};

const COLOR_PREFIXES = ["color", "colors", "palette"];
const TYPOGRAPHY_PREFIXES = ["typography", "type", "text", "font", "fonts"];
const ROUNDED_PATTERN = /(?:^|\.)(?:radius|radii|rounded|corner)(?:\.|$)/i;
const SPACING_PATTERN = /(?:^|\.)(?:spacing|space|gap)(?:\.|$)/i;
const COMPONENT_PATTERN = /^components?$/i;
const ALIAS_PATTERN = /^\{([^}]+)\}$/;

const TYPOGRAPHY_SUB_PROPERTIES = [
  "fontFamily",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "letterSpacing"
] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Select the token set used for the front matter when tokens are split into
 * multiple themes: the un-themed set first, then `light`, then `default`,
 * then whichever theme appears first.
 */
export function selectPrimaryTheme(flat: FlatToken[]): FlatToken[] {
  const themes = [...new Set(flat.map(token => token.theme))];

  const preferred =
    themes.find(theme => theme === undefined) ??
    themes.find(theme => /^light/i.test(theme ?? "")) ??
    themes.find(theme => /^(?:default|base)/i.test(theme ?? "")) ??
    themes[0];

  return flat.filter(token => token.theme === preferred);
}

function readAliasPath(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const match = ALIAS_PATTERN.exec(value.trim());

  return match?.[1];
}

/**
 * Resolve a chain of DTCG aliases (`{color.primary}`) to the terminal token.
 */
function resolveAlias(
  token: FlatToken,
  byPath: Map<string, FlatToken>
): FlatToken {
  let current = token;

  for (let depth = 0; depth < 8; depth++) {
    const aliasPath = readAliasPath(current.value);
    if (!aliasPath) {
      return current;
    }

    const target = byPath.get(aliasPath);
    if (!target) {
      return current;
    }

    current = target;
  }

  return current;
}

function toCamelCase(value: string): string {
  return value
    .split(/[-_.\s]+/)
    .filter(Boolean)
    .map((part, index) =>
      index === 0
        ? part.toLowerCase()
        : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    )
    .join("");
}

function normalizeComponentProp(name: string): string | undefined {
  const camel = toCamelCase(name);

  if (VALID_COMPONENT_PROPS.has(camel)) {
    return camel;
  }

  return COMPONENT_PROP_ALIASES[camel.toLowerCase()];
}

function extractTypographyValue(
  value: unknown,
  byPath: Map<string, FlatToken>
): TypographyToken {
  const typography: TypographyToken = {};

  if (!isPlainObject(value)) {
    return typography;
  }

  for (const property of TYPOGRAPHY_SUB_PROPERTIES) {
    const raw = value[property];
    if (raw === undefined || raw === null) {
      continue;
    }

    const aliasPath = readAliasPath(raw);
    const target = aliasPath ? byPath.get(aliasPath) : undefined;
    const resolved = target ? resolveAlias(target, byPath).cssValue : undefined;

    if (typeof raw === "number") {
      typography[property] = raw as never;
      continue;
    }

    typography[property] = resolved ?? formatTokenValue(raw);
  }

  return typography;
}

/**
 * Extract a DESIGN.md document from the Razorwind schema.
 *
 * Colors, typography, rounded / spacing scales, and component tokens are
 * derived from the DTCG token tree. DTCG aliases are re-emitted as DESIGN.md
 * `{section.token}` references when the target token is part of the output,
 * or resolved to their terminal CSS value otherwise.
 */
export function extractDesignMd(
  spec: Schema,
  options: Options = {}
): DesignMdDocument {
  const flat = selectPrimaryTheme(flattenTokens(spec.tokens));
  const byPath = new Map(flat.map(token => [token.path, token]));

  const document: DesignMdDocument = {
    name: options.name ?? "Razorwind Design System",
    description: options.description,
    version: options.version ?? "alpha",
    colors: {},
    colorDescriptions: {},
    typography: {},
    rounded: {},
    spacing: {},
    components: {}
  };

  /** DTCG token path → DESIGN.md `section.token` reference target. */
  const refTargets = new Map<string, string>();

  const componentTokens: FlatToken[] = [];

  for (const token of flat) {
    const segments = token.path.split(".");

    if (segments[0] && COMPONENT_PATTERN.test(segments[0])) {
      componentTokens.push(token);
      continue;
    }

    if (token.type === "color") {
      const name = toTokenName(token.path, COLOR_PREFIXES);
      const resolved = resolveAlias(token, byPath);
      document.colors[name] = resolved.cssValue;
      if (token.description) {
        document.colorDescriptions[name] = token.description;
      }
      refTargets.set(token.path, `colors.${name}`);
      continue;
    }

    if (token.type === "typography") {
      const name = toTokenName(token.path, TYPOGRAPHY_PREFIXES);
      document.typography[name] = extractTypographyValue(token.value, byPath);
      refTargets.set(token.path, `typography.${name}`);
      continue;
    }

    if (token.type === "fontFamily") {
      const name = toTokenName(token.path, TYPOGRAPHY_PREFIXES);
      document.typography[name] ??= {};
      document.typography[name].fontFamily = token.cssValue;
      refTargets.set(token.path, `typography.${name}`);
      continue;
    }

    const isScale =
      token.type === "dimension" ||
      token.type === "number" ||
      typeof token.value === "number";

    if (isScale && ROUNDED_PATTERN.test(token.path)) {
      const name = segments.at(-1)!;
      document.rounded[name] = resolveAlias(token, byPath).cssValue;
      refTargets.set(token.path, `rounded.${name}`);
      continue;
    }

    if (isScale && SPACING_PATTERN.test(token.path)) {
      const name = segments.at(-1)!;
      document.spacing[name] = resolveAlias(token, byPath).cssValue;
      refTargets.set(token.path, `spacing.${name}`);
    }
  }

  for (const token of componentTokens) {
    const segments = token.path.split(".").slice(1);
    if (segments.length < 2) {
      continue;
    }

    const property = normalizeComponentProp(segments.at(-1)!);
    if (!property) {
      continue;
    }

    const componentName = segments
      .slice(0, -1)
      .join("-")
      .replaceAll(/[^\w-]+/g, "-")
      .toLowerCase();

    const aliasPath = readAliasPath(token.value);
    const reference = aliasPath ? refTargets.get(aliasPath) : undefined;
    const value = reference
      ? `{${reference}}`
      : resolveAlias(token, byPath).cssValue;

    document.components[componentName] ??= {};
    document.components[componentName][property] = value;
  }

  return document;
}
