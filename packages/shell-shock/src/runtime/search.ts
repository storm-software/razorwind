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

/**
 * A weighted field consulted by {@link fuzzySearch}.
 */
export interface SearchKey<T> {
  /** Field label (for debugging / reporting). */
  name: string;
  /** Relative weight of a match on this field. */
  weight: number;
  /** Read the searchable text for an item. Arrays are joined with spaces. */
  get: (item: T) => string | readonly string[] | undefined | null;
}

export interface SearchOptions<T> {
  /** Fields to search, with weights. */
  keys: readonly SearchKey<T>[];
  /**
   * Maximum matches **per term** (mirrors the ADS MCP `limit` semantics).
   *
   * @defaultValue 2
   */
  limit?: number;
  /** Stable identity used to de-duplicate results across terms. */
  idOf: (item: T) => string;
  /**
   * Minimum similarity for a fuzzy (non-substring) match to count.
   *
   * @defaultValue 0.55
   */
  threshold?: number;
}

export interface SearchMatch<T> {
  item: T;
  score: number;
  /** Which search term produced the best score. */
  term: string;
}

/** Normalize a search term: trim, lowercase, collapse whitespace. */
export function cleanTerm(term: string): string {
  return term.trim().toLowerCase().replaceAll(/\s+/g, " ");
}

/** De-duplicate and normalize raw search terms, dropping empties. */
export function normalizeTerms(terms: readonly string[] | undefined): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of terms ?? []) {
    const term = cleanTerm(String(raw ?? ""));
    if (term && !seen.has(term)) {
      seen.add(term);
      result.push(term);
    }
  }

  return result;
}

function bigrams(value: string): Set<string> {
  const grams = new Set<string>();
  const text = value.replaceAll(/[^a-z0-9]+/g, "");
  for (let i = 0; i < text.length - 1; i++) {
    grams.add(text.slice(i, i + 2));
  }
  return grams;
}

/** Dice similarity coefficient over character bigrams (0..1). */
export function similarity(a: string, b: string): number {
  if (!a || !b) {
    return 0;
  }
  if (a === b) {
    return 1;
  }

  const left = bigrams(a);
  const right = bigrams(b);
  if (left.size === 0 || right.size === 0) {
    return 0;
  }

  let shared = 0;
  for (const gram of left) {
    if (right.has(gram)) {
      shared++;
    }
  }

  return (2 * shared) / (left.size + right.size);
}

const WORD_SPLIT = /[\s._\-/:]+/;

function words(value: string): string[] {
  return value.split(WORD_SPLIT).filter(Boolean);
}

/**
 * Score a single text against a single (clean) term. Returns `0..1`.
 *
 * Exact → substring → word overlap → fuzzy bigram similarity.
 */
export function scoreText(
  text: string,
  term: string,
  threshold: number
): number {
  const value = text.toLowerCase();
  if (!value) {
    return 0;
  }
  if (value === term) {
    return 1;
  }

  const compactTerm = term.replaceAll(/\s+/g, "");
  const compactValue = value.replaceAll(/\s+/g, "");
  if (value.includes(term) || compactValue.includes(compactTerm)) {
    // Favor matches where the term covers more of the field.
    return 0.75 + 0.2 * Math.min(1, compactTerm.length / compactValue.length);
  }

  const termWords = words(term);
  const valueWords = words(value);
  if (termWords.length > 0 && valueWords.length > 0) {
    let hits = 0;
    for (const word of termWords) {
      if (
        valueWords.some(
          candidate =>
            candidate === word ||
            candidate.includes(word) ||
            (word.length >= 3 && similarity(candidate, word) >= threshold)
        )
      ) {
        hits++;
      }
    }
    if (hits > 0) {
      return 0.35 + 0.35 * (hits / termWords.length);
    }
  }

  const fuzzy = similarity(compactValue, compactTerm);

  return fuzzy >= threshold ? 0.3 * fuzzy : 0;
}

function scoreItem<T>(
  item: T,
  term: string,
  keys: readonly SearchKey<T>[],
  threshold: number
): number {
  let best = 0;
  let total = 0;

  for (const key of keys) {
    const raw = key.get(item);
    const text = Array.isArray(raw)
      ? raw.join(" ")
      : typeof raw === "string"
        ? raw
        : "";
    if (!text) {
      continue;
    }

    const score = scoreText(text, term, threshold) * key.weight;
    if (score > 0) {
      total += score;
      best = Math.max(best, score);
    }
  }

  // Dominated by the best field, nudged by secondary field hits.
  return best + 0.05 * (total - best);
}

/**
 * Multi-term weighted fuzzy search.
 *
 * Each term independently contributes up to `limit` matches (highest score
 * first); results are merged in score order and de-duplicated by `idOf`.
 */
export function fuzzySearch<T>(
  items: readonly T[],
  terms: readonly string[],
  options: SearchOptions<T>
): SearchMatch<T>[] {
  const cleaned = normalizeTerms(terms);
  if (cleaned.length === 0 || items.length === 0) {
    return [];
  }

  const limit = Math.max(1, Math.floor(options.limit ?? 2));
  const threshold = options.threshold ?? 0.55;
  const pool: SearchMatch<T>[] = [];

  for (const term of cleaned) {
    const scored: SearchMatch<T>[] = [];
    for (const item of items) {
      const score = scoreItem(item, term, options.keys, threshold);
      if (score > 0) {
        scored.push({ item, score, term });
      }
    }
    scored.sort((a, b) => b.score - a.score);
    pool.push(...scored.slice(0, limit));
  }

  pool.sort((a, b) => b.score - a.score);

  const seen = new Set<string>();
  const results: SearchMatch<T>[] = [];
  for (const match of pool) {
    const id = options.idOf(match.item);
    if (!seen.has(id)) {
      seen.add(id);
      results.push(match);
    }
  }

  return results;
}
