// =========================================================
// ARCHIE SEED CORPUS (plan P4, audit K1)
// Versioned, swappable foundational knowledge. The corpus is
// DATA, not code: the engine seeds it at boot with provenance
// "seed", status validated, and the owner can correct any
// seed like any other fact (corrections demote it honestly).
//
// CONSTRAINTS (enforced by seed-corpus.test.ts):
// - no "is-a"/"part-of" predicates — those trigger the
//   transitivity/inheritance rules and would silently derive
//   new facts at boot; derivations are earned at runtime, not
//   smuggled in through the corpus.
// - no duplicate subject+predicate pairs (assert() would
//   merge them unpredictably at seed time).
// - every fact is verifiable from the FRELUX codebase or is
//   an explicit owner directive — seeds must never contain
//   guesses.
// =========================================================

import type { Fact } from "./types.ts";

/** Bump when the corpus changes so deployments can detect
 *  stale seeds (audit K1: swappable knowledge). v3: the five
 *  construction material facts moved to the construction
 *  domain skill's seedFacts (domain-capture completion
 *  2026-09-11) — this file now holds only engine-generic and
 *  deployment/business knowledge. */
export const SEED_CORPUS_VERSION = 3;

export type SeedFact = Pick<
  Fact,
  "subject" | "predicate" | "object" | "confidence"
>;

/** Engine-generic foundational knowledge. The construction
 *  material facts that used to live here moved VERBATIM to the
 *  construction domain skill (domains/construction.ts,
 *  CONSTRUCTION_SEED_FACTS) — same constraints, same
 *  provenance, contributed through the DomainSkillRegistry. */
export const SEED_FACTS: SeedFact[] = [
  {
    subject: "archie",
    predicate: "identity",
    object:
      "ARCHIE, the FRELUX project's native intelligence system, running its own independent inference engine with no external AI provider",
    confidence: 0.99,
  },
];

/** FRELUX-domain knowledge (corpus v2): what ARCHIE knows
 *  about the product it lives in. Every entry is verifiable
 *  in the FRELUX codebase or is an explicit owner directive. */
export const FRELUX_CORPUS: SeedFact[] = [
  {
    subject: "frelux",
    predicate: "identity",
    object:
      "FRELUX, a construction-cost-estimation platform for building projects (screeding, materials, labour, paint), built for real contractor workflows",
    confidence: 0.95,
  },
  {
    subject: "frelux",
    predicate: "policy",
    object:
      "estimates are computed from real configured settings (the em-engine) — never invented figures; missing inputs are surfaced, not guessed",
    confidence: 0.9,
  },
  {
    subject: "frelux-em-engine",
    predicate: "definition",
    object:
      "the estimation engine that computes material and labour quantities and costs from project dimensions and configured settings",
    confidence: 0.9,
  },
  {
    subject: "frelux-em-engine",
    predicate: "records",
    object:
      "primer_coverage_multiplier (default 1.3) in em_engine_settings — primer coverage is multiplied to reflect real-world wastage over theoretical spread",
    confidence: 0.85,
  },
  {
    subject: "frelux-paint",
    predicate: "policy",
    object:
      "paint is priced per bucket, and per-bucket pricing drives the cost computation — verified correct in the 2026-09-10 audit",
    confidence: 0.9,
  },
  {
    subject: "frelux-materials",
    predicate: "catalog",
    object:
      "screeding material systems live in the screeding_materials catalog, admin-managed, with prices that vary by region",
    confidence: 0.9,
  },
  {
    subject: "frelux-market",
    predicate: "registry",
    object:
      "observed market prices with source provenance live in the frelux_archie_market_observations registry (region-tagged, never guessed)",
    confidence: 0.9,
  },
  {
    subject: "frelux",
    predicate: "payment-provider",
    object:
      "Paystack for real payment processing (live integration, verified in the 2026-09-10 audit)",
    confidence: 0.9,
  },
  {
    subject: "frelux",
    predicate: "channel",
    object:
      "WhatsApp as a real deployment channel (verified integration, not a mock)",
    confidence: 0.9,
  },
  {
    subject: "frelux",
    predicate: "currency",
    object:
      "prices in Nigerian naira (NGN) by default; currency is explicit, never assumed in answers",
    confidence: 0.85,
  },
  {
    subject: "archie",
    predicate: "policy",
    object:
      "no external AI model inside ARCHIE, ever — provider independence is a permanent owner directive; all reasoning is deterministic and native in-engine",
    confidence: 0.99,
  },
  {
    subject: "archie",
    predicate: "price-policy",
    object:
      "ARCHIE never guesses prices — observed market data or owner-taught values only, with honest refusal otherwise",
    confidence: 0.95,
  },
  {
    subject: "archie",
    predicate: "substrate",
    object:
      "knowledge substrate: facts (with verifiedBy evidence ledger), reasoning rules, deterministic operators, and a toolCall seam to the deployment's declared tools",
    confidence: 0.9,
  },
  {
    subject: "archie",
    predicate: "learning",
    object:
      "learning outcomes: success, failure, correction, cited, acknowledged — only real verification evidence (owner confirmation, cross-source agreement) promotes a fact to validated",
    confidence: 0.9,
  },
  {
    subject: "archie",
    predicate: "gratitude-policy",
    object:
      "politeness (thanks, praise) is acknowledged but never treated as verification — gratitude reinforces nothing",
    confidence: 0.95,
  },
];

/** The full corpus seeded at boot. */
export const FULL_SEED_CORPUS: SeedFact[] = [...SEED_FACTS, ...FRELUX_CORPUS];
