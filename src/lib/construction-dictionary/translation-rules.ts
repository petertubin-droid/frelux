// =========================================================
// FRELUX AI MULTILINGUAL CONSTRUCTION DICTIONARY
// TRANSLATION RULES, CONFIDENCE AND MEASUREMENT
// PROTECTION
//
// HARD RULES (spec §5, §8, §10, §12, §19):
//  1. Numerical values and measurement units are NEVER
//     translated or altered. "12 ft × 10 ft" stays
//     "12 ft × 10 ft" in every language.
//  2. The language layer never modifies formulas,
//     quantities, conversion factors, coverage rates, waste
//     factors, material ratios, dimensions, prices or any
//     calculation logic. Translation happens AROUND the
//     deterministic engines, never inside them.
//  3. Unreliable translations are never invented: the
//     original technical term is preserved and explained,
//     and the record is flagged needs_review.
// =========================================================

import type { ConstructionTerm, TranslationStatus } from "./types";
import { isValidLanguage } from "./languages";

/** Configurable low-confidence threshold (spec §12). */
export const CONFIDENCE_THRESHOLD = 0.75;

/** Below this, the AI must clarify, show the original term or
 *  offer multiple interpretations. It must never guess. */
export function isLowConfidence(score: number): boolean {
  return score < CONFIDENCE_THRESHOLD;
}

/**
 * Extract and protect measurement expressions. Returns the
 * measurement segments found in a text so the translation
 * layer can carry them through VERBATIM.
 */
export const MEASUREMENT_PATTERN =
  /(\d+(?:[.,]\d+)?)\s*(mm|cm|m|inches|inch|in|feet|foot|ft|yards|yard|yd|square metres|square metre|m²|m2|sqm|square feet|sq ft|sq\.?\s?ft|ft²|cubic metres|m³|litres|l|litre|liters|kg|kilograms|kgs|tonnes|tonne|tons|ton|bags|blocks)\b/gi;

export interface ProtectedMeasurement {
  raw: string; // verbatim, e.g. "12 ft × 10 ft" segment pieces
  value: number; // untouched numeric value
  unit: string; // normalized unit spelling as written
}

/** Find measurement expressions in a user text. */
export function extractMeasurements(text: string): ProtectedMeasurement[] {
  const out: ProtectedMeasurement[] = [];
  MEASUREMENT_PATTERN.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = MEASUREMENT_PATTERN.exec(text)) !== null) {
    out.push({
      raw: m[0],
      value: parseFloat(m[1].replace(",", ".")),
      unit: m[2],
    });
  }
  return out;
}

/**
 * Verify that a translated response preserved every
 * measurement from the source. The dictionary translation
 * layer must never alter a single digit or unit.
 */
export function measurementsPreserved(
  source: string,
  translated: string,
): boolean {
  const a = extractMeasurements(source).map((m) => m.raw.toLowerCase());
  const b = extractMeasurements(translated).map((m) => m.raw.toLowerCase());
  // every source measurement must survive verbatim; the
  // response may add RESULT values (like 18.5 litres) that
  // were never in the question
  return a.every((raw) => b.includes(raw));
}

/**
 * Spec §8 translation determination. For every term decide:
 *  1. formal translation
 *  2. technical meaning
 *  3. common/local meaning
 *  4. alternative expression
 *  5. whether the term should remain in English
 *  6. whether explanation is required
 *
 * This function ENFORCES the outcome on a draft record; it
 * is the gate every translated record passes through before
 * it can be stored or served.
 */
export function applyTranslationRules(
  draft: Pick<
    ConstructionTerm,
    | "translation"
    | "translation_status"
    | "confidence_score"
    | "translation_notes"
    | "keep_in_english"
    | "explanation_required"
  > & { language: string; canonical_term: string },
): {
  ok: boolean;
  error?: string;
  decision: {
    formal_translation: string | null;
    technical_meaning: string;
    common_local_meaning: string;
    alternative_expression: string | null;
    keep_in_english: boolean;
    explanation_required: boolean;
  };
} {
  const decision = {
    formal_translation: draft.translation,
    technical_meaning: "construction meaning of the canonical term",
    common_local_meaning: "everyday site usage",
    alternative_expression: null as string | null,
    keep_in_english: draft.keep_in_english,
    explanation_required: draft.explanation_required,
  };

  if (!isValidLanguage(draft.language)) {
    return { ok: false, error: `Unknown language ${draft.language}`, decision };
  }

  // Never invent: an unreliable translation is refused outright
  if (draft.translation_status === "needs_review" && draft.translation && !draft.keep_in_english) {
    return {
      ok: false,
      error:
        "Unreliable translations must either keep the original English term (keep_in_english) or carry no translation. Never invent terminology.",
      decision,
    };
  }

  // Low-confidence translations cannot be served as reliable
  if (
    draft.translation &&
    isLowConfidence(draft.confidence_score) &&
    draft.translation_status !== "needs_review" &&
    draft.translation_status !== "untranslated"
  ) {
    return {
      ok: false,
      error: `translation_confidence ${draft.confidence_score} is below the ${CONFIDENCE_THRESHOLD} threshold: mark the record needs_review or keep the original term.`,
      decision,
    };
  }

  // Untranslated or low-confidence terms stay in English and
  // require an explanation in the selected language
  if (draft.translation_status === "untranslated" || draft.keep_in_english) {
    decision.keep_in_english = true;
    decision.formal_translation = null;
    decision.explanation_required = true;
  }

  return { ok: true, decision };
}

/**
 * How a term should be presented in a given language (spec
 * §8 and §10): the translation, or the preserved English term
 * plus an explanation requirement. Returns multiple
 * interpretations when confidence is low, and always carries
 * the confidence score with it.
 */
export interface TranslationPresentation {
  canonical_term: string;
  language: string;
  presented_term: string;
  definition: string;
  technical_context: string;
  confidence: number;
  verified: boolean;
  needs_clarification: boolean;
  interpretations: string[];
  note: string | null;
}

export function presentTerm(
  term: ConstructionTerm,
  language: string,
): TranslationPresentation {
  const isSourceLanguage = term.language === language;
  const translationAvailable =
    !isSourceLanguage &&
    !!term.translation &&
    !term.keep_in_english &&
    term.translation_status !== "needs_review" &&
    term.translation_status !== "untranslated";

  if (isSourceLanguage || translationAvailable) {
    return {
      canonical_term: term.canonical_term,
      language,
      presented_term: isSourceLanguage ? term.canonical_term : term.translation!,
      definition: term.definition,
      technical_context: term.construction_context,
      confidence: term.confidence_score,
      verified: term.verified,
      needs_clarification: false,
      interpretations: [],
      note: term.translation_notes,
    };
  }

  // No reliable translation: preserve the technical term and
  // explain it in the selected language (spec §8). If the
  // record itself is unverified, ask for clarification
  // instead of guessing.
  const interpretations: string[] = [];
  if (term.alternative_terms.length > 0) {
    interpretations.push(...term.alternative_terms);
  }
  return {
    canonical_term: term.canonical_term,
    language,
    presented_term: term.canonical_term, // original technical term preserved
    definition: term.definition,
    technical_context: term.construction_context,
    confidence: term.confidence_score,
    verified: term.verified,
    needs_clarification:
      isLowConfidence(term.confidence_score) && !term.verified,
    interpretations,
    note:
      term.explanation_required || term.keep_in_english
        ? term.translation_notes ?? "Technical term preserved in English; explain in the selected language."
        : term.translation_notes,
  };
}

/** Response template values (spec §10): numbers, formulas,
 *  units, calculator results and technical abbreviations are
 *  preserved verbatim across languages. */
export function protectResponseValues(
  responseText: string,
  protectedSegments: string[],
): string {
  const out = responseText;
  for (const seg of protectedSegments) {
    if (!out.includes(seg)) {
      // a protected value went missing: refuse to serve a
      // response that dropped or altered a measurement
      return "";
    }
  }
  return out;
}

/** Status transition rules (spec §13): verification is an
 *  explicit admin action, never automatic. */
export function canTransitionStatus(
  from: TranslationStatus,
  to: TranslationStatus,
): boolean {
  if (from === to) return false;
  if (to === "verified" && from === "needs_review") return true;
  if (to === "needs_review" && (from === "provisional" || from === "verified" || from === "untranslated")) return true;
  if (to === "provisional" && (from === "untranslated" || from === "needs_review")) return true;
  if (to === "untranslated" && from !== "verified") return true;
  return false;
}
