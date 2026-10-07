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

import type { Schema, Tokens } from "@razorwind/core/schema";
import type { BaseFlatToken } from "@razorwind/core/utils";
import {
  cssVarPrefixFromName,
  flattenTokens,
  formatTokenValue,
  isObject,
  isTokenLeaf,
  resolveTokenSets
} from "@razorwind/core/utils";
import { buildGuardrailTheme as buildTailwindTheme } from "@razorwind/tailwindcss/eslint";
import { flattenThemeTokens } from "@razorwind/tailwindcss/generate";
import type { TamaguiTokenCategory } from "@razorwind/tamagui";
import {
  collectTamaguiVocabulary,
  flattenTokens as flattenTamaguiTokens,
  resolveTokenCategory
} from "@razorwind/tamagui";
import { buildGuardrailTheme as buildTamaguiTheme } from "@razorwind/tamagui/eslint";
import type {
  ComponentRole,
  DesignSystemManifest,
  EslintPluginOptions,
  ManifestComponent,
  ManifestFont,
  ManifestToken,
  TailwindGuardrailTheme,
  TamaguiGuardrailTheme,
  TokenCategory
} from "./types";

export const DEFAULT_PREFIX = "design-system";

/** Theme ids preferred as the source of a token's comparison value. */
const PRIMARY_THEME_IDS = ["light", "default", "base"];

const DTCG_ALIAS = /^\{([^}]+)\}$/;
const DTCG_REFERENCE = /\{([^}]+)\}/;

/** DTCG `$type` values that decide the category on their own. */
const TYPE_CATEGORIES: Readonly<Record<string, TokenCategory>> = {
  color: "color",
  shadow: "shadow",
  typography: "typography",
  fontFamily: "fontFamily",
  fontWeight: "fontWeight",
  duration: "duration",
  cubicBezier: "easing"
};

/** `createTokens` categories mapped onto the lint categories. */
const TAMAGUI_CATEGORIES: Partial<Record<TamaguiTokenCategory, TokenCategory>> =
  {
    color: "color",
    space: "space",
    size: "size",
    radius: "radius",
    zIndex: "zIndex",
    fontSize: "fontSize",
    fontWeight: "fontWeight",
    shadow: "shadow",
    insetShadow: "shadow",
    dropShadow: "shadow",
    textShadow: "shadow",
    boxShadow: "shadow"
  };

/**
 * Words a schema component's name or title is matched against (lowercased,
 * non-alphanumerics removed) to infer its role.
 */
const ROLE_NAMES: Readonly<Record<ComponentRole, readonly string[]>> = {
  button: ["button"],
  "icon-button": ["iconbutton"],
  link: ["link", "anchor", "textlink"],
  checkbox: ["checkbox"],
  code: ["code", "inlinecode", "codeblock"],
  heading: ["heading"],
  image: ["image", "img"],
  radio: ["radio", "radiogroup"],
  range: ["slider", "range"],
  select: ["select", "nativeselect"],
  "text-input": ["input", "textinput", "textfield"],
  textarea: ["textarea"],
  text: ["text", "typography"],
  "visually-hidden": ["visuallyhidden", "sronly", "screenreaderonly"],
  icon: ["icon"],
  primitive: [
    "box",
    "stack",
    "hstack",
    "vstack",
    "xstack",
    "ystack",
    "inline",
    "flex",
    "grid",
    "center"
  ]
};

/**
 * Kebab-case a CSS custom-property name the way Style Dictionary's
 * `name/kebab` transform does, so `--acme-font-size-md` matches the CSS the
 * `@razorwind/css` generator emits.
 */
export function kebabCase(value: string): string {
  return value
    .replaceAll(/([\p{Ll}\d])(\p{Lu})/gu, "$1 $2")
    .replaceAll(/(\p{Lu})(\p{Lu}\p{Ll})/gu, "$1 $2")
    .split(/[^\p{L}\d]+/u)
    .filter(Boolean)
    .join("-")
    .toLowerCase();
}

/** `icon-button` / `Icon Button` → `IconButton`. */
export function pascalCase(value: string): string {
  return value
    .split(/[^a-z0-9]+/i)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function compact(value: string): string {
  return value.toLowerCase().replaceAll(/[^a-z0-9]/g, "");
}

/**
 * Lint category of a token, from its DTCG `$type` and path. Paths the
 * Tamagui generator understands are classified by its `resolveTokenCategory`.
 */
export function resolveCategory(
  path: string,
  type?: string
): TokenCategory | undefined {
  const segments = path.split(".").map(segment => segment.toLowerCase());
  const has = (...names: string[]) =>
    names.some(name => segments.includes(name));
  const pair = (first: string, second: string) =>
    segments.some(
      (segment, index) => segment === first && segments[index + 1] === second
    );

  const byType = type ? TYPE_CATEGORIES[type] : undefined;
  if (byType) {
    return byType;
  }

  if (
    has("font-size", "fontsize") ||
    pair("font", "size") ||
    pair("text", "size")
  ) {
    return "fontSize";
  }
  if (has("font-weight", "fontweight") || pair("font", "weight")) {
    return "fontWeight";
  }
  if (has("font-family", "fontfamily") || pair("font", "family")) {
    return "fontFamily";
  }
  if (has("line-height", "lineheight", "leading") || pair("line", "height")) {
    return "lineHeight";
  }
  if (
    has("letter-spacing", "letterspacing", "tracking") ||
    pair("letter", "spacing")
  ) {
    return "letterSpacing";
  }
  if (
    has(
      "border-width",
      "borderwidth",
      "stroke-width",
      "strokewidth",
      "outline-width"
    ) ||
    (has("border", "stroke", "outline") && has("width"))
  ) {
    return "borderWidth";
  }
  if (has("duration", "durations", "delay")) {
    return "duration";
  }
  if (has("easing", "ease", "timing", "cubic-bezier")) {
    return "easing";
  }
  if (has("opacity", "opacities")) {
    return "opacity";
  }

  const category = resolveTokenCategory(path, type);

  return category ? TAMAGUI_CATEGORIES[category] : undefined;
}

/** `$deprecated` per token path, inherited from groups. */
function collectDeprecations(
  tokens: Tokens | Record<string, Tokens>
): Map<string, true | string> {
  const deprecated = new Map<string, true | string>();
  const walk = (
    node: unknown,
    path: string[],
    inherited: true | string | undefined
  ) => {
    if (!isObject(node)) {
      return;
    }
    const own = node.$deprecated;
    const current =
      own === true || (typeof own === "string" && own.length > 0)
        ? own
        : own === false
          ? undefined
          : inherited;
    if (isTokenLeaf(node)) {
      if (current && !deprecated.has(path.join("."))) {
        deprecated.set(path.join("."), current);
      }
      return;
    }
    for (const [key, child] of Object.entries(node)) {
      if (!key.startsWith("$")) {
        walk(child, [...path, key], current);
      }
    }
  };

  for (const set of resolveTokenSets(tokens)) {
    walk(set.tokens, [], undefined);
  }

  return deprecated;
}

function themeRank(theme: string | undefined): number {
  if (theme === undefined) {
    return -1;
  }
  const index = PRIMARY_THEME_IDS.indexOf(theme.toLowerCase());

  return index < 0 ? PRIMARY_THEME_IDS.length : index;
}

/**
 * Collect the schema's tokens: category, CSS variable, resolved value in the
 * primary theme, alias flag and deprecation.
 */
export function collectManifestTokens(
  tokens: Tokens | Record<string, Tokens>,
  cssVarPrefix?: string
): ManifestToken[] {
  const rows = flattenTokens(tokens);
  const deprecations = collectDeprecations(tokens);

  // Primary row per path, plus per-theme lookup for alias resolution.
  const primary = new Map<string, BaseFlatToken>();
  const byTheme = new Map<string, BaseFlatToken>();
  for (const row of rows) {
    byTheme.set(`${row.theme ?? ""}:${row.path}`, row);
    const current = primary.get(row.path);
    if (!current || themeRank(row.theme) < themeRank(current.theme)) {
      primary.set(row.path, row);
    }
  }

  const resolve = (row: BaseFlatToken, depth = 0): BaseFlatToken => {
    const alias =
      typeof row.value === "string"
        ? DTCG_ALIAS.exec(row.value)?.[1]
        : undefined;
    if (!alias || depth > 10) {
      return row;
    }
    const target =
      byTheme.get(`${row.theme ?? ""}:${alias}`) ?? primary.get(alias);

    return target ? resolve(target, depth + 1) : row;
  };

  return [...primary.values()]
    .map(row => {
      const resolved = resolve(row);
      const type = row.type ?? resolved.type;
      const value = formatTokenValue(resolved.value, type);
      const deprecated = deprecations.get(row.path);
      const replacement =
        typeof deprecated === "string"
          ? DTCG_REFERENCE.exec(deprecated)?.[1]
          : undefined;
      const category = resolveCategory(row.path, type);

      const token: ManifestToken = {
        path: row.path,
        cssVar: `--${kebabCase([cssVarPrefix ?? "", ...row.path.split(".")].join(" "))}`
      };
      if (type) {
        token.type = type;
      }
      if (category) {
        token.category = category;
      }
      if (value && !/^[[{]/.test(value) && !value.includes("var(")) {
        token.value = value;
      }
      if (resolved !== row) {
        token.alias = true;
      }
      if (deprecated) {
        token.deprecated = deprecated;
      }
      if (replacement && primary.has(replacement)) {
        token.replacement = replacement;
      }

      return token;
    })
    .sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }));
}

/** Schema components with their JSX names, roles and deprecation. */
export function collectManifestComponents(
  components: Schema["components"]
): ManifestComponent[] {
  const all = Object.values(components ?? {});
  const unscopedName = (value: string) => value.replace(/^@[^/]+\//, "");
  const jsxNames = (component: (typeof all)[number]) => [
    ...new Set(
      [component.title, component.name]
        .map(name => pascalCase(unscopedName(name)))
        .filter(Boolean)
    )
  ];

  return all
    .map(component => {
      const words = new Set([
        compact(unscopedName(component.name)),
        compact(unscopedName(component.title))
      ]);
      const roles = (Object.keys(ROLE_NAMES) as ComponentRole[]).filter(role =>
        ROLE_NAMES[role].some(name => words.has(name))
      );
      const deprecated = component.tags?.some(
        tag => tag.toLowerCase() === "deprecated"
      );
      const replacements = (component.related ?? []).flatMap(name => {
        const related = all.find(item => item.name === name);

        return related ? [jsxNames(related)[0]!] : [];
      });

      const entry: ManifestComponent = {
        name: component.name,
        jsx: jsxNames(component),
        roles
      };
      if (deprecated) {
        entry.deprecated = true;
        if (replacements.length > 0) {
          entry.replacements = replacements;
        }
      }

      return entry;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** `arrow-right` → `ArrowRightIcon`, including icon aliases. */
export function collectManifestIcons(icons: Schema["icons"]): string[] {
  return [
    ...new Set(
      Object.values(icons ?? {}).flatMap(icon =>
        [icon.name, ...(icon.aliases ?? [])]
          .map(name => pascalCase(name).replace(/Icon$/, ""))
          .filter(Boolean)
          .map(name => `${name}Icon`)
      )
    )
  ].sort();
}

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
 * Build the design-system manifest the generated ESLint module serializes:
 * the schema's tokens, components, icons and fonts, plus the Tailwind and
 * Tamagui guardrail themes when those integrations are enabled.
 */
export function buildManifest(
  spec: Schema,
  options: EslintPluginOptions = {}
): DesignSystemManifest {
  const name = spec.name ?? DEFAULT_PREFIX;
  const prefix = options.prefix ?? DEFAULT_PREFIX;
  const cssVarPrefix =
    options.cssVarPrefix === false
      ? undefined
      : (options.cssVarPrefix ?? cssVarPrefixFromName(spec.name));
  const tokens = hasTokens(spec.tokens)
    ? collectManifestTokens(spec.tokens, cssVarPrefix)
    : [];

  const manifest: DesignSystemManifest = {
    name,
    version: "0.0.0",
    prefix,
    ...(cssVarPrefix ? { cssVarPrefix } : {}),
    themes: hasTokens(spec.tokens)
      ? resolveTokenSets(spec.tokens)
          .map(set => set.id)
          .filter(id => id !== "default")
      : [],
    tokens,
    components: collectManifestComponents(spec.components),
    icons: collectManifestIcons(spec.icons),
    fonts: collectManifestFonts(spec.fonts)
  };

  const tailwind =
    options.tailwind === false ? undefined : buildTailwind(spec, prefix);
  if (tailwind) {
    manifest.tailwind = tailwind;
  }
  const tamagui = options.tamagui
    ? buildTamagui(spec, prefix, options)
    : undefined;
  if (tamagui) {
    manifest.tamagui = tamagui;
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

function buildTamagui(
  spec: Schema,
  prefix: string,
  options: EslintPluginOptions
): TamaguiGuardrailTheme | undefined {
  const tamagui = typeof options.tamagui === "object" ? options.tamagui : {};
  const theme = buildTamaguiTheme(
    collectTamaguiVocabulary(
      spec,
      hasTokens(spec.tokens)
        ? flattenTamaguiTokens(spec.tokens, {
            includeTypes: tamagui.includeTypes
          })
        : []
    ),
    { name: spec.name, prefix, shorthands: tamagui.shorthands }
  );

  return Object.keys(theme.tokens).length > 0 ? theme : undefined;
}
