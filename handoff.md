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

## 1A. GLOBAL OPERATIONS ENGINES — STATUS & OPEN GAPS

This is a source-level status board and backlog, not proof of current production deployment, connected credentials, local regulatory review, or end-to-end operation. A route, seed row, migration, test fixture, or AI response is not operational verification. Completed milestone records are retained concisely; current live behavior must be rechecked before operational claims.

### Engine status and remaining work

Status summaries below preserve the completed implementation records found in GitHub history. They are not independent re-certification of current production behavior; recheck deployment, provider configuration, data freshness, and legal review before making current operational claims.

| Engine                                      | Status and evidence                                                                                                                                                                                                                                                                                                                       | Remaining work / limits                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **#1 BIM/CAD**                              | **Partial; constrained IFC takeoff, validation, unit handling, and portable JSON review-record export are implemented in source.** Export includes declared takeoff, warnings, filename, and limitations; source model remains local and is not included.                                                                                 | No inferred geometry, full IFC-schema coverage, full model viewer, revisions/federation, 4D/5D integration, clash/issues workflow, cloud project persistence, or independent standards certification. Continue schema/unit benchmark coverage; do not infer quantities or compliance.                                                      |
| **#2 GIS**                                  | **Imagery milestone M4 recorded complete** (implementation `f1ba4c6`; status recorded in `1da1527`). The recorded implementation gates Esri satellite imagery on an unexpired license record, stores license/capture-date/tile-template metadata for custom imagery, renders registered imagery, and refuses unregistered custom sources. | Broader GIS layers/formats and provider/market coverage remain open. Recheck credentials, license validity, RLS, and deployment before asserting current live operation. A site map is not a full GIS engine.                                                                                                                              |
| **#3 Predictive analytics & AI**            | **M1–M4 implementation recorded complete** (feature commits `b510df0`–`ee9a640`; status record `c8126f7`): outcome data, chronological walk-forward backtesting/calibration, regional data-quality/bias gates, and safety decision-support behind an independent-validation gate.                                                         | Do not call model predictions independently validated without a recorded independent review; safety outputs remain decision-support. No wearable/camera feed is implied. Recheck current runtime and representative data before operational claims.                                                                                        |
| **#4 Tax & currency conversion**            | **M1–M4 recorded complete** (implementation `8517c49`; status-board update `1da1527`): cited 20-market tax catalog, deterministic refusal for unknown/variable rates, provenance-bearing FX with explicit bridge paths and stale-rate limits, and the BOQ Tax & FX card.                                                                  | Withholding remains informational until qualified legal review; not settlement execution or tax advice. Refresh citations/effective dates and verify provider freshness/outage behavior before release. Never infer missing rates.                                                                                                         |
| **#5 Regulatory compliance & standards**    | **Partial.** A sourced construction-standards registry and market-specific entries exist in repo/live-audit history.                                                                                                                                                                                                                      | Registry is not comprehensive compliance coverage or automated blueprint checking. Continue the documented gaps, including construction-standards coverage for Indonesia, Mexico, and South Korea; verify current records and primary authorities. Add scoped, versioned provision checks with qualified review; no AI-only certification. |
| **#6 Technical translation**                | **Partial: translated UI only.**                                                                                                                                                                                                                                                                                                          | Build terminology-managed, human-reviewed technical-document/drawing/safety/field-log translation. Preserve source and units, test RTL and protected-data handling, and distinguish machine translation from approved safety instructions.                                                                                                 |
| **#7 Workflow & automation**                | **Construction workflow control plane recorded complete/live-verified** (implementation `0b776b8`; completion audit `e4e27a0`; later handoff describes notifications, role handoffs, attachments, exports, and offline-conflict disclosure).                                                                                              | Revalidate current provider configuration, RLS and end-to-end delivery before current production claims. Recorded caveats include client-triggered dispatch and no external non-app delivery. This does not make every operations engine complete.                                                                                         |
| **#8 IoT & telematics**                     | **No complete operational device-ingestion capability established.**                                                                                                                                                                                                                                                                      | Any implementation needs consent, authenticated device identity, validated timestamped signals, data-quality/retention controls, privacy safeguards, and independently reviewed safety alerts.                                                                                                                                             |
| **#9 Procurement & logistics**              | **Partial: marketplace, supplier/price intelligence, and requisition prototypes.**                                                                                                                                                                                                                                                        | No verified global quote-to-fulfillment, stock/lead-time, customs, shipment tracking, or delivery chain established. Add market-specific supplier verification, approval/audit, and provider-backed status; keep listed, quoted, ordered, dispatched, and delivered distinct.                                                              |
| **#10 Fintech, escrow, lien waivers & AML** | **Partial: checkout and milestone planning only.**                                                                                                                                                                                                                                                                                        | No regulated escrow custody/release, lien-waiver lifecycle, or AML/KYC/sanctions capability established. Requires authorized providers, qualified legal review, auditable reconciliation/dispute controls; never imply unsupported fund custody or compliance.                                                                             |
| **#11 Sync & offline-first field data**     | **Partial: local cache/queue and offline prototypes.**                                                                                                                                                                                                                                                                                    | Not secure multi-user, multi-device project sync. Complete identity/encryption, conflict resolution, retry/backoff, audit/status, attachment limits, and loss/reinstall recovery. Do not promise unsynced browser data survives storage loss.                                                                                              |

| **#12 RBAC / clearance and region-scoped security** | **Partial: application auth, roles, and database RLS exist; comprehensive boundary verification not established.** | Inventory sensitive routes, RPCs, functions, tables, and storage; verify least privilege and tenant/project/region boundaries server-side. Add permission matrix, threat model, revocation/audit, negative cross-tenant tests, and independent review before high-assurance claims. |

### Current implementation tranche

- Market packaging/pricing: cement package-size observations are recorded with source URL, publisher, source type, and scope note for all 32 configured markets. The takeoff UI links to the records and differentiates a source-observed product size from an unsupported planning assumption; unknown-market legacy placeholders remain flagged. These are product-level web observations checked 2026-10-22, not national standards, supplier endorsements, complete brand catalogs, or proof of current local stock. Profiles needing a regional/product match remain open for local supplier confirmation. Bundled category/slug prices use exact-market lookups; explicit configured inheritance remains visible in role resolution.
- BIM/CAD operations: `/bim-ifc-import` now exports a versioned JSON takeoff review record containing the declared IFC quantities, parser warnings, source filename, and limitations. The source IFC is never embedded or uploaded. This is not a full BIM/CAD workflow or cloud-synced multi-device operation.
- Cross-engine operations summary: the ProjectDashboard "Operations" tab (commit c3f9da77, hardened in the next slice) aggregates tax status, workforce credentials, project-linked procurement/shipments and schedule impact. Tax provenance is rendered verbatim from the stored quotation (verified rule with citation/reviewer validation, manual assumption explicitly weaker, or tax_not_determined); registry-verified and document-reviewed credentials stay distinct; procurement counts come from the deterministic state machine; schedule reports phase progress plus fail-closed calendar availability without inventing dates. Permission-denied (42501), provider-error, empty and pending states are distinct. WCAG affordances: aria-live summary, focus-visible links, global reduced-motion guard.
- Deferred: procurement/logistics fulfillment and regulated fintech remain prototypes pending authorized providers, market-specific verification, and legal/compliance review. Do not present unsupported stock, shipping, custody, KYC, or delivery as operational.

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

## 2. CONSTRUCTION CALCULATORS & PLAN TAKEOFF — DELIVERY STATUS / ROADMAP

This section supersedes the previous active queue. It records source-level implementation only; route presence or unit tests do not establish field validation, country-specific standards compliance, pricing coverage, or production deployment. The supported market list is currently 32 market codes in `src/lib/international/market-context.tsx`; confirm the live list before expanding it.

### Phase 1 — Standalone quantity worksheets (initial implementation in repository; market validation open)

The following routes are registered in the tool catalogue and application: masonry, plastering/rendering, drywall/partitions, paving, gravity drainage, temporary works, insulation, demolition, and a septic/soakaway worksheet. They calculate preliminary quantities from measured or user-entered assumptions. They are not structural, sanitation, stormwater, code-compliance, or permit designs.

- **Market caveat:** market selection and editable profiles are available. Cement packaging has source-linked product-level observations for the 32 current markets, but some evidence is retailer/trade-publication based, multiple sizes coexist, and regional/current availability or profile-to-product match is not confirmed. Treat each as an observation, not a country standard; confirm the actual product label, locality, and current supplier before procurement. Other country-specific product sizes, norms, rates, standards, and local adoption remain unverified. Missing/unknown data must be disclosed, never presented as a verified national value.
- **Masonry/plaster/drywall/paving:** check product geometry, openings, mortar/mix, coat thickness, board/framing, joints, compaction and waste assumptions against actual project specifications. The drywall worksheet does not yet constitute a complete shop-drawing frame schedule.
- **Drainage/septic:** gravity drainage quantities and an explicit-input septic/soakaway worksheet exist. Septic sizing requires user-supplied locally approved flow/retention/soil criteria. Stormwater hydraulic sizing, percolation testing, groundwater/setback checks, septic treatment selection and authority approvals remain out of scope.
- **Temporary works:** form-contact/scaffold quantities are not scaffold, shoring, access, tie, wind or stability design. Engineering sign-off and safe-work documentation remain mandatory.
- **Insulation/demolition:** preliminary area/volume/product and debris quantities only; no thermal-code compliance, hazardous-material survey, disposal classification, or waste contractor confirmation.
- **Pricing:** no new calculator may imply live local supplier prices unless the price has verified source, location, date and provenance. Keep unverified prices unpriced or clearly marked.

### Phase 2 — Interactive Blueprint & PDF Plan Takeoff (browser MVP; integration/persistence open)

`/blueprint-takeoff` supports image/PDF display, page navigation, per-page known-length scale calibration, linear/area/count marks, category labels, CSV schedules, and a portable JSON takeoff project. Import restores mark data and calibration; users must re-open the matching source drawing to see the overlay. Compatible measured quantities can be prefilled into standalone worksheets with source, page, market, mark and unit provenance plus an explicit review notice. Data remains in browser memory and downloaded local files, not a cloud-saved project.

Remaining work: persistent drawings/markups with explicit privacy and retention controls; robust PDF page/unit/rotation testing; undo/edit/delete and keyboard/touch accessibility; saved schedules; overlay/print/PDF report; and documented device/file-size limits. Do not describe the MVP as CAD/BIM, automated dimension extraction, code-checking, or live quantity synchronization.

### Phase 3 — Safe operational readiness, one market/trade at a time

Before calling a calculator market-ready, record an authoritative source or supplier datasheet and effective date for each default, an accountable local reviewer, representative project benchmarks, unit/rounding tests, missing/stale/outage behavior, user-facing assumptions, and end-to-end release evidence. Do not silently substitute Nigerian values or infer local regulations. Keep every unverified market/capability explicitly preliminary.

### Phase 4 — Blueprint-to-estimate workflow

Only after the takeoff record format and units are validated, connect selected measured quantities to matching worksheets with user confirmation and full provenance. Preserve source drawing, page, scale calibration, mark, unit and any manual override. Never transform a measured quantity into a structural design or claim code compliance. Keep procurement integrations and market pricing separate and provenance-backed.

### Phase 5 — Classification, exports and broader workflows

Evaluate CSI MasterFormat, NRM2, SMM7 and CESMM4 mappings with qualified estimators and local licensing before generating classified BOQs. Extend to approved report exports, procurement and WBS only with verified inputs and clear review states. Avoid promising unsupported live suppliers, availability, lead times, or fulfillment.

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
