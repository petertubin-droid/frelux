// =========================================================
// FRELUX AI MULTILINGUAL CONSTRUCTION DICTIONARY
// SEARCH (spec §15)
//
// Fast terminology lookup over canonical term, translation,
// synonym, local expression, abbreviation, category, language
// and country, with typo tolerance: "concret" suggests
// "concrete". Suggest, never silently guess.
// =========================================================

import type { ConstructionTerm } from "./types";

/** Levenshtein edit distance, small strings only. */
export function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > 3) return 4; // cheap early exit
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) => [
    i,
    ...Array(n).fill(0),
  ]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return dp[m][n];
}

export interface SearchFilters {
  language?: string;
  category?: string;
  country?: string;
  verified_only?: boolean;
  min_confidence?: number;
}

export interface SearchHit {
  term: ConstructionTerm;
  /** how the query matched */
  matched_field:
    | "canonical_term"
    | "translation"
    | "synonym"
    | "local_term"
    | "alternative"
    | "abbreviation";
  exact: boolean;
  /** edit distance for fuzzy matches */
  distance: number;
}

/** Search the dictionary with typo tolerance (distance <= 2). */
export function searchTerms(
  query: string,
  terms: readonly ConstructionTerm[],
  filters?: SearchFilters,
): SearchHit[] {
  const q = query.trim().toLowerCase();
  let pool = terms;
  if (filters?.language) pool = pool.filter((t) => t.language === filters.language);
  if (filters?.category) pool = pool.filter((t) => t.category === filters.category);
  if (filters?.country) pool = pool.filter((t) => t.country === filters.country);
  if (filters?.verified_only) pool = pool.filter((t) => t.verified);
  if (filters?.min_confidence !== undefined)
    pool = pool.filter((t) => t.confidence_score >= filters.min_confidence!);

  const hits: SearchHit[] = [];
  for (const term of pool) {
    const candidateFields: Array<{
      value: string;
      field: SearchHit["matched_field"];
    }> = [
      { value: term.canonical_term, field: "canonical_term" },
      { value: term.translation ?? "", field: "translation" },
      ...term.synonyms.map((v) => ({ value: v, field: "synonym" as const })),
      ...term.local_terms.map((v) => ({ value: v, field: "local_term" as const })),
      ...term.alternative_terms.map((v) => ({ value: v, field: "alternative" as const })),
      ...term.abbreviations.map((v) => ({ value: v, field: "abbreviation" as const })),
    ];

    let best: SearchHit | null = null;
    for (const cand of candidateFields) {
      if (!cand.value) continue;
      const lowerVal = cand.value.toLowerCase();
      const distance = editDistance(q, lowerVal);
      const exact = lowerVal === q;
      const prefix = lowerVal.startsWith(q) && q.length >= 3;
      if (exact || prefix) {
        best = { term, matched_field: cand.field, exact: true, distance: 0 };
        break;
      }
      if (distance <= 2 && distance < lowerVal.length / 3) {
        const hit: SearchHit = { term, matched_field: cand.field, exact: false, distance };
        if (!best || hit.distance < best.distance) best = hit;
      }
    }
    if (best) hits.push(best);
  }

  hits.sort((a, b) => a.distance - b.distance || a.term.canonical_term.localeCompare(b.term.canonical_term));
  return hits;
}

/** Did you mean: suggestions for a query with no exact match. */
export function suggestCorrections(
  query: string,
  terms: readonly ConstructionTerm[],
): string[] {
  const hits = searchTerms(query, terms);
  return [...new Set(hits.map((h) => h.term.canonical_term))].slice(0, 5);
}
