# sync.md — FRELUX sync handoff

**This file is temporary.** It exists so another agent can finish the FRELUX
Master Ecosystem Synchronization Directive (Phases 0 to 13).

**Delete this file when the directive is complete.** Completion means every
phase is done, the migrations below are applied, and the owner's open decisions
are answered. Deleting it is part of finishing: do not leave it in the tree, and
do not leave a stub behind.

Last written 2026-10-31 at commit `938c04c7` by the agent that ran Phases 0 to 3
and opened Phase 4.

## Read this first

The directive itself is **not in this repo**. It was given in conversation and
only its constraints survive in the working notes. Phases 0 to 4 were titled in
the directive. **Phases 5 to 13 are not recorded here** because they were not in
the writing agent's context when this file was made. Get the phase list from the
owner before starting Phase 5. Do not invent phase titles or infer scope from
neighbouring phases; that is how a directive gets quietly rewritten.

## Verified state

| Phase                   | Status                  | Evidence                                                                                                                                    |
| ----------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 Discovery and audit   | Done                    | `docs/ECOSYSTEM-SYNC-PHASE0.md`, commits `c255883d`, `aaa3df6c`                                                                             |
| 1 Security              | Done except where noted | Project agent exactly-once fixed `a35cdc92`; public price endpoints verified `aa7f12ce`; RPC hardening `8880b8b5`; guest ceiling `39d5ed6a` |
| 2 Engine reconciliation | Done                    | Duplicate id guard `eaa05c31`, `docs/ENGINE-INVENTORY-RECONCILIATION.md`                                                                    |
| 3 Canonical manifest    | Done                    | `src/lib/ai-foundation/engine-canonical.ts`, commit `cfc1c6e5`                                                                              |
| 4 Calculator to engine  | Measured only           | `docs/PHASE4-CALCULATOR-ENGINE-MATRIX.md`, commit `938c04c7`                                                                                |
| 5 to 13                 | Not started             | Titles unknown here, see above                                                                                                              |

Test state at handoff: 289 tests green in `src/lib/ai-foundation`, full suite
green in CI on every push.

## Blockers that are the owner's, not yours

1. **Two migrations are written but not live.** `supabase db push` is still
   manual, so production still has the anon-callable reward seeder and no guest
   ceiling. Files: `20261031150000_guest_ai_cost_ceiling.sql`,
   `20261031160000_harden_privileged_writers.sql`. Do not report either as fixed
   until they are applied and verified.
2. **Canonical id direction undecided.** The alias map is additive and ships
   nothing destructive, but two entries are unresolved on purpose:
   `painting_wall_area` (painting or wall_finishing) and `timeline_estimator`
   (no counterpart exists). Phase 4 leans on these.
3. **Guest credit minting.** The ceiling is a cost bound, not authentication.
   The real fix, revoking the anon grant and minting only after the provider
   confirms the ad through `verify-rewarded-ad`, changes the guest flow and needs
   the owner's word.
4. **US bulk material prices unavailable.** Twelve candidates probed, all
   blocked or catalogue-less. Needs outreach, not another probe.
5. **Netlify builds are owner-paused.** Nothing shipped since 2026-09-11 is
   live. Do not resume them; the owner does that once price integrity is signed
   off.

## Non-negotiables

- **No sub-agents**, at any point, in the FRELUX architecture. Do the work.
- ARCHIE's core intelligence stays independent of external AI. Gemini is a
  FRELUX-only fallback that ARCHIE never auto-delegates to.
- Admin AI assistant is a Base44 agent. Code assistants are Base44 agents.
- Server-side authorization is enforced server-side, not in the client.
- Never fabricate data. Unpriced is stated as unpriced, inferred is labelled.
- One system per job. Two computation paths for one calculation is a defect, not
  a convenience (see Phase 4).
- UI: premium SaaS aesthetic, no em-dashes, no star-like icons.
- During a phase, run targeted tests only. Full CI happens on push.

## Landmines found the hard way

- **`listEngines()` is the authority for engine counts, never a source grep.**
  Three engines (`foundation`, `doors_windows`, `reinforcement`) are registered
  dynamically, so text extraction undercounts. An earlier doc in this repo said
  17 engines; the truth is 20.
- **Modules re-register their own engines with fresh descriptors.** A duplicate
  guard must compare id plus title plus domain, not object identity. Identity
  broke the app with 40+ failures.
- **Postgres grants EXECUTE to PUBLIC by default**, so "no explicit GRANT" does
  not mean unreachable. `anon` inherits PUBLIC. Judge reachability from
  revocations, not grants.
- **Do not blanket-pin `search_path` on Supabase.** Extensions live in the
  `extensions` schema, so pinning to `public` breaks `gen_random_uuid`, `crypt`
  and pg_cron at runtime. 34 functions still need this, in verified batches.
- **Engine test stubs need a full `EngineResult`** (`ok`, `engine`,
  `calculatedAt`, `quantities`, `costs`, `raw`) or the pre-push `tsc` gate fails.
- **`scan.mjs --apply` INSERTs rather than UPDATEs**, and there is no unique
  constraint on `(market, ref_id, price_type)`, so applying can create two
  active prices for one material. Do not enable `sources.json` apply until that
  is fixed. Large price corrections must be reviewed writes; `SANE_BAND` will
  refuse them.
- **WooCommerce Store APIs need `X-WP-Total` pagination.** Reading page 1 only
  hid every bulk aggregate and block at the GB source.
- **`Object.hasOwn` fails the pre-push `tsc`** (ES2021 lib). Use
  `hasOwnProperty.call`.

## Suggested order from here

1. Phase 4 pilot: route `PaintCalculator` through `executeEngine`, compare old
   and new output on existing fixtures, then generalise with a thin adapter. Do
   not rewrite the tested estimation core.
2. Get the Phase 5 to 13 titles from the owner. Then work them in order.
3. Keep the two unresolved engine mappings visible. Every phase that touches
   pricing, BOQ or the admin matrix will trip over them.
