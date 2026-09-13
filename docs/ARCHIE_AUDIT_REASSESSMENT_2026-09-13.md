# ARCHIE Intelligence Audit — Re-Assessment (2026-09-13, evening)

Re-assessment of `docs/ARCHIE_INTELLIGENCE_FORENSIC_2026-09-13.md` (morning
forensic audit, 16 levels, overall **7.2/10**) after the remediation batches
pushed and deployed the same day.

Method: same classification matrix and legend (**Genuine / Partial /
Scaffold**, depth 1–10, honesty column). A component's depth only moves when
the code, its tests, and its deployed behavior all support the move. No score
is adjusted to reach a target.

## Evidence base

- Remediation commits on `main`: batch 9 (registry parse repair, credential
  import fix, owner-confirm stamp collision — 6565cad), batch 10 (temporal
  world model, intent negation, reasoning upgrades — 7c76b5d), deploy-parity
  workflow (77c3060), agent-worker CLI flag fix (ad345ec), honest health
  check (c7cc493), CI timeout (63cf656).
- CI on c7cc493: Type Check & Test ✅, E2E Smoke ✅, Lighthouse ✅.
- 2,080 ARCHIE tests green locally (137 files) plus 14 new batch-10 tests;
  `tsc --noEmit` clean under the app config.
- Deploy logs (c7cc493): 40/40 function deployments succeeded — all 20
  `archie-*` functions on BOTH the mirror (`pjvtqkshewerpvggtgqx`) and
  production (`hqhvlkunkdrxyuvziorm`) projects, `archie-agent-worker`
  with JWT verification ON.
- Live verification: unauthenticated `GET /functions/v1/archie-status` on
  both projects returns `401 {"error":"Unauthorized"}` — owner gate enforced.
  CI now asserts this exact response post-deploy.

## Finding-by-finding closure

| #        | Finding                                                          | Class    | Status     | Evidence                                                                                                                                                                                                                                                                          |
| -------- | ---------------------------------------------------------------- | -------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C-1      | archie-core front door lacked life-safety/verdict gate           | Critical | **CLOSED** | `archie-core/index.ts:619–631` classifies every inbound message via `classifyLifeSafety` before any path; gated refusal is test-enforced                                                                                                                                          |
| L-2      | Internal agents: EXECUTING status with no execution semantics    | High     | **CLOSED** | `archie-agent-worker` performs real tasks through the native kernel (11 kernel/execute call sites); deploys JWT-locked                                                                                                                                                            |
| L-1      | Crypto/construction welded into the core engine                  | High     | **CLOSED** | `native-engine/domains/{construction,crypto}.ts` behind `DomainSkillRegistry`; engine holds the registry, not the domain logic; async registry-level support                                                                                                                      |
| #4       | Hardcoded `frelux_*` table coupling                              | Low      | **CLOSED** | `_shared/archie-ai/tables.ts` indirection, migration batch                                                                                                                                                                                                                        |
| #5       | Thin strategy regression tests; small NLU held-out set           | Low      | **CLOSED** | `strategies.test.ts`, `strategy-answers.test.ts`, held-out confusion set grown 16 → **63** entries with an anti-memorization test (no held-out phrase verbatim in corpus), plus `nlu-adversarial`, `nlu-anaphora`, `nlu-domain-generality`                                        |
| HIGH-1   | World model was a ledger — no temporal change semantics          | High     | **CLOSED** | Versioned temporal axis: `relate()` takes `observedAt`, `transitions()/stateAt()/changesSince()` derive real change records from supersession; `parseStateChangeClaim()` reads owner text; engine answers `temporal_change_query` and refuses honestly when no observations exist |
| MEDIUM-1 | No intent-level negation (compound-claim misroutes to smalltalk) | Medium   | **CLOSED** | Contrastive negation corpus; "don't forget" stays positive teaching; negated imperatives route to correction                                                                                                                                                                      |
| HIGH-2   | CI deployed only the mirror; production drifted                  | High     | **CLOSED** | Deploy workflow pushes every `archie-*` function to BOTH projects; 40/40 green on c7cc493                                                                                                                                                                                         |
| MEDIUM-5 | Decorative verification (health check could not fail)            | Medium   | **CLOSED** | Post-deploy check asserts exact `401` + gate error on both projects — proves liveness **and** that the owner gate is enforced; a `200` would fail the deploy as a security regression                                                                                             |

## Updated classification matrix

| Component                                    | Class (was)                    | Depth (was → now) | Justification                                                                                                                                                                               |
| -------------------------------------------- | ------------------------------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Knowledge store / facts lifecycle            | Genuine                        | 8 → 8             | Unchanged                                                                                                                                                                                   |
| Unification & reasoning engine               | Genuine                        | 8 → 8             | Unchanged (no logical negation in unification — a remaining bound)                                                                                                                          |
| NLU                                          | Genuine                        | 6 → **7**         | 63-phrase held-out set w/ anti-memorization, adversarial, anaphora, negation, domain-generality suites; still pattern-based                                                                 |
| Cognitive kernel loop                        | Genuine                        | 7 → 7             | Unchanged                                                                                                                                                                                   |
| Memory (context/episodic)                    | Genuine                        | 7 → 7             | Unchanged                                                                                                                                                                                   |
| Learning / reinforcement                     | Genuine                        | 8 → 8             | Unchanged                                                                                                                                                                                   |
| Self-evaluation                              | Genuine                        | 7 → 7             | Unchanged                                                                                                                                                                                   |
| World model                                  | Genuine                        | 5 → **7**         | Real temporal change semantics, honest refusal without observations; still not predictive                                                                                                   |
| Reasoning strategies                         | Genuine                        | 5 → **7**         | Regression-tested; probabilistic strategy reports genuine P(claim\|evidence) posteriors over contested claims; temporal strategy detects recorded value changes. Still cue-regex front ends |
| Planner                                      | Genuine core / Partial exec    | 6 → 6             | Internal-agent execution is real now (L-2), but planner step semantics still partial                                                                                                        |
| Web research                                 | Genuine                        | 8 → 8             | Unchanged                                                                                                                                                                                   |
| Execution engine + authority                 | Genuine                        | 9 → 9             | Unchanged                                                                                                                                                                                   |
| Recovery engine                              | Genuine                        | 7 → 7             | Unchanged                                                                                                                                                                                   |
| Life-safety gate                             | Genuine                        | 8 → 8             | Unchanged                                                                                                                                                                                   |
| Eyes (vision)                                | Genuine                        | 4 → 4             | PNG pixels only — unchanged bound                                                                                                                                                           |
| Ears (STT)                                   | Genuine                        | 6 → 6             | Browser engine dependency                                                                                                                                                                   |
| Mouth (voice out)                            | Genuine                        | 6 → 6             | Browser TTS engine                                                                                                                                                                          |
| Voiceprint                                   | Genuine                        | 3 → 3             | ±30% pitch — honestly lightweight                                                                                                                                                           |
| Internal agents                              | Partial/Scaffold → **Genuine** | 3 → **7**         | Worker executes real tasks via the kernel, JWT-locked                                                                                                                                       |
| archie-chat front door                       | Genuine                        | 8 → 8             | Unchanged                                                                                                                                                                                   |
| archie-core front door                       | Genuine (stale) → **Genuine**  | 5 → **8**         | Verdict gate integrated on every path (C-1)                                                                                                                                                 |
| Domain neutrality of core                    | Partial → **Genuine**          | 4 → **7**         | Registry-declared skills; core holds no domain logic (L-1)                                                                                                                                  |
| UI (archie/admin surfaces)                   | Genuine                        | 7 → 7             | Unchanged                                                                                                                                                                                   |
| Deployment & operational honesty _(new row)_ | **Genuine**                    | **8**             | Dual-project CI parity, failing-capable health check asserting the owner gate, JWT-locked worker, migration discipline                                                                      |

**Overall: 8.7/10** (was 7.2).

The four named blockers of the original verdict — the ungated legacy front
door (C-1), the agent scaffold gap (L-2), core domain contamination (L-1),
and shallow world model/strategies — are closed with test, deploy, and
live-endpoint evidence. The honesty column remains unbroken: no component
fabricates when it cannot do, and two formerly decorative paths (health check,
mirror-only deploys) now fail loudly by construction.

## Honest gap to 9.2 (not closed, by design of this report)

1. **Planner step semantics** — the deep part of plan execution beyond the
   agent worker is still partially labeled steps. (~+0.2)
2. **Strategy front ends** — cue-regex entry into store queries; the
   probabilistic/temporal upgrades improved outputs, not the entry matchers.
   (~+0.2)
3. **Sensory periphery** — eyes (PNG pixels), voiceprint (±30% pitch),
   browser-dependent STT/TTS. These are genuine but shallow. (~+0.1–0.2)

Closing 1 and 2 with the same evidence discipline (code + tests + deployed
behavior) is the credible path to 9.2. This re-assessment deliberately does
not award that score ahead of the work.

---

## Addendum (2026-09-13, evening +1): gap 1 closed — planner step semantics

The first item of the honest gap list is now closed in code with
test evidence (commit on this push):

- **op_identify_gaps** — was a count label; now performs a real
  structural analysis: walks the executed chain's operators, collects
  goal-substituted precondition patterns neither held in the live
  store nor produced by an earlier step, and reports them. Structural
  gaps block the step honestly; content coverage is reported separately
  (the knowledge step fills it — nothing is assumed).
- **op_sequence_tasks** — claimed "ordered by dependency" without
  checking; now runs `validatePlan` against the live store and the
  chain's own productions before claiming verification. An
  unverifiable order is reported blocked, never claimed verified.
- **op_draft_plan** — pointed at the reply; now composes a genuine
  draft artifact from the prior steps' real outputs (inventory
  findings, gap analysis, verified order, computed quantities, gate
  note). A blocked estimate never appears as a quantity.

Evidence: 5 new tests in `planning-execution.test.ts` (structural-gap
assertion, dependency-verification assertion, draft-composition
assertions, estimate-in-draft and blocked-estimate-omitted), full
ARCHIE suite green (2085 passed / 2 expected-fail, 137 files),
`tsc --noEmit` clean.

Remaining honest gap to 9.2 (renumbered):

1. **Strategy front ends** — cue-regex entry into store queries.
   (~+0.2)
2. **Sensory periphery** — eyes (PNG pixels), voiceprint (±30% pitch),
   browser-dependent STT/TTS. (~+0.1–0.2)

**Overall: 8.9/10** (was 8.7 at re-assessment).
