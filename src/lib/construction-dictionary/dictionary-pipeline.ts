// =========================================================
// FRELUX AI MULTILINGUAL CONSTRUCTION DICTIONARY
// AI INTEGRATION PIPELINE (spec §18)
//
// USER MESSAGE
//   -> LANGUAGE DETECTION
//   -> TERM EXTRACTION
//   -> CONSTRUCTION DICTIONARY
//   -> INTENT NORMALIZATION
//   -> TOOL SELECTION
//   -> CALCULATION / KNOWLEDGE RETRIEVAL
//   -> RESULT VALIDATION
//   -> LANGUAGE GENERATION
//   -> USER
//
// The dictionary runs BEFORE any technical construction
// response is generated, and the language layer NEVER
// modifies the mathematics: it converts the request into a
// structured intent and protects all numeric values
// verbatim around the deterministic engines.
// =========================================================

import { resolveResponseLanguage, type LanguageResolution } from "./language-detection";
import { normalizeIntent, type NormalizedIntent } from "./intent-normalizer";
import { searchTerms } from "./search";
import { extractMeasurements, measurementsPreserved } from "./translation-rules";
import type { ConstructionTerm } from "./types";

export interface DictionaryPipelineInput {
  message: string;
  explicit_selection?: string | null;
  conversation_language?: string | null;
  /** the dictionary pool to search (from the DB or seed) */
  terms: readonly ConstructionTerm[];
}

export interface DictionaryPipelineResult {
  language: LanguageResolution;
  intent: NormalizedIntent;
  /** dictionary records the message matched */
  matched_terms: Array<{ term: ConstructionTerm; matched_field: string }>;
  /** measurements carried VERBATIM for the engine */
  protected_measurements: Array<{ raw: string; value: number; unit: string }>;
  /** the tool selected for the calculation */
  selected_tool: string | null;
  engine_key: string | null;
}

/**
 * Run the pre-response dictionary pipeline. The output feeds
 * the deterministic calculator engines (which receive the
 * measurements untouched) and the language generation layer
 * (which must preserve every protected value).
 */
export function runDictionaryPipeline(
  input: DictionaryPipelineInput,
): DictionaryPipelineResult {
  const language = resolveResponseLanguage({
    explicit_selection: input.explicit_selection,
    conversation_language: input.conversation_language,
    message: input.message,
  });
  const intent = normalizeIntent(input.message, language.detected_language);
  const measurements = extractMeasurements(input.message);

  // TERM EXTRACTION: match dictionary terms mentioned in the
  // message across canonical, translation, synonym, local
  // and abbreviation fields
  const matched_terms: DictionaryPipelineResult["matched_terms"] = [];
  const words = input.message
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
  for (const word of words) {
    if (word.length < 3) continue;
    const hits = searchTerms(word, input.terms, { language: undefined });
    for (const hit of hits.slice(0, 3)) {
      if (!matched_terms.some((m) => m.term.id === hit.term.id)) {
        matched_terms.push({ term: hit.term, matched_field: hit.matched_field });
      }
    }
  }

  return {
    language,
    intent,
    matched_terms,
    protected_measurements: measurements,
    selected_tool: intent.tool,
    engine_key: intent.engine_key,
  };
}

/**
 * RESULT VALIDATION + LANGUAGE GENERATION gate (the last two
 * pipeline stages). A response may only be served in the
 * response language when every protected measurement from
 * the request survives verbatim; otherwise the value went
//  * missing or was altered and the response is refused.
 */
export function validateGeneratedResponse(input: {
  user_message: string;
  generated_response: string;
  protected_measurements: Array<{ raw: string }>;
}): { ok: boolean; error?: string } {
  const preserved = measurementsPreserved(
    input.user_message,
    input.generated_response,
  );
  if (!preserved) {
    return {
      ok: false,
      error: "Generated response altered or dropped a measurement. Numbers and units must be preserved verbatim.",
    };
  }
  for (const m of input.protected_measurements) {
    if (!input.generated_response.includes(m.raw)) {
      return {
        ok: false,
        error: `Protected value "${m.raw}" missing from the response.`,
      };
    }
  }
  return { ok: true };
}
