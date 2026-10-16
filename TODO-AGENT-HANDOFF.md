# FRELUX — Global Expansion & Platform Architecture Handoff

Last updated: October 15, 2026

---

## 0. STANDING INSTRUCTIONS & NON-NEGOTIABLE CONSTRAINTS

Every agent, developer, and automated pipeline working on FRELUX must strictly obey these hard rules:

1. **Strict Verification & Zero Fabrication**:
   - Never commit or seed prices, material packaging sizes, or construction standards derived from speculation, AI memory, or synthetic data.
   - Every price row must be backed by a named supplier/distributor, physical store survey, official catalog, or government gazette with verifiable date, URL, or physical market location.
   - When real-world market data is not yet verified for a specific country or category, **keep it visibly unpriced and explicitly unverified**. Do not mark a market or category "supported" simply because a placeholder database row exists.
2. **No Silent Nigerian Fallback**:
   - Never silently substitute Nigerian Naira (NGN), Nigerian block dimensions (9-inch hollow sandcrete), or Nigerian voltage/conduit standards when another market (e.g., US, UK, Germany, Kenya, India) is selected.
   - Missing data must trigger clear UI disclosure: _"Price data for this item is not yet verified in [Country]. Please enter your local supplier rate."_
3. **Database Execution & State Integrity**:
   - Supabase project reference is `nfgaaohweygwydoelxnf`.
   - Never commit service keys or secret bearer tokens into the repository.
   - Database writes are executed via Supabase Management API:
     `POST /v1/projects/nfgaaohweygwydoelxnf/database/query`
   - Migrations committed to `supabase/migrations/` are **UNVERIFIED until executed against the live database** and confirmed via follow-up `SELECT` queries.
4. **CI & Supabase Preview Guardrails (The 4 Checks per Commit)**:
   - A commit shows a red X if ANY check fails, not just the CI workflow. There are **FOUR checks per commit**:
     1. `Type Check & Test` (GitHub Actions)
     2. `E2E Smoke Tests` (GitHub Actions)
     3. `Lighthouse Audit` (GitHub Actions)
     4. `Supabase Preview` (Supabase GitHub App)
   - Supabase Preview replays migrations on a persistent preview branch DB and applies only migrations NEW to the branch. Editing an already-applied migration in place has NO effect there. Always fix with a NEW migration that sorts chronologically where needed.
   - Every migration must be valid against a clean replay: no references to missing tables or columns, no duplicate version prefixes, and idempotent guards (`IF NOT EXISTS`).
   - Every commit must pass local verification before pushing:
     `npx tsc --noEmit -p tsconfig.json`
     `npx vitest run src/lib/estimation/__tests__`
     `npm run build`
   - Never push unverified code hoping CI will pass. "CI will catch it" is strictly prohibited.
5. **Concurrent-Editing Precautions**:
   - Always `git fetch origin main` and rebase on `origin/main` before editing.
   - Do not overwrite or revert handoff documentation wholesale.

---

## 1. OPEN UI/UX WORK — VERIFY BEFORE IMPLEMENTING

Previously completed interface changes and historical audit metrics have been removed. Treat these as open verification items, not established defects. Preserve the existing mobile action-bar, market-selector, dark-mode, Learn, and differentiated page-header improvements.

- **Regional support:** verify whether contact options suit the selected market. Add regional routing only for confirmed contacts and response expectations.
- **Accessibility:** audit current calculator labels, keyboard order, focus, screen-reader names, contrast, and visible units. Fix demonstrated issues with regression tests; do not rely on stale counts.
- **Build-to-Roof workflow:** validate with builders whether focused estimates still require unnecessary steps. If so, allow optional assemblies and direct navigation without weakening input checks.
- **Draft recovery:** identify calculators that lose entered values. Add clearly disclosed local recovery and reset controls where needed; do not imply local drafts are cloud-saved.
- **Print/export:** fix demonstrated clipping, page-break, or branding defects while preserving intentional print output.
- **Technical localization:** translated UI chrome is not reviewed technical translation. Add terminology-managed human review and locale QA where needed; distinguish machine translation from approved safety or regulatory instructions.

---

## 1A. GLOBAL OPERATIONS ENGINES — STATUS & OPEN GAPS

This is a source-level status board and backlog, not proof of current production deployment, connected credentials, local regulatory review, or end-to-end operation. A route, seed row, migration, test fixture, or AI response is not operational verification. Completed milestone records are retained concisely; current live behavior must be rechecked before operational claims.

### Engine status and remaining work

Status summaries below preserve the completed implementation records found in GitHub history. They are not independent re-certification of current production behavior; recheck deployment, provider configuration, data freshness, and legal review before making current operational claims.

| Engine | Status and evidence | Remaining work / limits |
|---|---|---|
| **#1 BIM/CAD** | **Partial; IFC takeoff/validation and explicit unit-handling milestones recorded complete.** `BimIfcImport` reports authored quantities for a constrained IFC element set. Commit `c3278aa` adds unit-resolution behavior for supported explicitly assigned SI and conversion-based units, and leaves unsupported/unresolved values raw and labelled. | No inferred geometry, full IFC-schema coverage, full model viewer, revisions/federation, 4D/5D schedule-cost integration, or clash/issues workflow. Expand standards-tested coverage; do not infer quantities or compliance. |
| **#2 GIS** | **Imagery milestone M4 recorded complete** (implementation `f1ba4c6`; status recorded in `1da1527`). The recorded implementation gates Esri satellite imagery on an unexpired license record, stores license/capture-date/tile-template metadata for custom imagery, renders registered imagery, and refuses unregistered custom sources. | Broader GIS layers/formats and provider/market coverage remain open. Recheck credentials, license validity, RLS, and deployment before asserting current live operation. A site map is not a full GIS engine. |
| **#3 Predictive analytics & AI** | **M1–M4 implementation recorded complete** (feature commits `b510df0`–`ee9a640`; status record `c8126f7`): outcome data, chronological walk-forward backtesting/calibration, regional data-quality/bias gates, and safety decision-support behind an independent-validation gate. | Do not call model predictions independently validated without a recorded independent review; safety outputs remain decision-support. No wearable/camera feed is implied. Recheck current runtime and representative data before operational claims. |
| **#4 Tax & currency conversion** | **M1–M4 recorded complete** (implementation `8517c49`; status-board update `1da1527`): cited 20-market tax catalog, deterministic refusal for unknown/variable rates, provenance-bearing FX with explicit bridge paths and stale-rate limits, and the BOQ Tax & FX card. | Withholding remains informational until qualified legal review; not settlement execution or tax advice. Refresh citations/effective dates and verify provider freshness/outage behavior before release. Never infer missing rates. |
| **#5 Regulatory compliance & standards** | **Recorded complete** (implementation `9defa7f0`; migration `20261017200000` applied live and verified). The `construction_standards` registry now covers all 20 markets with web-verified refs/authorities/dates (ID/MX/KR closed: SNI 03-2847-2002, SNI 1726:2019, RCDF-CDMX, NTC-Concreto, KBC/MOLIT, KCS 14 20 10). A deterministic checklist generator cites exact provisions, flags non-high-confidence items as pending verification, discloses unknown scopes, and gates expert review behind `compliance_reviews` (RLS forced, admin-only writes; pending = disclosed, never certified). BOQ carries the cite-and-flag `StandardsCitationsCard`; page at `/contractor/compliance`. | Qualified humans must still review pending rows; coverage beyond the 20 markets is not claimed. The checklist cites, it never certifies; no AI-only certification, no blueprint checking. |
| **#6 Technical translation** | **M1+M2 recorded complete for the priority markets (JP/FR/BR/SA/AE)** (migration `20261017210000` applied live and verified). Japanese registered as a dictionary language (kana-based detection added); web-verified terminology dictionaries live for ja (17), pt-BR (19), ar-Gulf (18), fr (20) — all `provisional` until an admin verifies in the existing construction_terms review workflow. New deterministic technical-label translator (`technical-labels.ts`): dictionary-only, longest-match, measurements preserved character-for-character, unknown tokens kept in English and disclosed, and safety/regulatory text refused outright (never machine-translated). | Terms remain provisional until human verification. M3 (2026-10-15): the label translator is now wired into the BOQ surface via `BoqTranslationCard` (renders a translated schedule preview under Line items when the UI language is non-English; read-only, the saved quote and bank export always stay in the source language). Pool resolution is DB-first with a disclosed curated-seed fallback (`translation-pool.ts` + `instantiateSeedTranslationRecords`). RTL (ar renders dir=rtl with source lines kept LTR), protected-data (measurements preserved character-for-character) and safety-refusal behaviours are covered by component tests. Remaining: terminology-managed human review of technical documents/drawings/field logs, a public /ja/ UI locale (needs full hero-key translations), and wiring label translation into individual estimation result pages. Machine output is material labelling only, never approved safety instructions. |
| **#7 Workflow & automation** | **Construction workflow control plane recorded complete/live-verified** (implementation `0b776b8`; completion audit `e4e27a0`; later handoff describes notifications, role handoffs, attachments, exports, and offline-conflict disclosure). | Revalidate current provider configuration, RLS and end-to-end delivery before current production claims. Recorded caveats include client-triggered dispatch and no external non-app delivery. This does not make every operations engine complete. |
| **#8 IoT & telematics** | **M1 COMPLETE + live-verified (2026-10-15, migration 20261018000000, edge function iot-ingest deployed).** `iot_devices` (owner-scoped, consent-gated, per-device retention) + `iot_telemetry` (RLS FORCED, owner read-only, NO client write path — service-role inserts only via the key-authenticated iot-ingest function). Strict registry validation: paired metric/unit, plausible ranges → suspect (stored, flagged), unknown metrics → rejected, future/stale timestamps refused, consent gate + status gate live-tested E2E (valid stored / suspect flagged / rejected refused / wrong-key 401 / no-consent 409). API keys hashed SHA-256, raw shown once at registration. GOTCHA: this project's default privileges do NOT grant service_role SELECT/INSERT on public tables — migrations needing service-role access must GRANT explicitly (20261018000000 includes it). M2 COMPLETE (2026-10-15, signal-mapping.ts): deterministic Nurse-Saul maturity (ASTM C1074, datum −10 °C, trapezoidal, valid-reading-only, >6 h gaps split into segments never interpolated), equivalent age at 20 °C, explicit no-strength refusal (needs project-calibrated curve), site-condition bands (ACI 306R-10 <4 °C / ACI 305R >32 °C, ALL verification:pending — never compliance verdicts), vibration evidence-only w/ M4 independent-review disclosure. Wired into /contractor/iot derived-state panel. M3 COMPLETE (2026-10-16, iot-providers.ts): verified provider catalog (Giatec SmartRock + COMMAND Center maturity, Instantel Micromate + Syscom vibration, Davis Vantage Pro2 weather, Samsara + Geotab telematics) — every entry web-verified from the provider's public page w/ citation + date, connection ALWAYS not-connected (FRELUX has no authorized provider API; data flows only via owner device keys), no data-ownership claims (deferred to provider terms), unknown provider strings resolve to explicit not-in-catalog disclosure. Catalog + per-device disclosures wired into /contractor/iot. M4 COMPLETE (2026-10-16, safety-alerts.ts + migration 20261019000000_iot_safety_thresholds — COMMITTED, NOT YET APPLIED LIVE: all sandbox Supabase management tokens are 401; apply with a fresh SUPA_TOKEN when re-supplied). iot_safety_thresholds: expert-review gate (admin-only writes via is_admin(), public read) — approved rows require reviewer_name + reviewed_at + cited basis; CHECK-constrained to registry metrics/device types (sync-tested vs METRIC_REGISTRY/DEVICE_TYPES). safety-alerts.ts: alerts evaluated ONLY against approved thresholds; pending/rejected invisible; no approved threshold = explicit no-verdict disclosure, never an invented default; only valid readings trigger; every alert carries basis + reviewer + date + informational-only disclosure. Safety panel wired into /contractor/iot. GOTCHA: page test auth mock must return a STABLE user object — a fresh object per render re-fires the [user] effect each state update, consuming mockResolvedValueOnce and overwriting it with the base mock. WorkflowTab audit-trail test is flaky under full-suite load, passes isolated. Engine #7 now functionally COMPLETE pending live migration apply. |
| **#9 Procurement & logistics** | **Partial: marketplace, supplier/price intelligence, and requisition prototypes.** | No verified global quote-to-fulfillment, stock/lead-time, customs, shipment tracking, or delivery chain established. Add market-specific supplier verification, approval/audit, and provider-backed status; keep listed, quoted, ordered, dispatched, and delivered distinct. |
| **#10 Fintech, escrow, lien waivers & AML** | **Partial: checkout and milestone planning only.** | No regulated escrow custody/release, lien-waiver lifecycle, or AML/KYC/sanctions capability established. Requires authorized providers, qualified legal review, auditable reconciliation/dispute controls; never imply unsupported fund custody or compliance. |
| **#11 Sync & offline-first field data** | **M1-M4 COMPLETE + live-verified (2026-10-16, migration 20261020100000 applied live).** M1 trust boundary + device identity: field_capture_log insert policies hardened (old permissive public_insert dropped; anon may only insert UNATTRIBUTED rows, authenticated only created_by = auth.uid() — closes the row-planting hole), device_id uuid column + index (stable client UUID from src/lib/estimation/device-identity.ts, fresh after storage loss — never fingerprinted), payload CHECK 2 MiB. M2 retry/backoff (src/lib/estimation/sync-scheduler.ts): deterministic exponential backoff 1 min x2 cap 30 min with seeded ±20% jitter, pure shouldAutoSync() decision with honest reasons, wired into FieldSync page (30 s tick + 'online' event, admin auto_sync rule respected). M3 recovery + disclosure: exportQueueDocument() JSON backup download button, storage-loss disclosure block, signed-out attribution note, sync history persisted in localStorage. M4 attachment limits: validateCapturePayload() refuses (never truncates) detail > 20k chars, non-list photos, > 4 photos, non-data-URL photos, photo > 1 MiB, payload > 2 MiB — enqueue throws honestly. Conflicts: captures are append-only with client-UUID PK, so duplicates are the only conflict and resolve idempotently by construction (duplicate outcome = safe removal). GOTCHAS: page tests needing manual Sync-now must setAutoSyncRule(false) — auto-sync now fires on queue change when online; offline banner text appears twice by design (getAllByText); Supabase query API returns only the LAST statement's result per call. Suite 929 files/8096 tests, tsc 0. |
| **#12 RBAC / clearance and region-scoped security** | **COMPLETE M1-M4 (2026-10-21, migrations 20261021100000 + 20261021200000 + 20261021210000 all applied live + verified).** M1 permission-matrix.ts (8 roles x 15 capabilities, mirrors DB CHECK constraints, revocation-beats-role, registry-sync tests). M2 service gating + suspend/revoke/restore member lifecycle w/ audit rows + WorkspaceSettings UI. M3 live audit: 66 tables FORCE RLS (0 survivors verified); CRITICAL escalations closed — promote_to_admin was executable by ANY authenticated user (SECURITY DEFINER, no check) → client EXEC revoked; admin_adjust_credits(_v2) + admin_approve/reject_nin trusted caller-supplied p_admin_id (confused deputy) → auth.uid() caller guards; seed_reward_catalogue anon EXEC revoked; profiles self-escalation verified blocked by WITH CHECK. docs/rbac-threat-model.md = measured findings, discloses open surfaces. M4 security_posture_reviews gate (admin-only writes, approval requires reviewer/date/findings; 3 surfaces seeded pending) + security-posture.ts evaluator + WorkspaceSettings disclosure card. Posture reads "not independently reviewed" until an admin writes an approved row — by design. | Independent review of the audit findings pending (intentional gate); region-scoped data residency (EU/AE) is a follow-up, not started. |

### Release gate

For every engine/market: use authoritative sources or contracted providers; record coverage and effective dates; name an accountable local reviewer; test missing, stale, outage, permission, and offline states; configure secrets securely; verify end-to-end behavior; and assign monitoring and rollback ownership. Keep capabilities **partial/unverified** or **coming soon** until the applicable gate passes. Do not claim live operation based on repository history.

---

## 1B. INTERNATIONAL MARKET READINESS — OPEN GAPS

The target is every country currently represented by the live FRELUX market registry. The list, deployment state, and current production coverage must be checked when work starts; this handoff does not certify any country as operational. Repository configuration, seeded data, or historical audits are not proof of current production coverage.

- **Estimation/materials:** validate enabled calculators against authoritative local standards, product specifications, pack sizes, rounding, effective dates, and material-role mappings. Test missing-data behavior. Never silently apply Nigerian assumptions to another market.
- **Pricing/tax/currency:** verify current supplier coverage and provenance by market. Separate local valuation, display FX, settlement FX, and tax. Never infer rates or present seeded prices as live. Require qualified jurisdiction review for tax/withholding outputs.
- **Credentials:** define local issuing authorities, credential scope/class, good-standing, insurance, and safety requirements. Add evidence, auditable human review, expiry/revocation, and privacy controls. A profile or document review alone is not proof of local licensure.
- **Timeline/logistics:** use verified local calendars and provider-backed shipping/customs/lead-time data where available. Label climate/productivity heuristics as planning estimates, not predictions or guarantees.

### Per-market activation gate

Work one market at a time. Record authoritative sources/providers, coverage and effective dates, accountable local reviewer, market-specific tests, missing/stale/outage behavior, secure integration configuration, end-to-end verification, and monitoring/rollback owner. Resolve product/pack-size and role-mapping mismatches before activation. Keep each unverified market/capability **partial/unverified** or **coming soon** until the gate passes. Historical audit notes and migrations do not establish live production status.

---

## 2. INCOMPLETE, PENDING, PARTIAL & UNVERIFIED WORK (Active Queue)

Only open work belongs here. Recheck current source and production state before acting; this list does not certify live data or migrations.

### A. Rebar price books — OPEN

- Inventory current coverage by market and rebar size from the live registry/database before prioritizing; prior live counts are stale until reverified.
- Fill gaps only from attributable distributor catalogs, supplier quotes, or dated physical surveys. Record units, sizes, market, source, and effective date. Never seed estimates from memory or synthetic prices.

### B. Price provenance — OPEN

- Query the current production inventory for low-confidence rows or rows without attributable source evidence; do not reuse historical counts.
- Replace or clearly mark indicative values. Upgrade confidence only after independent source verification and recording provenance.

### C. Procurement — OPEN GAPS

- The existing interface is a purchase-requisition prototype, not a supplier-connected purchase order. Verify supplier-to-market material-role mappings and sourcing; persist validated packaging data; add approval/audit steps; integrate quotes, stock, and lead times only from confirmed providers; distinguish requisitions from confirmed orders and delivery.

### D. BIM/CAD — OPEN GAPS

- IFC import reports authored quantities for a constrained element set. It converts only explicitly assigned supported SI and conversion-based units; missing, unsupported, or unresolved units stay raw and visibly labelled. It does not infer geometry or support the full IFC schema.
- Expand standards-tested IFC coverage. Keep geometry extraction separate until supported primitives, placements, and transforms are implemented and independently tested. Then stage a model viewer, measurement verification, revisions/annotations, federation/georeferencing, schedule/cost links, and auditable clash/issues workflows.
- Tests must cover declared quantities, supported unit conversions, unresolved-unit honesty, malformed/unsupported inputs, and limits. Do not require invented slab volumes or wall areas when the file supplies no such quantities.

### E2. Wave 1.3 Click-to-Invoice — COMPLETE (2026-10-16)

Migrations `20261022100000_invoices.sql` + `20261022110000_invoice_counter_rpc.sql` applied live + verified. Tables: `invoices` (snapshot of a boq_quote, per-invoice currency DEFAULT 'XXX' — never NGN, stored status draft/issued/cancelled only), `invoice_payments` (amount>0 CHECK, method CHECK, CASCADE), `invoice_counters` (per-user/per-year); all RLS FORCED with owner policies (payments scoped via owning invoice). `reserve_invoice_number(year)` RPC: single-statement atomic upsert-increment, auth.uid()-pinned, EXEC revoked from PUBLIC, granted to authenticated — PostgREST upserts cannot express "last_number + 1", so the RPC is the only reservation path.

Code: `src/lib/finance/invoice-engine.ts` (pure — verbatim deep-copied quote snapshot, `INV-YYYY-####` refs, due date = issue + terms, `deriveInvoiceStatus()`: paid requires covering payments, partially_paid never claims paid, overdue is date-based not time-of-day, currency `XXX` when unknown). `src/lib/finance/invoice-service.ts` (create-from-quote via RPC ref, record/delete payment, issue/cancel/draft status, `fetchInvoices` derives state at read time). `src/components/finance/InvoicesCard.tsx` on BoqGenerator: create-from-quote (per-line totals from `result.line_totals`, NOT raw BoqLineItem which has no `total`), issue/cancel, payment recording, derived badges, branded print.

GOTCHAS: (1) `boqTaxLabel(market).short` — the interface has `.long`/`.short`, NOT `.label`; a `.label` access silently yields undefined. (2) thenable-chain mocks: make every chain method return the chain and give the chain a `then` — per-method resolve mocks break under any composition order. (3) Don't `setMsg(null)` inside a shared refresh — it erases the action success message the instant it renders (tests caught this as a real UX bug). (4) Card fetches only with a signed-in userId; RLS is the law, the eq filter is just a shape.

Remaining follow-ups (optional, not blockers): invoice email/share delivery, per-market numbering format config (currently global INV-YYYY-####), and credit-ledger integration with the existing billing engines when #10 regulated finance is scoped.

### E. Cross-capability and market verification — OPEN

- Build a current market/capability matrix from live registry and production evidence. Test representative estimates, currency, data provenance, missing values, and no-silent-fallback behavior per enabled market. Add E2E confidence/provenance presentation only where supported by actual source data.
- Verify migrations and RLS against the intended environment before claiming they are applied or production-ready. Add negative tenant/role tests and document deployment evidence.

### F. Roof structural design — OPEN / PRELIMINARY CHECK ONLY

- Roof framing quantity takeoff remains separate from structural design. The current UI adds an explicitly code-agnostic, single-span, simply-supported member check for timber/steel using user-entered design load, section properties and resistances; this is a preliminary calculation, not operational jurisdictional design or code-compliance verification.
- Before expanding: select and verify one market’s current primary-source design basis, load combinations (including wind uplift), material grades and resistance factors; obtain a qualified local structural engineer’s review and benchmark cases. Do not treat market selection as code support or allow Nigerian defaults.
- Research update: the Federal Ministry of Housing and Urban Development-hosted Nigerian National Building Code PDF includes Table 8.10 ordinary roof live-load values by slope/tributary area and separate provisions requiring wind/earthquake resistance, ponding consideration, and special-use roof loads. The app exposes the Table 8.10 figure only as a linked, reference-only lookup and never adds it to the total design load. Source: https://bend.fmhud.gov.ng/upload/download/25080529456.pdf. The PDF references separate NCP2 timber design tables; no verified complete market design basis or published universal member capacities were found. Keep jurisdictional structural design open and unavailable.
- A solid rectangular strong-axis geometry helper calculates gross elastic section modulus, second moment, and effective shear area from entered width/depth. It does not infer material strength or cover hollow/built-up sections. Maintain validation and review gates before extending this helper.
- Add member/system coverage only after independently validated formulas for stability/buckling, bearing, connections, lateral restraint, uplift, bracing, multiple spans, and roof-system load paths. Keep unavailable/unverified markets explicit and design output non-certifying until the full market release gate passes.


### F. Engine-specific remaining work — OPEN

Use the status table in Section 1A as the source of truth for completed milestone records and limits. The items below are open follow-up, not claims that an engine is absent in full.

- **#5 Regulatory standards:** Recheck current live `construction_standards` coverage and source dates first. The previous handoff flagged Indonesia (ID), Mexico (MX), and South Korea (KR) for verification; confirm whether those gaps remain, then fill only with current primary-authority sources and add jurisdiction-scoped review/checks.
- **#6 Technical translation:** Build terminology dictionaries and a human-review workflow for construction terms, starting from the previously proposed locale list (JP, FR, BR, SA, AE) only after confirming current supported locales. Keep technical, safety, and regulatory instructions clearly separated from unreviewed machine translation.
- **#8 IoT/telematics:** Define consent, authenticated device onboarding, data quality/retention, privacy, and independently reviewed alert gates before integrating any sensor or equipment feed.
- **#9 Procurement/logistics:** Extend beyond requisition prototypes only with verified suppliers/providers; implement quote/order/dispatch/delivery states, market-specific customs/lead-time evidence, approvals, and exception audit.
- **#10 Regulated finance:** Scope licensed payment/escrow and compliance providers with qualified jurisdiction counsel; design auditable reconciliation, dispute, lien-waiver, and AML/KYC controls before any production money movement claim.
- **#11 Offline sync:** COMPLETE — see engine row.
- **#12 RBAC/security:** COMPLETE M1-M4 — see engine row. Audit + hardening live-verified; independent review intentionally pending via security_posture_reviews.

- **#2 GIS and #4 tax/FX:** Keep their completed milestone records, but revalidate current license/provider state, citation freshness, FX freshness/outage behavior, and production deployment before extending markets or making live-operation claims.

---

## I. Phase 1 Save → Share → Pro Connect Journey (OPEN)

See [`docs/phase1-save-share-pro-connect-roadmap.md`](docs/phase1-save-share-pro-connect-roadmap.md) for the detailed acceptance gates. Existing foundations include anonymous/device saves, Google sign-in, calculator-to-contractor-project saves, share-link records/routes, and Pro Connect profiles; these are not yet proof of an integrated end-to-end flow.

- Keep calculating/exporting free and anonymous; make cloud save an optional sign-in gate that resumes the intended save after Google OAuth. Keep local/device saves distinct; do not silently upload them.
- Enable phone sign-in only after production SMS coverage, abuse controls, delivery, and redirect configuration are verified. Pro Connect phone confirmation is not general app phone authentication.
- Reconcile saved calculator records (`contractor_projects`/project calculations) with `/shared/:id` before offering live share. Build a read-only, least-data public view with owner preview, explicit consent, revocation/expiry, and anonymous-access tests. Do not expose addresses, contacts, private notes, or unrelated records by default.
- Show screeder discovery only for screeding work and actual trade/service-area matches. Do not hard-code counts or claim “near you,” “vetted,” “verified,” or “available” beyond matching evidence; request location when needed and keep project data private.
- Verify auth resume, save-once behavior, owner isolation/RLS, share privacy/revocation, match/empty/stale states, mobile accessibility, migration replay, production build, and deployed behavior before calling the journey operational.

## 3. VERIFICATION COMMANDS & RUNTIME ENVIRONMENT

Before committing any change to the repository, run these exact verification commands:

```bash
# 1. Strict TypeScript type check (must produce zero errors)
npx tsc --noEmit -p tsconfig.json

# 2. Run unit & estimation tests
npx vitest run src/lib/estimation/__tests__

# 3. Production Vite build check
npm run build
```

### Database Verification Queries (Supabase Management API)

Verify live price book counts after migration runs:

```sql
-- Check active prices by market
SELECT market, count(*)
FROM estimation_prices
WHERE is_active = true
GROUP BY market
ORDER BY count(*) DESC;

-- Check confidence breakdown
SELECT scan_confidence, count(*)
FROM estimation_prices
GROUP BY scan_confidence;
```

- 2026-10 roof-market research update: added a source-linked readiness inventory for exactly the 20 markets configured in `BUILTIN_MARKET_PROFILES`. Located standards/framework references are distinguished from a validated design basis; no market is enabled for code-based roof design. The Nigeria Table 8.10 lookup remains reference-only with its printed-unit caveat. Some markets have no verified primary-source link in this research pass. This inventory is discovery evidence, not proof of code adoption, complete technical data, professional review, or live operation. Remaining work: obtain and version adopted local load/material standards, implement only lawfully usable provisions, benchmark against independently reviewed examples, and obtain qualified local engineer review before enabling calculations.
