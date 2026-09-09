// =========================================================
// FRELUX AI MULTILINGUAL CONSTRUCTION DICTIONARY
// VOICE-READY TERMINOLOGY MAPPING (spec §11)
// AND VERSIONING (spec §16)
//
// Voice pipeline:
//   spoken/local pronunciation -> speech transcription ->
//   terminology correction -> canonical construction term ->
//   calculator/tool
//
// When confidence is low the system asks the user to
// clarify. It never silently makes dangerous assumptions.
//
// Versioning: every change creates a new version with an
// audit record so terminology can be reviewed and reverted.
// =========================================================

import type { ConstructionTerm } from "./types";

export interface SpeechCandidate {
  transcription: string;
  canonical_term: string;
  confidence: number;
  tool: string | null;
}

/** Pronunciation-variant map: common mispronunciations and
 *  spoken/local variants mapped to canonical terms. Data,
 *  freely extensible by admins. */
const PRONUNCIATION_VARIANTS: Record<string, { canonical: string; confidence: number }> = {
  "screeding": { canonical: "screeding", confidence: 0.99 },
  "screeding floor": { canonical: "screeding", confidence: 0.98 },
  "skreeding": { canonical: "screeding", confidence: 0.72 },
  "skirting": { canonical: "skirting", confidence: 0.9 },
  "pop": { canonical: "plaster of paris", confidence: 0.95 },
  "pop ceiling": { canonical: "plaster of paris", confidence: 0.99 },
  "p o p": { canonical: "plaster of paris", confidence: 0.9 },
  "cement block": { canonical: "sandcrete block", confidence: 0.85 },
  "viga": { canonical: "viga", confidence: 0.9 },
  "6 inches block": { canonical: "sandcrete block", confidence: 0.8 },
  "nine inches": { canonical: "sandcrete block", confidence: 0.7 },
  "ruuf": { canonical: "roof", confidence: 0.72 },
  "rinting": { canonical: "rendering", confidence: 0.65 },
  "shovell": { canonical: "shovel", confidence: 0.75 },
  "trowill": { canonical: "trowel", confidence: 0.7 },
  "headpan": { canonical: "head pan", confidence: 0.95 },
  "kango": { canonical: "head pan", confidence: 0.8 },
  "jerry can": { canonical: "jerrycan", confidence: 0.95 },
};

/**
 * Map a speech transcription to a canonical construction
 * term. High-confidence matches return the correction;
 * low-confidence matches are flagged so the assistant asks
 * the user to clarify instead of assuming.
 */
export function mapSpeechToTerm(
  transcription: string,
): {
  ok: boolean;
  candidate?: SpeechCandidate;
  needs_clarification: boolean;
  message?: string;
} {
  const norm = transcription.trim().toLowerCase();
  if (!norm) {
    return { ok: false, needs_clarification: true, message: "Empty transcription." };
  }
  const direct = PRONUNCIATION_VARIANTS[norm];
  if (direct && direct.confidence >= 0.75) {
    return {
      ok: true,
      candidate: {
        transcription: norm,
        canonical_term: direct.canonical,
        confidence: direct.confidence,
        tool: null,
      },
      needs_clarification: false,
    };
  }
  if (direct) {
    return {
      ok: false,
      needs_clarification: true,
      message: `I might have heard "${direct.canonical}", but I am not sure. Did you mean ${direct.canonical}?`,
    };
  }
  // best fuzzy match over variant keys
  let best: { key: string; conf: number; dist: number } | null = null;
  for (const [key, v] of Object.entries(PRONUNCIATION_VARIANTS)) {
    const dist = levenshtein(norm, key);
    if (dist <= 2 && (!best || dist < best.dist)) {
      best = { key, conf: v.confidence * (1 - dist * 0.15), dist };
    }
  }
  if (best && best.conf >= 0.75) {
    return {
      ok: true,
      candidate: {
        transcription: norm,
        canonical_term: PRONUNCIATION_VARIANTS[best.key].canonical,
        confidence: best.conf,
        tool: null,
      },
      needs_clarification: false,
    };
  }
  return {
    ok: false,
    needs_clarification: true,
    message: "I could not recognize that construction term. Could you spell it or say it differently?",
  };
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
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

// ---------------------------------------------------------
// Versioning (spec §16): audit history with revert.
// ---------------------------------------------------------

export interface TermVersionAudit {
  version: number;
  canonical_term: string;
  language: string;
  changed_fields: string[];
  changed_by: string;
  change_note: string | null;
  created_at: string;
  /** full PRE-CHANGE snapshot: restoring it reverts this
   *  change (undo semantics) */
  snapshot: ConstructionTerm;
}

/** Build the audit entry for a new version of a term. */
export function buildVersionAudit(
  previous: ConstructionTerm,
  next: ConstructionTerm,
  changed_by: string,
  change_note: string | null,
): TermVersionAudit {
  const changed_fields: string[] = [];
  for (const key of Object.keys(previous) as Array<keyof ConstructionTerm>) {
    const before = JSON.stringify(previous[key]);
    const after = JSON.stringify(next[key]);
    if (before !== after) changed_fields.push(String(key));
  }
  return {
    version: next.version,
    canonical_term: next.canonical_term,
    language: next.language,
    changed_fields,
    changed_by,
    change_note,
    created_at: next.updated_at,
    snapshot: previous, // pre-change state: revert restores it
  };
}

/** Revert a term to a previous audited version. */
export function revertToVersion(
  audit: TermVersionAudit,
  current: ConstructionTerm,
): ConstructionTerm {
  return {
    ...audit.snapshot,
    version: current.version + 1,
    updated_at: new Date().toISOString(),
  };
}
