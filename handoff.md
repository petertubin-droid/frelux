# FRELUX — Global Expansion & Platform Architecture Handoff

Last updated: October 15, 2026
Authoritative repository: `petertubin-droid/frelux` (branch: `main`)
Active Supabase Project Ref: `nfgaaohweygwydoelxnf`

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

## 1A. GLOBAL OPERATIONS ENGINES — OPEN, PARTIAL & UNVERIFIED WORK

This is a source-level backlog, not proof of production deployment, connected credentials, local regulatory review, or end-to-end operation. A route, seed row, migration, test fixture, or AI response is not operational verification. Closed milestones and completion logs are intentionally omitted.

| Capability | Remaining work and release constraints |
|---|---|
| **BIM/CAD** | Current IFC import reports authored quantities for a constrained element set. Only explicitly assigned supported SI and conversion-based units are normalized; unresolved/unsupported units remain raw and labelled. No geometry inference or full IFC-schema support. Expand standards-tested coverage, then build a verified model viewer, revisions/federation, explicit-CRS georeferencing, schedule/cost links, and measurable clash/issues workflows. Never claim geometry or compliance from authored quantities. |
| **GIS** | Broader GIS layers, interoperable formats, and additional licensed/provider-backed imagery remain open. Disclose coordinate system, provider/license, source/date/coverage, and unavailable data. A site map is not full GIS. |
| **Tax, currency & settlement** | Maintain and independently verify jurisdictional source coverage, applicability dates, FX provenance/freshness and outage behavior. Qualified review is required before withholding/settlement rules are calculated. Display FX is not settlement or tax advice; never infer a rate or compute a pending rule. |
| **Standards & compliance** | Maintain a versioned, jurisdiction/project-type scoped evidence catalog with primary sources, effective dates, applicability, amendments, and qualified review. Add deterministic provision-level checks that cite sources and disclose unknowns. No AI-only certification. |
| **Technical translation** | UI translation does not provide reviewed technical-document, drawing-annotation, safety-manual, or field-log translation. Add terminology-managed human review, preserve source/units, test RTL and protected-data handling, and separate machine translation from approved safety instructions. |
| **IoT/telematics** | No complete operational device-ingestion capability has been established. Any future work needs consent, authenticated device identity, validated timestamped signals, data-quality/retention controls, privacy safeguards, and independently reviewed safety alert rules. |
| **Procurement/logistics** | Prototype requisitions are not supplier-connected purchase orders. Verify supplier/material mappings, stock/quotes/lead times, customs, shipment and delivery states by market; add approval/audit flows and provider-backed status. Keep listed, quoted, ordered, dispatched, and delivered distinct. |
| **Regulated finance** | Checkout or milestone planning does not establish escrow custody/release, lien-waiver lifecycle, or AML/KYC/sanctions compliance. Use authorized providers and qualified jurisdiction review, with auditable reconciliation and dispute controls. Never imply funds are held or released by unsupported app logic. |
| **Offline field data** | Local caches/queues do not establish secure multi-user, multi-device project sync. Remaining work includes identity/encryption, conflict resolution, retry/backoff, audit/status, attachment limits, and loss/reinstall recovery. Never promise unsynced browser data survives storage loss. |
| **RBAC/security** | Inventory sensitive routes, RPCs, functions, tables, and storage; verify least privilege and tenant/project/region boundaries server-side. Add a permission matrix, threat model, revocation/audit controls, negative cross-tenant tests, and independent review before high-assurance claims. |

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

### E. Cross-capability and market verification — OPEN

- Build a current market/capability matrix from live registry and production evidence. Test representative estimates, currency, data provenance, missing values, and no-silent-fallback behavior per enabled market. Add E2E confidence/provenance presentation only where supported by actual source data.
- Verify migrations and RLS against the intended environment before claiming they are applied or production-ready. Add negative tenant/role tests and document deployment evidence.

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
