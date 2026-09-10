// =========================================================
// RESPONSE COMPOSER (plan P6 — fluid, honest language)
// Deterministic discourse composition: the engine's answers
// keep their exact factual content (cited facts, confidence,
// provenance, epistemic labels) while the CONNECTIVE tissue
// — openings, footers, transitions — varies naturally.
//
// Hard rules:
//  1. Same content → same phrasing, byte-stable (stable hash
//     of the cited evidence picks the variant). Same input
//     always reads the same — never random.
//  2. Different content → different phrasing across a
//     request stream, so answers stop reading like stamps.
//  3. Every variant of a frame family preserves the required
//     epistemic marker ("validated knowledge", provenance,
//     confidence) — fluency NEVER trades away honesty.
//  4. Zero fabrication surface: the composer only frames
//     parts that already carry provenance; it invents no
//     facts, no numbers, no claims.
// =========================================================

/** Owner-facing verbosity profile (plan P6 Batch B). The
 *  engine stays deterministic; the profile selects which
 *  OPTIONAL connectives are composed. Required epistemic
 *  content is never omitted. */
export type Verbosity = "concise" | "detailed";

/** FNV-1a 32-bit stable hash — deterministic, dependency-free. */
export function stableHash(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function pick(key: string, seed: string, variants: string[]): string {
  return variants[stableHash(`${key}:${seed}`) % variants.length];
}

// ---------------------------------------------------------
// Frame families — each variant keeps the epistemic marker
// ---------------------------------------------------------

const KNOWLEDGE_OPENINGS = [
  "From my validated knowledge:",
  "Here is what I hold as validated knowledge on that:",
  "What my validated knowledge store says (with provenance):",
  "Straight from my validated knowledge, with provenance:",
];

const HOWTO_FOOTERS = [
  "If you need deeper steps than this, say so — I will plan the work and report any capability gaps honestly.",
  "Want this broken into a full step-by-step plan? Ask and I will plan it — and report honestly where my capabilities end.",
  "I can take this deeper: say the word and I will plan the full work, flagging any capability gaps up front.",
];

const UNKNOWN_OPENINGS = [
  "I do not have validated knowledge on that yet.",
  "That is not in my validated knowledge yet.",
  "My validated knowledge store has nothing on this yet.",
];

/** Opening line for a validated-knowledge answer. Every
 *  variant contains "validated knowledge" — the epistemic
 *  label is the anchor, never dropped. */
export function knowledgeOpening(seed: string): string {
  return pick("kb-open", seed, KNOWLEDGE_OPENINGS);
}

/** Optional how-to footer. Omitted in concise mode. */
export function howtoFooter(seed: string, verbosity: Verbosity): string {
  if (verbosity === "concise") return "";
  return pick("howto-foot", seed, HOWTO_FOOTERS);
}

/** Opening line for an honest "not in my knowledge" answer.
 *  Every variant contains "validated knowledge". */
export function unknownOpening(seed: string): string {
  return pick("kb-unknown", seed, UNKNOWN_OPENINGS);
}

/** Epistemic-safety self-check used by tests and the
 *  engine's composer integration: asserts every variant of
 *  every family keeps its required marker. */
export function composerSelfCheck(): {
  ok: boolean
  failures: string[]
} {
  const failures: string[] = [];
  for (const [i, v] of KNOWLEDGE_OPENINGS.entries()) {
    if (!/validated knowledge/i.test(v)) {
      failures.push(`knowledgeOpening[${i}] lost the epistemic marker`);
    }
  }
  for (const [i, v] of UNKNOWN_OPENINGS.entries()) {
    if (!/validated knowledge/i.test(v)) {
      failures.push(`unknownOpening[${i}] lost the epistemic marker`);
    }
  }
  for (const [i, v] of HOWTO_FOOTERS.entries()) {
    if (!/plan|honest|capabilit/i.test(v)) {
      failures.push(`howtoFooter[${i}] lost the honesty/planning marker`);
    }
  }
  return { ok: failures.length === 0, failures };
}
