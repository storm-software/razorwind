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

import type {
  DesignSystemManifest,
  ManifestToken,
  TokenCategory
} from "../types";
import type { ResolvedSettings } from "./settings";
import {
  normalizeColor,
  normalizeDuration,
  normalizeEasing,
  normalizeFontFamily,
  normalizeFontWeight,
  normalizeLength,
  normalizeNumber,
  normalizeWhitespace
} from "./values";

const MAX_EXAMPLES = 4;
const MAX_SUGGESTIONS = 3;

/** Normalize a literal or token value for comparison within a category. */
export function normalizeTokenValue(
  category: TokenCategory,
  value: string | number
): string | undefined {
  switch (category) {
    case "color":
      return typeof value === "string" ? normalizeColor(value) : undefined;
    case "space":
    case "size":
    case "radius":
    case "borderWidth":
    case "fontSize":
    case "letterSpacing":
      return normalizeLength(value);
    case "lineHeight":
      return typeof value === "number"
        ? normalizeNumber(value)
        : (normalizeNumber(value) ?? normalizeLength(value));
    case "fontWeight":
      return normalizeFontWeight(value);
    case "fontFamily":
      return normalizeFontFamily(String(value));
    case "duration":
      return normalizeDuration(value);
    case "easing":
      return normalizeEasing(String(value));
    case "zIndex":
    case "opacity":
      return normalizeNumber(value);
    case "shadow":
    case "typography":
      return normalizeWhitespace(String(value));
  }
}

function levenshtein(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(
        previous[j]! + 1,
        current[j - 1]! + 1,
        previous[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    previous = current;
  }

  return previous[b.length]!;
}

/** Semantic (aliased) tokens first, then shorter paths. */
function compareTokens(a: ManifestToken, b: ManifestToken): number {
  return (
    Number(!!b.alias) - Number(!!a.alias) ||
    a.path.split(".").length - b.path.split(".").length ||
    a.path.localeCompare(b.path, undefined, { numeric: true })
  );
}

export interface TokenIndex {
  byPath: ReadonlyMap<string, ManifestToken>;
  byCssVar: ReadonlyMap<string, ManifestToken>;
  /** True when the schema defines a token in any of the categories. */
  has: (...categories: TokenCategory[]) => boolean;
  /** Non-deprecated tokens whose value equals `value`, best match first. */
  find: (
    categories: TokenCategory[],
    value: string | number
  ) => ManifestToken[];
  /** True when a custom property belongs to the design system's namespace. */
  isDesignSystemVar: (name: string) => boolean;
  /** Closest token paths (or CSS vars) to a misspelled one. */
  similar: (name: string, by?: "path" | "cssVar") => string[];
  /** How a suggestion references a token. */
  reference: (token: ManifestToken, settings: ResolvedSettings) => string;
  /** ` (e.g. var(--a), var(--b), …)` for a message. */
  examples: (categories: TokenCategory[], settings: ResolvedSettings) => string;
}

/** Build lookup tables over the manifest's tokens. */
export function createTokenIndex(manifest: DesignSystemManifest): TokenIndex {
  const byPath = new Map<string, ManifestToken>();
  const byCssVar = new Map<string, ManifestToken>();
  const byCategory = new Map<TokenCategory, ManifestToken[]>();
  const byValue = new Map<string, ManifestToken[]>();
  const namespaces = new Set<string>();

  for (const token of manifest.tokens) {
    byPath.set(token.path, token);
    byCssVar.set(token.cssVar, token);
    if (!manifest.cssVarPrefix) {
      namespaces.add(token.cssVar.replace(/^--/, "").split("-")[0]!);
    }
    if (!token.category) {
      continue;
    }
    byCategory.set(token.category, [
      ...(byCategory.get(token.category) ?? []),
      token
    ]);
    const normalized =
      token.value === undefined
        ? undefined
        : normalizeTokenValue(token.category, token.value);
    if (normalized !== undefined && !token.deprecated) {
      const key = `${token.category}:${normalized}`;
      byValue.set(key, [...(byValue.get(key) ?? []), token]);
    }
  }
  for (const tokens of byValue.values()) {
    tokens.sort(compareTokens);
  }

  const reference = (token: ManifestToken, settings: ResolvedSettings) =>
    settings.tokenReference === "function"
      ? `${settings.tokenFunctions[0] ?? "token"}(${JSON.stringify(token.path)})`
      : `var(${token.cssVar})`;

  return {
    byPath,
    byCssVar,
    has: (...categories) =>
      categories.some(category => (byCategory.get(category)?.length ?? 0) > 0),
    find(categories, value) {
      return categories
        .flatMap(category => {
          const normalized = normalizeTokenValue(category, value);

          return normalized === undefined
            ? []
            : (byValue.get(`${category}:${normalized}`) ?? []);
        })
        .slice(0, MAX_SUGGESTIONS);
    },
    isDesignSystemVar(name) {
      const bare = name.replace(/^--/, "");

      return manifest.cssVarPrefix
        ? bare.startsWith(`${manifest.cssVarPrefix}-`)
        : namespaces.has(bare.split("-")[0]!);
    },
    similar(name, by = "path") {
      const candidates =
        by === "path" ? [...byPath.keys()] : [...byCssVar.keys()];
      const limit = Math.max(2, Math.floor(name.length / 5));

      return candidates
        .map(candidate => ({
          candidate,
          distance: levenshtein(name, candidate)
        }))
        .filter(({ distance }) => distance <= limit)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, MAX_SUGGESTIONS)
        .map(({ candidate }) => candidate);
    },
    reference,
    examples(categories, settings) {
      const tokens = categories
        .flatMap(category => byCategory.get(category) ?? [])
        .filter(token => !token.deprecated)
        .toSorted(compareTokens);
      if (tokens.length === 0) {
        return "";
      }

      const shown = tokens
        .slice(0, MAX_EXAMPLES)
        .map(token => reference(token, settings));

      return ` (e.g. ${shown.join(", ")}${tokens.length > shown.length ? ", …" : ""})`;
    }
  };
}
