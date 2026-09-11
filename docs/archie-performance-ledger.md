# ARCHIE Native Engine — Performance Ledger

Owner directive (2026-09-11): every optimization must show a MEASURABLE
before/after gain under the HARD PERFORMANCE GATE. This ledger is the
permanent record of **baseline → change → result → decision**. A gain
that cannot be demonstrated here does not count as a gain.

Benchmark suites (both print a single JSON line for extraction):
- **Capability**: `npx vitest run src/lib/archie/__tests__/native-engine-benchmark.test.ts --disable-console-intercept` → `BENCH_RESULT:` (52 cases, 17 categories, scored 0 / 0.5 / 1)
- **Speed/resource**: `npx vitest run src/lib/archie/__tests__/native-engine-perf.test.ts --disable-console-intercept` → `BENCH_PERF:` (fixed deterministic workloads; latency numbers are comparable only within the same machine/session)

Rule: all existing tests must stay green after each change (last full count: 1139 passed + 2 expected-fail which are documented defects, unrelated to performance).

---

## BASELINE (2026-09-11, commit bbe4789, node v20.20.2)

### Capability: overall 0.942 (49/52)

Weak spots (the honest gap list):
| id | category | score | gap |
|---|---|---|---|
| ms-2 | multi-step-reasoning | 0 | variable binding — transitivity (A→B, B→C ⇒ A→C) not derived |
| cx-3 | context-retention | 0 | cross-session conversation memory not consulted in answers |
| lu-3 | language-understanding | 0.5 | negation handling partial |
| lu-4 | language-understanding | 0.5 | compound multi-intent request partial |

All other 48 cases at full score.

### Speed / resources

| workload | ops | mean ms | p50 ms | p95 ms | heap |
|---|---|---|---|---|---|
| converse-per-turn (full engine, 20-utt workload ×5) | 100 | 1.316 | 1.182 | 3.178 | — |
| store-query-subject@10k | 1000 | 0.269 | 0.272 | 0.280 | +8.62 MB for 10k facts |
| store-query-subj-pred@10k | 1000 | 0.278 | 0.280 | 0.288 | — |
| reasoning-forward-chain@200facts | 100 | 6.443 | 6.338 | 6.852 | — |
| memory-recall@500turns | 500 | 0.356 | 0.330 | 0.679 | — |

**Baseline observations (evidence, not assumptions):**
- Subject-only and subject+predicate queries cost the same → `FactStore.query` is a full scan; the pattern's predicate never narrows candidates.
- Forward chaining at only 200 facts costs 6.4 ms per chain → per-iteration cost scans all facts × rules; at realistic store sizes (10k facts) this dominates.
- `matchesPattern` calls `JSON.stringify` on both objects for every candidate — serialization in the hottest loop.

---

## ENTRIES

(entries below are appended per optimization: change → result → decision)


### Entry 1 — Single-slot capture completion (capability: variable binding / transitivity)

- **Baseline:** ms-2 = 0 (multi-step-reasoning 0.667, overall 0.942). The rule "if ?x part-of <something> then ?x indirect-part-of <that something>" was refused because ?y appeared only in `produces` — sound behavior, but the rule language could not express the capture.
- **Change:** `reasoning.ts` unification path now completes the capture shorthand when exactly ONE free variable and exactly ONE object-elided condition exist: the variable is materialized into the elided slot before binding enumeration. Value always comes from a real matched fact (string objects only — `matchUnder` refuses variable objects on non-strings). Ambiguous shapes (≥2 free vars, 0 elided slots, ≥2 elided slots) remain refused by the unbound-variable guard. No safety property weakened: conclusions still cannot fabricate entities.
- **Result (same suite, same session):** ms-2 = 1. multi-step-reasoning 0.667 → **1.0**. Overall **0.942 → 0.962** (50/52). All other 49 cases unchanged (verified case-by-case — no regression). New regression suite `variable-binding.test.ts` (7 tests: capture works + 4 refusal shapes + true two-hop transitivity + DEFAULT_RULES guard). Reasoning/derived-store suites green.
- **Decision:** ACCEPTED (measurable capability gain, zero regression, safety properties preserved and pinned by tests).
