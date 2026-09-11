# ARCHIE Native Engine — Capability Matrix (final, 2026-09-11)

Consolidated result of the capability + speed pass of 2026-09-11
(baseline → final). Benchmark: `native-engine-benchmark.test.ts`
(52 cases across 17 categories, run against the live engine).
Speed harness: `native-engine-perf.test.ts`. Performance ledger:
`docs/archie-performance-ledger.md` (entries 1–5).

## Capability: 0.942 → 1.000 (52/52)

| Category | Status |
|---|---|
| authority-enforcement (au-1..3) | 1.0 |
| causal-reasoning | 1.0 |
| context-retention | 1.0 |
| contradiction-detection | 1.0 |
| cross-domain-reasoning | 1.0 |
| error-recovery | 1.0 |
| hypothesis-testing | 1.0 |
| language-understanding (lu-1..4) | 1.0 |
| learning-from-outcomes | 1.0 |
| logic | 1.0 |
| mathematics | 1.0 |
| memory-retrieval | 1.0 |
| multi-step-reasoning | 1.0 |
| planning | 1.0 |
| temporal-reasoning | 1.0 |
| tool-selection | 1.0 |
| uncertainty | 1.0 |

Gaps closed this pass: ms-2 single-slot capture completion
(variable binding/transitivity), cx-3 cross-session memory
(temporal fall-through + day/date NLU), lu-3 engine-level
negation, lu-4 compound multi-intent handling.

## Speed (per docs/archie-performance-ledger.md)

| Workload | Before | After | Gain | Entry |
|---|---|---|---|---|
| store-query-subject@10k | 0.268 ms | 0.003 ms | ~134× | 4 |
| reasoning-forward-chain@200facts | 6.341 ms | 0.934 ms | 6.8× | 5 |
| store-query-subj-pred@10k | 0.212 ms | 0.003 ms | ~70× | 4 |
| converse-per-turn | 1.379 ms | 1.321 ms | stable | — |
| memory-recall@500turns | 0.371 ms | 0.377 ms | stable | — |

## Forensic coverage (batches 1–3)

- Batches 1–2 (84 behavioral tests): 2 documented defects,
  dead flow layers activated (P4 device token rotation,
  evolution barrel import), cross-source provenance template,
  honest teaching status.
- Batch 3 (14 probes, world model / owner authority / seams):
  2 real defects found and fixed:
  1. **Self-model integrity at boot** — a persisted identity
     fact (stale or poisoned) silently outranked the seed
     corpus: the seed newcomer parked itself as uncertain and
     the rogue identity answered "who are you". Fix: P8
     arbitration tiering — the seed corpus (versioned
     deployment baseline) now demotes conflicting persisted
     facts at boot, EXCEPT owner corrections (provenance note
     "owner correction: …"), which outrank the corpus and
     survive reboots. (`knowledge.ts`)
  2. **identity_query cited uncertain facts** — the answer
     path took `identity[0]` without the status filter the
     knowledge path already had. Fix: same `status !==
     "uncertain"` filter. (`engine.ts`)
  - Probes passed as-is (no defects): identity answers
    provider-independent; contradictory identity teaching
    does not flip the self-model; honest unknowns; injected
    "authorization"/"admin"/behavior-instruction teachings
    grant nothing; repetition never mints validation; taught
    authorization never enables execution (propose-only
    stands); correction durability across reboot; store
    indexes consistent after consolidate().

## Commits (perf/forensic pass)

a9bda4d, 6c6ff00, 74312c7, 962f412, a765464, 511d02d, + batch 3.
Full suite: 1287 green (2 documented expected-fails). CI green on
HEAD (E2E smoke + Lighthouse included).

## Standing principles (unchanged, enforced by tests)

- Provider independence: no external AI in ARCHIE, ever.
- Consequential actions end at PROPOSE; execution is the owner's.
- Knowledge never silently flips; contradictions are audible.
- Repetition is not validation — real verification events only.
