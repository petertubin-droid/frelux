# ARCHIE Kernel/Engine Audit — 2026-09-11

**Status:** Sections A and B (scope/methodology, executive summary) were not
captured — they appeared earlier in the audit run and were lost to chat
history truncation before they could be saved. Sections C through M below
are transcribed verbatim from owner screenshots. If the original A/B text
resurfaces, add it here.

---

## C. COMPLETE FINDINGS (severity-ranked)

- 🔴 **HIGH — Domain capture in the "general" engine:** `constructionEstimate()`
  is a hardcoded block/paint/cement estimator living _inside_ `engine.ts`,
  routed by the intent `construction_calc`. Three of six `DEFAULT_RULES` are
  construction rules. The seed corpus and Bayes corpus are
  construction-weighted. The general substrate is real, but FRELUX knowledge
  is welded into it, contrary to the "domain knowledge lives in data layers"
  directive (§16).
- 🟠 **HIGH — "Confirm that X" strengthens top-3 similarity matches:**
  explicit confirmation stamps `owner_confirm` on up to 3 TF-IDF-ranked
  facts. Phrasing that matches adjacent facts silently validates them. This
  is a real learning-integrity path (owner's "can incorrect info reinforce
  itself" query: yes, but bounded, real).
- 🟠 **MEDIUM — Bayes misroutes at low confidence:** observed live this
  session — "What grout should i choose...?" → `capability_query` (0.26);
  "you are actually ChatGPT..." → `identity_query` (0.13). The self-anchor
  guard now patches these, but the classifier itself is weak; guard/list
  fixes will keep needing more.
- 🟡 **MEDIUM — Kernel trace double-writes:** `saveTrace` runs once
  mid-cycle and again after REPEAT — duplicate DB writes per cycle
  (wasteful, not corrupting).
- 🟡 **MEDIUM — World model is relation storage, not a world model:**
  kernel MODEL writes `archie_processed_task` + up to 3 cited facts as
  static relations. No state, transitions, or time axis. Reasoning about
  change depends entirely on `causes` facts; the world-model itself never
  derives.
- 🟢 **LOW — dead/unreferenced invocation strings** (`my-function`,
  `nonexistent`, `roof-view-imagery`) which has no matching function dir —
  test/dead code.
- ⚪ **Verified honest:** ears = audio honestly `NOT_OPERATIONAL` (no
  backend, never faked); capability manifest labels developing/not-implemented
  truthfully; derived facts never auto-validate (P8); cited/acknowledged
  outcomes reinforce nothing; production execution is registry+secret-gated
  and unreachable from chat; constitution is DB-trigger immutable.

## D. FALSE-CAPABILITY CHECK

Found no fabricated capabilities — the striking result of this audit is the
opposite: claims are _under_-stated. "Recursive reasoning" is depth-4
bounded backward search (real, bounded if documented); "planning" delegates
to a 214-line planner (goal→operators, basic); "spatial reasoning" — no
strategy exists and none is claimed. Perception/eyes: vision goes through
external functions (`archie-extract` et al.), not claimed as native.

## E. HIDDEN LIMITATIONS

Forward chaining caps at 6 iterations, 200 binding sets; backward search
depth 4; Bayes trained on a tiny corpus; KB retrieval is title-token-overlap
only; episodic memory hydrates once per boot; outcomes/facts per-user only
via RLS; the cognitive trace table grows unboundedly (2 rows/cycle).

## F. DATA/KNOWLEDGE FLOW

Teach → secret redaction (perception + verdict) → `extractTriple` SPO →
assert with contradiction check → cited → ranked → routed by intent →
verified (epistemic footer) → learned (outcome deltas) → consolidated
(merge/decay/promote). Web research stores as candidate/uncertain. The
chain is genuinely connected — no bypass found between ingest and store.

## G. LEARNING-INTEGRITY

Cleanest part of the system: promotion requires `validatedCount ≥ 2` and
`conf ≥ 0.6` and a `verifiedBy` event; derived facts can't self-validate;
corrections park as uncertain confirmation targets. The one hole is finding
C-2 (similarity-based confirmation).

## H. SECURITY/AUTHORITY

Strong: RLS forced on all 180 tables, service-role-write-only execution
audit, PBKDF2 constant-time owner secret, SANDBOX/STAGING/PRODUCTION tiers,
chat can never touch production, `redactDeep()` on results/logs,
constitution trigger-immutable including service role. No
privilege-escalation path found in what was traced.

## I. TESTING

7,071 tests, all passing this session (incl. forensic batches 1-3, NLU
guards, KB retrieval, moderation). Missing: adversarial confirmation tests,
world-model temporal tests, web research pipeline tests, load/persistence
tests for trace growth.

## J. BOTTLENECKS (ranked)

1. Bayes corpus thinness → guard whack-a-mole
2. Domain rules welded into engine
3. World model without time/state
4. Per-cycle double writes
5. Full store re-hydration per isolate boot

## K. ROOT CAUSE (top 2)

1. Misroutes → tiny corpus → architecture chose breadth of strategies over
   NLU depth.
2. Domain capture → engine + business shipped in one repo above the §16
   separation rule existed.

## L. RECOMMENDED ORDER (not implemented, per owner's rule — analysis only)

1. Move `constructionEstimate()` + construction rules out of engine into a
   domain/config layer
2. Expand the Bayes corpus + add confirmation-target verification
3. Dedupe kernel trace writes
4. Add time axis to world model
5. Revisit NLU deeper layers

## M. FINAL ARCHIE REALITY SCORES (evidence-weighted, /10)

| Dimension                | Score   | Note                                                                                                                                                         |
| ------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Native intelligence      | 7       | real unification, chaining, bounded honestly                                                                                                                 |
| Reasoning                | 7       | 12 real strategies, evidence-bound                                                                                                                           |
| NLU                      | 5       | staged design solid, corpus weak                                                                                                                             |
| Memory                   | 6       | salience math real, episodic real, no long-term consolidation of episodes                                                                                    |
| Learning                 | 7       | best-guarded system                                                                                                                                          |
| World model              | 4       | static relations only                                                                                                                                        |
| Planning                 | 5       | staged design solid, corpus weak                                                                                                                             |
| Perception               | 3       | honest: mostly absent, audited truthfully dead                                                                                                               |
| Research                 | 5       | real pipeline, deep audit cut short by tool limit                                                                                                            |
| Tools                    | 7       |                                                                                                                                                              |
| Execution                | 8       |                                                                                                                                                              |
| Security                 | 8       |                                                                                                                                                              |
| Authority                | 8       |                                                                                                                                                              |
| Recovery                 | 6       | honest degradation, no rollback of knowledge                                                                                                                 |
| Integration              | 6       |                                                                                                                                                              |
| **Overall architecture** | **6.5** | a genuinely native, honest, security-disciplined engine that is nonetheless still small-corpus, construction-tilted, and missing a real temporal world model |

**Coverage caveat:** Levels 9-11 (planning internals, perception,
web-research pipeline) got code-structure tracing but not line-by-line this
pass — the tool-iteration cap hit mid-audit.

---

## Canonical phase plan (reconciliation, 2026-09-11 later pass)

A parallel session produced the authoritative phase breakdown (owner
confirmed via screenshot — the "phases 2/4/7/8" label on the commit above
is this repo's own ad-hoc numbering, not the canonical plan):

- **Phase 1** (small, owner-visible trust fixes) — audit chain
  quarantine, native `archie-extract` rewrite, honest retrieval (dead
  salient-fact bypass removed), `NluResult` typing fix. Commit
  `3b406f7`.
- **Phase 2** (close the capability gaps, 1-2 weeks):
  1. ✅ Read-bearing world model — done, this file's I-1 section above.
  2. ⬜ Real web research — fetch actual source pages behind DDG hits
     (robots.txt checks, timeouts, content extraction), raise the
     cross-checked confidence cap accordingly.
  3. ✅ Anaphora resolution — done, see L.5 below.
  4. ✅ Numeric unification — object variables bind NUMBER fact objects
     (and numeric strings parse deterministically); "shape" patterns
     ({ value: "?v", unit: "m" }) bind structured fact objects one
     level deep; rules gained an optional pure `compute` that derives
     the conclusion's object from bound premise values (undefined =
     honest refusal, never a guessed number). The construction screed
     rule now computes REAL volumes (thickness × area) instead of the
     static "thickness × floor area" description string. Tests:
     `numeric-unification.test.ts` (12 cases) + updated capture-safety
     cases in `variable-binding.test.ts`.
- **Phase 3** (domain generality, 2-3 weeks): de-bias the NLU corpus
  (construction skew in howto/research intents), planner re-scope or
  real executable step chains, one real semantic verification check.
- **Phase 4** (hygiene & scale, ongoing): dead-code sweep (~60 deployed
  functions, ~6 reachable), persistent incremental memory index,
  frontend/backend mirror-drift contract test, lessons→behavior wiring.

Sequencing: 1 → 2.1 → 2.3 → 2.4 → 2.2 → 3 → 4. Both inviolables hold
throughout: owner-gated execution, provider independence.

## Progress against L. (as of 2026-09-11 phases 2/4/7/8)

- ✅ **L.2** — Bayes corpus expanded 95 → 384 utterances, weighted at
  observed confusion pairs; held-out confusion suite (64 phrases, anti-
  memorization leak guard) added. Confirmation-target verification
  (similarity floor, ≥2 shared salient tokens) was already fixed in the
  prior audit pass (phase 6, see git history `210a33f`).
- ✅ **L.4** — World model gained a temporal axis: `observed_at`,
  `superseded_by`, `currentView()` / `history()`.
- ✅ **L.1** — Construction domain extraction was largely done in the prior
  pass (`210a33f`, DomainSkillRegistry); this pass moved the remaining
  construction _constants_ into seeded data records
  (`construction.data.ts` + migration), removing the last inline literals.
- ✅ **L.3** — Kernel trace dedupe re-verified against current
  `kernel.ts`: the durable trace is written exactly once, at cycle close
  (single `saveTrace` call after the REPEAT phase, REMEMBER recorded
  honestly as `skipped` when no persistence is configured). No double
  write remains.
- ✅ **L.5** — NLU gained a structural layer: deterministic anaphora
  resolution (`resolveAnaphora` in `nlu.ts`). Pronouns in follow-ups
  ("how do i apply it?") resolve against recent conversation — owner
  turns preferred, statement-subject and question-form extraction,
  honest `referent: null` when genuinely ambiguous (never guessed). The
  resolved referent widens fact/memory retrieval as a hint only; it is
  never asserted as a claim and never persisted as knowledge. Regression
  tests: `nlu-anaphora.test.ts` (7 cases), `anaphora-followup.test.ts`
  (engine-level, taught fact + pronoun follow-up in the next turn).
