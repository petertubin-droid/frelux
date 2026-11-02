// =========================================================
// FRELUX ENGINE #6 — TRANSLATION POOL RESOLUTION
//
// Resolves the dictionary translation pool for one language:
//   1. the live database pool (construction_terms overlay
//      rows — authenticated read) when available
//   2. an explicit, disclosed fallback to the curated seed
//      translations when the DB is unreachable or empty
//
// The caller always learns which source produced the pool so
// no user ever mistakes a fallback for reviewed data.
// =========================================================

import type { ConstructionTerm } from "./types";
import { listDictionaryTerms } from "./dictionary-client";
import { instantiateSeedTranslationRecords } from "./seed-terms";

export type TranslationPoolSource = "database" | "seed-fallback";

export interface TranslationPool {
  terms: ConstructionTerm[];
  source: TranslationPoolSource;
}

/**
 * Resolve the translation pool for a language. DB first; the
 * curated seed set is a disclosed fallback, never silent.
 */
export async function getTranslationPool(
  language: string,
): Promise<TranslationPool> {
  try {
    const terms = await listDictionaryTerms({ language, limit: 500 });
    if (terms.length > 0) {
      return { terms, source: "database" };
    }
  } catch {
    // fall through to the seed pool — disclosed below
  }
  const seedTerms = instantiateSeedTranslationRecords(language);
  return {
    terms: seedTerms,
    source: "seed-fallback",
  };
}
