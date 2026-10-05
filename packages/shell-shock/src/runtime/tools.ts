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

import { colorDistance, toHexColor } from "./color";
import type {
  DesignComponentRecord,
  DesignFontRecord,
  DesignIconRecord,
  DesignSystemSnapshot,
  DesignTokenRecord,
  GuidelineDocument
} from "./records";
import {
  getComponentRecords,
  getFontRecords,
  getGuidelineDocuments,
  getIconRecords,
  getTokenRecords
} from "./records";
import type { SearchKey } from "./search";
import { fuzzySearch, normalizeTerms } from "./search";

/** Default per-term result limit (matches the ADS MCP tools). */
export const DEFAULT_SEARCH_LIMIT = 2;

/**
 * Error result returned when a search finds nothing. Lists the available
 * names so callers can retry with a better term (as the ADS tools do).
 */
export interface SearchError {
  error: string;
  available: string[];
}

export function isSearchError(value: unknown): value is SearchError {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof (value as SearchError).error === "string"
  );
}

export interface SearchToolOptions {
  /** One or more search terms. */
  terms: readonly string[];
  /** Maximum matches per term. @defaultValue 2 */
  limit?: number;
}

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

export interface SearchTokensOptions extends SearchToolOptions {
  /** Include type, description, theme and CSS variable in each result. */
  includeMetadata?: boolean;
}

/** Compact token search hit (`includeMetadata: false`). */
export interface TokenSearchHit {
  name: string;
  value: string;
  theme?: string;
}

/** Token search hit with metadata (`includeMetadata: true`). */
export interface TokenSearchHitWithMetadata extends TokenSearchHit {
  type?: string;
  description?: string;
  hex?: string;
  cssVariable: string;
}

const TOKEN_KEYS: SearchKey<DesignTokenRecord>[] = [
  { name: "name", weight: 5, get: token => token.name },
  { name: "path", weight: 2, get: token => token.path },
  { name: "description", weight: 2, get: token => token.description },
  { name: "type", weight: 1.5, get: token => token.type },
  { name: "value", weight: 0.5, get: token => token.value },
  { name: "hex", weight: 0.5, get: token => token.hex }
];

function tokenId(token: DesignTokenRecord): string {
  return token.theme ? `${token.theme}:${token.name}` : token.name;
}

function describeTerms(terms: readonly string[]): string {
  return normalizeTerms(terms).join(", ");
}

/**
 * Search design tokens by name, path, description, type and value.
 *
 * Equivalent of the ADS MCP `ads_search_tokens` tool.
 */
export function searchTokens(
  snapshot: DesignSystemSnapshot,
  options: SearchTokensOptions
): Array<TokenSearchHit | TokenSearchHitWithMetadata> | SearchError {
  const tokens = getTokenRecords(snapshot.spec);
  const matches = fuzzySearch(tokens, options.terms, {
    keys: TOKEN_KEYS,
    limit: options.limit ?? DEFAULT_SEARCH_LIMIT,
    idOf: tokenId
  });

  if (matches.length === 0) {
    return {
      error: `No tokens found for '${describeTerms(options.terms)}'.`,
      available: [...new Set(tokens.map(token => token.name))]
    };
  }

  return matches.map(({ item }) => {
    const hit: TokenSearchHitWithMetadata = {
      name: item.name,
      value: item.value,
      ...(item.theme ? { theme: item.theme } : {}),
      type: item.type,
      description: item.description,
      hex: item.hex,
      cssVariable: item.cssVariable
    };

    if (options.includeMetadata) {
      return hit;
    }

    const compact: TokenSearchHit = { name: hit.name, value: hit.value };
    if (hit.theme) {
      compact.theme = hit.theme;
    }
    return compact;
  });
}

/**
 * Return every design token. Equivalent of `ads_get_all_tokens`.
 */
export function listTokens(
  snapshot: DesignSystemSnapshot
): DesignTokenRecord[] {
  return getTokenRecords(snapshot.spec);
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

const COMPONENT_KEYS: SearchKey<DesignComponentRecord>[] = [
  { name: "name", weight: 5, get: component => component.name },
  { name: "title", weight: 4, get: component => component.title },
  { name: "category", weight: 2, get: component => component.category },
  { name: "description", weight: 2, get: component => component.description },
  { name: "tags", weight: 2, get: component => component.tags },
  { name: "type", weight: 1, get: component => component.type },
  { name: "related", weight: 1, get: component => component.related },
  {
    name: "examples",
    weight: 1,
    get: component =>
      component.examples.map(
        example => `${example.title ?? ""} ${example.description ?? ""}`
      )
  }
];

/** Trimmed component payload returned by {@link searchComponents}. */
export type ComponentSearchHit = Pick<
  DesignComponentRecord,
  | "name"
  | "title"
  | "type"
  | "category"
  | "description"
  | "tags"
  | "files"
  | "examples"
  | "dependencies"
  | "registryDependencies"
>;

/**
 * Search components by name, title, category, description and tags.
 *
 * Equivalent of the ADS MCP `ads_search_components` tool.
 */
export function searchComponents(
  snapshot: DesignSystemSnapshot,
  options: SearchToolOptions
): ComponentSearchHit[] | SearchError {
  const components = getComponentRecords(snapshot.spec);
  const matches = fuzzySearch(components, options.terms, {
    keys: COMPONENT_KEYS,
    limit: options.limit ?? DEFAULT_SEARCH_LIMIT,
    idOf: component => component.name
  });

  if (matches.length === 0) {
    return {
      error: `No components found for '${describeTerms(options.terms)}'.`,
      available: components.map(component => component.name)
    };
  }

  return matches.map(({ item }) => ({
    name: item.name,
    title: item.title,
    type: item.type,
    category: item.category,
    description: item.description,
    tags: item.tags,
    files: item.files,
    examples: item.examples,
    dependencies: item.dependencies,
    registryDependencies: item.registryDependencies
  }));
}

/**
 * Return every component record. Equivalent of `ads_get_all_components`.
 */
export function listComponents(
  snapshot: DesignSystemSnapshot
): DesignComponentRecord[] {
  return getComponentRecords(snapshot.spec);
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

const ICON_KEYS: SearchKey<DesignIconRecord>[] = [
  { name: "name", weight: 5, get: icon => icon.name },
  { name: "title", weight: 4, get: icon => icon.title },
  { name: "aliases", weight: 3, get: icon => icon.aliases },
  { name: "tags", weight: 2, get: icon => icon.tags },
  { name: "category", weight: 2, get: icon => icon.category },
  { name: "description", weight: 2, get: icon => icon.description },
  { name: "related", weight: 1, get: icon => icon.related }
];

/** Trimmed icon payload returned by {@link searchIcons}. */
export type IconSearchHit = Pick<
  DesignIconRecord,
  "name" | "title" | "category" | "description" | "tags" | "aliases" | "files"
>;

/**
 * Search icons by name, title, aliases, tags and category.
 *
 * Equivalent of the ADS MCP `ads_search_icons` tool.
 */
export function searchIcons(
  snapshot: DesignSystemSnapshot,
  options: SearchToolOptions
): IconSearchHit[] | SearchError {
  const icons = getIconRecords(snapshot.spec);
  const matches = fuzzySearch(icons, options.terms, {
    keys: ICON_KEYS,
    limit: options.limit ?? DEFAULT_SEARCH_LIMIT,
    idOf: icon => icon.name
  });

  if (matches.length === 0) {
    return {
      error: `No icons found for '${describeTerms(options.terms)}'.`,
      available: icons.map(icon => icon.name)
    };
  }

  return matches.map(({ item }) => ({
    name: item.name,
    title: item.title,
    category: item.category,
    description: item.description,
    tags: item.tags,
    aliases: item.aliases,
    files: item.files
  }));
}

/**
 * Return every icon record. Equivalent of `ads_get_all_icons`.
 */
export function listIcons(snapshot: DesignSystemSnapshot): DesignIconRecord[] {
  return getIconRecords(snapshot.spec);
}

// ---------------------------------------------------------------------------
// Fonts
// ---------------------------------------------------------------------------

const FONT_KEYS: SearchKey<DesignFontRecord>[] = [
  { name: "name", weight: 5, get: font => font.name },
  { name: "title", weight: 4, get: font => font.title },
  { name: "family", weight: 4, get: font => font.family },
  { name: "role", weight: 3, get: font => font.role },
  { name: "tags", weight: 2, get: font => font.tags },
  { name: "category", weight: 2, get: font => font.category },
  { name: "description", weight: 2, get: font => font.description }
];

/**
 * Search fonts by name, family, role, tags and category.
 *
 * Razorwind extension — the ADS MCP server has no typography catalog.
 */
export function searchFonts(
  snapshot: DesignSystemSnapshot,
  options: SearchToolOptions
): DesignFontRecord[] | SearchError {
  const fonts = getFontRecords(snapshot.spec);
  const matches = fuzzySearch(fonts, options.terms, {
    keys: FONT_KEYS,
    limit: options.limit ?? DEFAULT_SEARCH_LIMIT,
    idOf: font => font.name
  });

  if (matches.length === 0) {
    return {
      error: `No fonts found for '${describeTerms(options.terms)}'.`,
      available: fonts.map(font => font.name)
    };
  }

  return matches.map(({ item }) => item);
}

/**
 * Return every font record.
 */
export function listFonts(snapshot: DesignSystemSnapshot): DesignFontRecord[] {
  return getFontRecords(snapshot.spec);
}

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------

export interface PlanOptions {
  tokens?: readonly string[];
  icons?: readonly string[];
  components?: readonly string[];
  fonts?: readonly string[];
  /** Maximum matches per term for each list. @defaultValue 2 */
  limit?: number;
}

export interface PlanResult {
  searchResults: {
    tokens?: ReturnType<typeof searchTokens>;
    icons?: ReturnType<typeof searchIcons>;
    components?: ReturnType<typeof searchComponents>;
    fonts?: ReturnType<typeof searchFonts>;
  };
  summary: {
    tokensFound: number;
    iconsFound: number;
    componentsFound: number;
    fontsFound: number;
  };
}

function countHits(result: unknown[] | SearchError | undefined): number {
  return Array.isArray(result) ? result.length : 0;
}

/**
 * Run token, icon, component and font searches in a single call.
 *
 * Equivalent of the ADS MCP `ads_plan` tool. Returns a {@link SearchError}
 * when no list contains search terms.
 */
export function plan(
  snapshot: DesignSystemSnapshot,
  options: PlanOptions
): PlanResult | SearchError {
  const tokens = normalizeTerms(options.tokens);
  const icons = normalizeTerms(options.icons);
  const components = normalizeTerms(options.components);
  const fonts = normalizeTerms(options.fonts);

  if (
    tokens.length === 0 &&
    icons.length === 0 &&
    components.length === 0 &&
    fonts.length === 0
  ) {
    return {
      error:
        "At least one search type (tokens, icons, components, or fonts) must be provided with search terms",
      available: ["tokens", "icons", "components", "fonts"]
    };
  }

  const limit = options.limit ?? DEFAULT_SEARCH_LIMIT;
  const result: PlanResult = {
    searchResults: {},
    summary: {
      tokensFound: 0,
      iconsFound: 0,
      componentsFound: 0,
      fontsFound: 0
    }
  };

  if (tokens.length > 0) {
    result.searchResults.tokens = searchTokens(snapshot, {
      terms: tokens,
      limit
    });
    result.summary.tokensFound = countHits(result.searchResults.tokens);
  }
  if (icons.length > 0) {
    result.searchResults.icons = searchIcons(snapshot, { terms: icons, limit });
    result.summary.iconsFound = countHits(result.searchResults.icons);
  }
  if (components.length > 0) {
    result.searchResults.components = searchComponents(snapshot, {
      terms: components,
      limit
    });
    result.summary.componentsFound = countHits(result.searchResults.components);
  }
  if (fonts.length > 0) {
    result.searchResults.fonts = searchFonts(snapshot, { terms: fonts, limit });
    result.summary.fontsFound = countHits(result.searchResults.fonts);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Guidelines
// ---------------------------------------------------------------------------

export interface GuidelinesOptions {
  /** Search terms. Omit or pass an empty list for the full guideline set. */
  terms?: readonly string[];
  /** Maximum matches per term when searching. @defaultValue 1 */
  limit?: number;
}

const GUIDELINE_KEYS: SearchKey<GuidelineDocument>[] = [
  { name: "keywords", weight: 3, get: doc => doc.keywords },
  { name: "title", weight: 2, get: doc => doc.title },
  { name: "content", weight: 1, get: doc => doc.content }
];

/**
 * Return design-system guidelines as Markdown.
 *
 * Equivalent of the ADS MCP `ads_get_guidelines` tool: with `terms`, fuzzy
 * search over keywords and body and concatenate matches; without, return the
 * full guideline set.
 */
export function getGuidelines(
  snapshot: DesignSystemSnapshot,
  options: GuidelinesOptions = {}
): string {
  const docs = getGuidelineDocuments(snapshot);
  const terms = normalizeTerms(options.terms);

  const selected =
    terms.length === 0
      ? docs
      : fuzzySearch(docs, terms, {
          keys: GUIDELINE_KEYS,
          limit: options.limit ?? 1,
          idOf: doc => doc.id ?? doc.content
        }).map(match => match.item);

  return selected.map(doc => doc.content.trimEnd()).join("\n\n");
}

// ---------------------------------------------------------------------------
// Accessibility analysis
// ---------------------------------------------------------------------------

export interface AnalyzeA11yOptions {
  /** Optional label for the component under review. */
  componentName?: string;
  /** Optional usage context (form, modal, …). */
  context?: string;
  /**
   * Run regex-based heuristics over the code string.
   *
   * @defaultValue true
   */
  includePatternAnalysis?: boolean;
  /**
   * Maximum color distance for a hard-coded color to be matched to a token.
   *
   * @defaultValue 120
   */
  maxTokenDistance?: number;
}

export interface A11yViolation {
  type: string;
  severity: "error" | "warning";
  count: number;
  suggestion: string;
  fix: string;
  example: string;
  source: "pattern-analysis";
}

export interface TokenSuggestion {
  /** The hard-coded color found in the source. */
  color: string;
  /** Nearest design token name. */
  token: string;
  /** Token value. */
  value: string;
  /** CSS custom property for the token. */
  cssVariable: string;
  /** Color distance (lower is closer; 0 is exact). */
  distance: number;
  theme?: string;
}

export interface AnalyzeA11yResult {
  summary: {
    componentName: string;
    context: string;
    totalViolations: number;
    severityBreakdown: { error: number; warning: number };
  };
  violations: A11yViolation[];
  tokenSuggestions: TokenSuggestion[];
  recommendations: string[];
}

interface A11yPattern {
  regex: RegExp;
  type: string;
  severity: "error" | "warning";
  suggestion: string;
  fix: string;
  example: string;
}

const A11Y_PATTERNS: A11yPattern[] = [
  {
    regex: /<button(?![^>]*aria-label)[^>]*>\s*<\/button>/g,
    type: "Button without accessible text",
    severity: "error",
    suggestion:
      "Buttons need a visible label or an `aria-label` so assistive technology can announce them.",
    fix: "Add visible text content or an `aria-label` attribute.",
    example: '<button aria-label="Close dialog">×</button>'
  },
  {
    regex: /<img(?![^>]*\salt=)[^>]*>/g,
    type: "Image without alt text",
    severity: "error",
    suggestion:
      'Every `<img>` needs an `alt` attribute. Use `alt=""` for purely decorative images.',
    fix: "Add a descriptive `alt` attribute (or an empty one for decorative images).",
    example: '<img src="chart.png" alt="Monthly revenue trend" />'
  },
  {
    regex: /<div(?![^>]*role=)[^>]*\sonClick=[^>]*>/g,
    type: "Clickable div without accessibility",
    severity: "warning",
    suggestion:
      "Clickable `<div>` elements are not keyboard focusable and have no semantics.",
    fix: "Use a `<button>` (or the design system's button component) instead of a clickable `<div>`.",
    example: "<button onClick={handleClick}>Open</button>"
  },
  {
    regex: /<div[^>]*role="button"(?![^>]*tabIndex)[^>]*>/g,
    type: "Custom button without full accessibility",
    severity: "warning",
    suggestion:
      '`role="button"` elements also need `tabIndex`, key handlers and an accessible name.',
    fix: "Prefer a native `<button>`; otherwise add `tabIndex={0}` and Enter/Space key handling.",
    example: '<button type="button">Save</button>'
  },
  {
    regex: /<input(?![^>]*\s(?:id|aria-label|aria-labelledby)=)[^>]*>/g,
    type: "Input without associated label",
    severity: "error",
    suggestion:
      "Inputs need an associated `<label>` (via `id`/`htmlFor`) or an `aria-label`.",
    fix: "Add an `id` and a matching `<label htmlFor>` or an `aria-label`.",
    example:
      '<label htmlFor="email">Email</label>\n<input id="email" type="email" />'
  },
  {
    regex: /color:\s*['"]#[0-9a-f]{3,8}['"]/gi,
    type: "Hardcoded color values",
    severity: "warning",
    suggestion:
      "Hard-coded colors bypass the design tokens and break theming and contrast guarantees.",
    fix: "Replace the literal with the nearest design token (see `tokenSuggestions`).",
    example: "color: var(--color-text)"
  },
  {
    regex: /style=\{\{[^}]*\bcolor\b[^}]*\}\}/g,
    type: "Inline color styles",
    severity: "warning",
    suggestion:
      "Inline color styles are hard to audit for contrast and bypass theming.",
    fix: "Move colors into token-driven styles / class names.",
    example: '<Text color="text.muted" />'
  }
];

const HEX_LITERAL_RE = /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/gi;

/**
 * Map hard-coded hex colors in `code` to the nearest color token.
 */
export function suggestTokensForColors(
  snapshot: DesignSystemSnapshot,
  code: string,
  maxDistance = 120
): TokenSuggestion[] {
  const colorTokens = getTokenRecords(snapshot.spec).filter(token => token.hex);
  if (colorTokens.length === 0) {
    return [];
  }

  const literals = [
    ...new Set(
      (code.match(HEX_LITERAL_RE) ?? [])
        .map(literal => toHexColor(literal))
        .filter((literal): literal is string => !!literal)
    )
  ];

  const suggestions: TokenSuggestion[] = [];
  for (const color of literals) {
    let best: { token: DesignTokenRecord; distance: number } | undefined;
    for (const token of colorTokens) {
      const distance = colorDistance(color, token.hex!);
      if (!best || distance < best.distance) {
        best = { token, distance };
      }
    }
    if (best && best.distance <= maxDistance) {
      suggestions.push({
        color,
        token: best.token.name,
        value: best.token.value,
        cssVariable: best.token.cssVariable,
        distance: Math.round(best.distance * 100) / 100,
        ...(best.token.theme ? { theme: best.token.theme } : {})
      });
    }
  }

  return suggestions.toSorted((a, b) => a.distance - b.distance);
}

/**
 * Analyze a React / JSX source string for likely accessibility issues and
 * hard-coded colors that should use design tokens.
 *
 * Equivalent of the ADS MCP `ads_analyze_a11y` tool (pattern analysis path).
 */
export function analyzeA11y(
  snapshot: DesignSystemSnapshot,
  code: string,
  options: AnalyzeA11yOptions = {}
): AnalyzeA11yResult {
  const violations: A11yViolation[] = [];

  if (options.includePatternAnalysis !== false) {
    for (const pattern of A11Y_PATTERNS) {
      const count = (code.match(pattern.regex) ?? []).length;
      if (count > 0) {
        violations.push({
          type: pattern.type,
          severity: pattern.severity,
          count,
          suggestion: pattern.suggestion,
          fix: pattern.fix,
          example: pattern.example,
          source: "pattern-analysis"
        });
      }
    }
  }

  const tokenSuggestions = suggestTokensForColors(
    snapshot,
    code,
    options.maxTokenDistance
  );

  const errors = violations.filter(v => v.severity === "error").length;
  const warnings = violations.length - errors;

  const recommendations: string[] = [];
  if (errors > 0) {
    recommendations.push(
      "Fix error-level violations first — they block assistive technology users."
    );
  }
  if (tokenSuggestions.length > 0) {
    recommendations.push(
      "Replace hard-coded colors with the suggested design tokens to keep theming and contrast consistent."
    );
  }
  recommendations.push(
    "Automated checks do not replace manual testing with a screen reader and keyboard-only navigation."
  );

  return {
    summary: {
      componentName: options.componentName ?? "Unknown Component",
      context: options.context ?? "No context provided",
      totalViolations: violations.length,
      severityBreakdown: { error: errors, warning: warnings }
    },
    violations,
    tokenSuggestions,
    recommendations
  };
}
