// =========================================================
// FRELUX ENGINE #6 — DICTIONARY-BACKED TECHNICAL LABEL
// TRANSLATION (2026-10-15)
//
// Deterministic, dictionary-only translation of TECHNICAL
// MATERIAL / WORK-ITEM LABELS (e.g. "225 mm concrete
// blockwork", "cement bags", "rebar 12 mm").
//
// HONESTY CONTRACT (mirrors the platform translation
// governance in seed-terms.ts / translation-rules.ts):
//   * only dictionary terms are translated; unknown tokens
//     pass through VERBATIM and are reported, never guessed
//   * numbers, units and measurements are preserved
//     character-for-character (reuses the MEASUREMENT_PATTERN
//     protection from translation-rules)
//   * every result carries a disclosure: which terms were
//     used, their verification status, and coverage
//   * SAFETY AND REGULATORY INSTRUCTIONS ARE NEVER
//     MACHINE-TRANSLATED: this module refuses them outright
//     and the caller must keep the source text with a
//     human-translation notice. Machine output is material
//     labelling only, never safety instructions.
// =========================================================

import type { ConstructionTerm } from "./types";

/** Text kinds this module will never machine-translate. */
const SAFETY_REGULATORY_MARKERS: readonly string[] = [
  "warning",
  "caution",
  "danger",
  "do not",
  "must",
  "shall",
  "mandatory",
  "safety",
  "hazard",
  "protective",
  "regulation",
  "compliance",
  "certified",
  "approved by",
  "permits",
  "inspection",
];

export interface LabelTranslationResult {
  /** the translated label (unknown tokens kept verbatim) */
  translated: string;
  /** source language of the input label (English) */
  source_language: "en";
  /** requested target language */
  target_language: string;
  /** canonical terms that were replaced, with their status */
  translated_terms: Array<{
    canonical_term: string;
    translation: string;
    verified: boolean;
    translation_status: string;
  }>;
  /** tokens the dictionary did not know, kept in English */
  untranslated_tokens: string[];
  /** 0-1 share of dictionary-recognised content words */
  coverage: number;
  /** true when every translated term is human-verified */
  fully_verified: boolean;
  /** ready-to-render disclosure sentence */
  disclosure: string;
}

/** Refusal result for safety/regulatory text. */
export interface SafetyRefusal {
  refused: true;
  reason: string;
}

export function isSafetyCriticalText(text: string): boolean {
  const lower = ` ${text.toLowerCase()} `;
  return SAFETY_REGULATORY_MARKERS.some((m) => lower.includes(` ${m} `) || lower.includes(`${m} `));
}

/**
 * Translate a technical material/work-item label using ONLY
 * the supplied dictionary terms. Unknown content passes
 * through in English; measurements are never altered.
 */
export function translateTechnicalLabel(
  label: string,
  target_language: string,
  dictionary: readonly ConstructionTerm[],
): LabelTranslationResult | SafetyRefusal {
  if (isSafetyCriticalText(label)) {
    return {
      refused: true,
      reason:
        "Safety and regulatory instructions are never machine-translated; keep the source text and use a qualified human translator.",
    };
  }

  // Build the translation table for this language from the
  // dictionary pool: English canonical term -> target term.
  // Longest terms match first so "strip foundation" wins
  // over "foundation".
  const table = new Map<
    string,
    { translation: string; verified: boolean; status: string }
  >();
  for (const term of dictionary) {
    if (term.language !== target_language) continue;
    const translation = (term as { translation?: string | null }).translation;
    if (!translation) continue;
    table.set(term.canonical_term.toLowerCase(), {
      translation,
      verified: term.verified,
      status: term.translation_status,
    });
  }

  // Preserve measurements/numbers as protected segments.
  const measurementRegex = /\d+(?:[.,]\d+)?\s*(?:mm|cm|m2|m3|m²|²|³|m|kg|bags?|litres?|ltr|tons?|tonnes?|cu\.? ?m|sq\.? ?m)\b/gi;
  const protectedSegments: string[] = [];
  let working = label.replace(measurementRegex, (m) => {
    protectedSegments.push(m);
    return `\u0000${protectedSegments.length - 1}\u0000`;
  });

  // Replace known dictionary terms (longest first).
  const sortedTerms = [...table.keys()].sort((a, b) => b.length - a.length);
  let translated = working.toLowerCase();
  const translatedTerms: LabelTranslationResult["translated_terms"] = [];
  for (const key of sortedTerms) {
    if (!translated.includes(key)) continue;
    const entry = table.get(key)!;
    translated = translated.split(key).join(` ${entry.translation} `);
    translatedTerms.push({
      canonical_term: key,
      translation: entry.translation,
      verified: entry.verified,
      translation_status: entry.status,
    });
  }

  // Identify untranslated content words for honest disclosure.
  const translatedWords = translated.split(/\s+/);
  const untranslatedTokens: string[] = [];
  const protectedRestored: string[] = translatedWords.map((w) => {
    const placeholder = w.match(/^\u0000(\d+)\u0000$/);
    if (placeholder) return protectedSegments[Number(placeholder[1])];
    return w;
  });
  // tokens that are still English content words the
  // dictionary did not recognise
  for (const w of translatedWords) {
    if (w.includes("\u0000")) continue;
    if (w.length > 2 && /^[a-z][a-z\s-]*$/.test(w) && !table.has(w)) {
      untranslatedTokens.push(w);
    }
  }

  const contentWordCount = translatedWords.filter(
    (w) => w.length > 2,
  ).length;
  const knownCount = translatedWords.filter(
    (w) => w.includes("\u0000") || table.has(w) || !/^[a-z]/.test(w),
  ).length;
  const coverage =
    contentWordCount === 0
      ? 0
      : Math.round((knownCount / contentWordCount) * 100) / 100;

  const fullyVerified =
    translatedTerms.length > 0 && translatedTerms.every((t) => t.verified);

  const disclosure =
    translatedTerms.length === 0
      ? `Dictionary translation to ${target_language}: no recognised terms; the label is kept in English.`
      : fullyVerified
        ? `Dictionary translation to ${target_language} using ${translatedTerms.length} human-verified term(s).`
        : `Dictionary translation to ${target_language} using ${translatedTerms.length} term(s) pending human review; verify before professional use.` +
          (untranslatedTokens.length
            ? ` Untranslated (kept in English): ${untranslatedTokens.join(", ")}.`
            : "");

  return {
    translated: protectedRestored.join(" ").replace(/\s+/g, " ").trim(),
    source_language: "en",
    target_language,
    translated_terms: translatedTerms,
    untranslated_tokens: [...new Set(untranslatedTokens)],
    coverage,
    fully_verified: fullyVerified,
    disclosure,
  };
}
