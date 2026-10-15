# FRELUX DEPLOYMENT VERIFICATION REPORT

**Report date:** 2026-10-15
**Scope:** Global Operations Engine #7 (workflow control plane) and the
20-market international expansion (P4.18–20 closeout).
**Verification method:** direct live-database reads via the Supabase
Management API (`POST /v1/projects/nfgaaohweygwydoelxnf/database/query`)
and Management API function listings on 2026-10-14/15. Nothing in this
report is inferred from code alone.

This report distinguishes the three layers that must never be conflated:
**code (repo)**, **test fixtures / CI**, and **production**.

---

## 1. Layer definitions

| Layer          | Meaning                                                                                                                   | Where verified                       |
| -------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| **Code**       | Exists in `petertubin-droid/frelux@main` (repo), passing typecheck + local tests                                          | Git history, `npx tsc`, `npx vitest` |
| **Test / CI**  | Covered by the vitest suite (fixtures/mocks; no live credentials; edge functions exercised via Deno-flavoured unit tests) | Full-suite runs noted per section    |
| **Production** | Applied and confirmed live on project `nfgaaohweygwydoelxnf` with follow-up SELECTs                                       | Management API reads cited inline    |

---

## 2. Global Operations Engine #7 — workflow control plane

### 2.1 Code (repo, all merged to `main`)

| Capability                           | Key commits           | Modules                                                           |
| ------------------------------------ | --------------------- | ----------------------------------------------------------------- |
| Deterministic state machine + tables | `0b776b8c`            | `src/lib/workflow/workflow-engine.ts`, migration `20261015410000` |
| Email notifications (Resend)         | `d5905573` `11139488` | `workflow-notify` edge fn, migration `20261015440000`             |
| Web push (RFC 8291/8292)             | `02716c45`            | `workflow-push` edge fn, migrations `20261015450000/460000`       |
| Cross-role handoff (DB + UI)         | `f03f5187` `ae55d2c4` | migration `20261016020000`, `participants.ts`, share panel        |
| File attachments                     | `4e350eb9`            | migration `20261016030000`, `attachments.ts`, private bucket      |
| Exports + offline honesty            | `27115392`            | `exports.ts`, hardened `queries.ts`                               |

Full-suite verification: **7,461 tests / 862 files green** (2026-10-15,
run locally before the exports push); both `tsconfig.app.json` and
`tsconfig.node.json` clean.

### 2.2 Production (verified live)

- **Migrations recorded:** `schema_migrations` contains, verified by
  SELECT on 2026-10-14/15:
  `20261015410000_workflow_rfi_submittal_co`,
  `20261015420000_integration_secrets`,
  `20261015430000_revoke_anon_integration_secrets`,
  `20261015440000_workflow_notify`, `workflow_push`,
  `keys_public_disclosure`, `20261016020000_workflow_participants`,
  `20261016030000_workflow_attachments`.
  Total recorded migrations at report time: **435**.
- **RLS verified live:** 7 participant/reviewer policies, the
  `workflow_documents_immutable_fields` trigger, and the
  `is_workflow_participant` / `is_workflow_reviewer` /
  `is_workflow_document_owner` helpers all confirmed by catalog reads;
  4 workflow_attachments table policies + 3 storage policies and the
  private `workflow-attachments` bucket confirmed on 2026-10-14.
- **Edge functions deployed:** Management API function list on
  2026-10-15 shows `workflow-notify` and `workflow-push` deployed to
  `nfgaaohweygwydoelxnf` (plus the legacy `send-push-notification`,
  untouched). Smoke tests at deploy time: 400/405/401 gates answered
  honestly.
- **VAPID pair:** a standards-correct P-256 pair lives in
  `integration_secrets` (`web-push-public`, client-visible via
  `integration_keys_public`, last4 `ajhE`; `web-push-private`,
  server-only, last4 `M_Ec`), verified by view reads. The legacy
  Supabase env secrets `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` are raw
  hex that do **not** form a valid P-256 pair (derived point mismatch,
  verified 2026-10-14) and are NOT used by `workflow-push`.
- **Email provider:** `integration_secrets` has **no Resend key**
  as of 2026-10-15, so email sends remain honestly dormant ("not
  configured" chip). This is a configuration step, not a code gap.

### 2.3 Test / CI

- Workflow suites: 77/77 (engine, queries, participants, attachments,
  exports, notifications, push, WorkflowTab).
- Offline-conflict contracts: 10 tests pin partial-state honesty
  (no stale notifications, no silent UNIQUE collisions).
- Deno unit tests cover the edge functions' crypto (RFC 8291 §5
  vectors) and at-most-once ledger behavior; they do not send live
  notifications or pushes.

### 2.4 Known deployment gap (frontend)

The **deployed Netlify bundle predates the workflow UI and push
code** (verified 2026-10-14 by scanning the live bundle: no push code,
no VAPID key present). Production impact: none of the new workflow
surfaces are user-visible until the next Netlify build deploys. Per
standing deploy policy this report does not wait on the Netlify build.

---

## 3. 20-market expansion — P4.18–20 closeout (CN ID MX KR IT)

### 3.1 Code (repo)

- Native wall-finishing country profiles + assemblies for all five
  markets (`src/lib/wallfinishing/countries.ts`, `assemblies.ts`;
  assembly id-prefix counts cn/it 8, mx/id 7, kr 6).
- Native electrical + plumbing market profile records
  (`src/lib/estimation/electrical-profiles.ts`,
  `plumbing-profiles.ts`) and construction typologies
  (`construction-typologies.ts`).
- **Regression matrix added 2026-10-15:**
  `src/lib/international/__tests__/five-market-regression-matrix.test.ts`
  (36 tests) pins, per market: native wall-finishing profile with
  resolvable assemblies, NATIVE electrical/plumbing/typology records
  (the resolvers' generic fallbacks are explicitly rejected as
  coverage), international currency registration, 20-mandate set
  membership, and capability-registry honesty (registry state pinned
  as-is; no invented capability).
- **Fix surfaced by the matrix:** Indonesia (ID) was registered as a
  builtin market but had **no entry** in the international country
  currency table; `getCountryCurrency("ID")` silently fell back to
  NGN. Fixed additively in `src/lib/international/countries.ts`
  (`ID → IDR`, 2026-10-15). This is exactly the silent-fallback class
  of bug the mandate's non-negotiable #2 forbids.

### 3.2 Test / CI

- The matrix joins the existing all-markets e2e net
  (`src/lib/wallfinishing/__tests__/all-markets-e2e.test.ts`),
  which runs the full pipeline per market for all 20 profiles.
- Capability-registry sync guard tests
  (`capability-registry.test.ts`) already fail if the SQL seed drifts
  from the TS registry.

### 3.3 Production

- The five markets' deep-profile data (POP/tile catalogs, price
  books, screeding configs) exists in production from the parallel
  catalog-sync effort (migrations `20261013120000`/`20261013130000`,
  verified applied 2026-10-13; 40-market price books, 242 POP rows,
  92 tile rows). These remain admin-gated/inert where role mappings
  are absent — no silent activation.
- The capability registry's verified finishing set remains the 15
  markets of phases 1–8; CN/ID/MX/KR/IT are honestly
  `requires_verification` there until evidence-backed role mappings
  and pricebooks are extended. The new admin Availability surface
  (P3.17) discloses this per engine with citations; it does not and
  cannot manufacture capability.

---

## 4. P3.17 — admin config-center availability surface (new, 2026-10-15)

- `src/components/admin/AdminCapabilityAvailability.tsx` — "Availability"
  tab in Admin → Engine Configuration: per-engine verified/unverified
  market chips across all 20 markets, evidence + unverified reasons
  verbatim from the registry, category/search filters, and
  registry-wide verified-pair metrics. 6 component tests.
- Discloses only; the database cannot be used to manufacture
  capability (enforced by `resolveCapability`, pinned by existing
  registry tests).

---

## 5. Residual honest gaps

1. **Netlify deployment of the frontend** is required before any of the
   workflow UI, push subscription, or availability tab is user-visible.
2. **Resend key** must be pasted in Admin → Integration Center for
   email notifications to leave dormant state.
3. **CN/ID/MX/KR/IT capability verification** (role mappings +
   pricebooks with evidence) remains future data work; the registry
   and admin surface label it honestly as unverified.
4. The legacy `send-push-notification` function and
   `VITE_VAPID_PUBLIC_KEY` Netlify env var belong to the pre-existing
   push pipeline and were intentionally left untouched (additive rule).

---

_Verification artifacts: Management API reads performed 2026-10-14 and
2026-10-15 (schema_migrations, pg_policies, pg_proc, triggers,
storage.buckets, integration_keys_public, function listings). Live
SELECT outputs are quoted in the conversation record for this work._
