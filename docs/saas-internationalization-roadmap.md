<<<<<<< HEAD
# FRELUX Global Operations Engines Roadmap

**Status:** Proposed implementation backlog, not a claim of completed functionality  
**Last reviewed:** 2026-10-14  
**Scope:** The remaining global tax and currency, workforce credential verification, and project logistics engines identified in `handoff.md` and `TODO-AGENT-HANDOFF.md`.

This roadmap is for implementation in the existing FRELUX application. It preserves the current estimators and useful partial workflows. A schema, UI, status label, seed row, or provider integration is not proof of operational accuracy. Keep unsupported jurisdictions and integrations visibly unavailable or partial until the release gates below pass.

## Non-negotiable product and data rules

- Never infer tax, professional eligibility, insurance coverage, customs treatment, shipping lead times, or holiday calendars from a country name, neighboring jurisdiction, AI output, or stale/indicative catalog value.
- No silent Nigerian defaults. Missing jurisdiction or evidence must produce an explicit “not available / not verified” state, not a plausible-looking calculation.
- Keep display-only FX separate from a tax amount, invoice amount, payable amount, or settlement conversion. Show source, as-of time, rounding, and staleness wherever a rate is used.
- Preserve source identity, jurisdiction, effective dates, reviewer/provider, coverage and status for operational records. Do not overwrite or backdate evidence to make it appear current.
- Treat credentials, identity documents, insurance and worker records as sensitive. Enforce least-privilege access, secure storage, retention policy and audit history; public views expose only fields explicitly approved for public display.
- Never state or badge that a tax amount is due, a worker is licensed/compliant, or a shipment will arrive by a date unless the applicable evidence-backed gate below has passed.
- Keep regulated decisions advisory and route uncertain cases to a qualified local reviewer. Do not hold/release funds, make legal/tax determinations, or guarantee delivery in software alone.
- Build a polished, responsive experience consistent with FRELUX’s existing navigation, design tokens and components. Provide clear progress, empty, missing-evidence, stale, error and success states; keyboard and screen-reader access; mobile-first layouts; and useful explanatory copy without visual overclaiming.

## Phase 0 — Establish ownership, scope and safe states

1. Create an engine capability registry with explicit states such as `unavailable`, `partial`, `configured`, `verified_operational`, and `suspended`, including supported jurisdiction, evidence owner, last verification and release-blocking gaps.
2. Inventory existing implementations before changing them: quotation tax inputs/defaults, currency display FX, `pro_credentials`, supplier/marketplace order states, shipment/lead-time fields and project timeline assumptions.
3. Define shared provenance and audit-event types for source, effective date/time, jurisdiction/coverage, reviewer/provider, decision/status, reason, and superseding evidence. Preserve existing records through additive migrations and explicit backfills; do not repurpose old `verified` statuses as new proof.
4. Add feature gates so a jurisdiction/provider can be enabled only after its own automated and operational acceptance checks. Unsupported paths must fail closed with helpful user-facing guidance.

**Exit criteria:** documented data classification, threat/privacy review, migration and rollback plan, status semantics, owner for each integration, and tests proving no fallback to NGN, a generic 7.5% tax rate, or unsupported “verified” claims.

## Phase 1 — Jurisdiction-aware tax and transaction currency

### Product and rules data

- Replace tax assumptions attached only to quotation settings with versioned tax-jurisdiction rules keyed by project/site location, jurisdiction level, tax category and effective period.
- Rules require named authoritative source, applicable territory, publication/effective dates, inclusive/exclusive basis, taxable base definition, rounding method, exemptions/unknown handling, reviewer and next review date. Support chained or compound taxes only where a reviewed rule explicitly requires them.
- Model the project’s actual site jurisdiction separately from the user’s profile, business address, market display preference and supplier location. Ask for only the location granularity needed by an enabled rule; protect it as personal/project data.
- Define rate resolution as a deterministic, explainable result containing the jurisdiction, rule/version, source, effective date, calculation base, components, rounding, exclusions and unresolved questions. If no exact active rule applies, return `not_determined`; never substitute a default percentage.

### Quote and payment UX

- Audit all quote paths, including `generateQuotation` in `src/lib/contractor.ts`, quotation settings/admin screens, estimate/BOQ exports and `src/lib/measurement/quotation-engine.ts`.
- Remove automatic application of the current 7.5% fallback where no explicitly configured and applicable rule exists. Preserve a user-entered estimate only as an explicitly labeled, non-verified manual assumption with author and timestamp; it must not be presented as tax due or be silently reused across jurisdictions.
- In the quote preview, show pre-tax amount, each supported tax component, source/effective date and final estimate. When unresolved, show “Tax not determined for this project location” and allow a clearly marked pre-tax estimate; do not display a computed tax amount.
- Use the active market’s locale/currency formatting and correct minor-unit rules for presentation. Keep display FX informational and label it as such.
- Only enable settlement/checkout currency conversion once a payment provider, fee model, reconciliation path, exchange-rate source and legally required review are configured. Distinguish quote currency, charge currency, settlement currency, actual applied rate, timestamp, fees and final provider receipt.

### Tax tests and release checks

- Unit tests for effective-date boundaries, no-rule and ambiguous-jurisdiction behavior, inclusive/exclusive calculation, taxable-base inclusions, component rounding and unsupported tax categories.
- Integration tests showing all quote surfaces use the same resolved tax object and preserve manual assumptions distinctly.
- Regression tests prove absent rules never apply 7.5% or another market’s tax, and display FX never changes the payable/quoted amount.
- Validate jurisdiction fixtures against an accountable local tax reviewer before activation. No country tax seed values without provenance and approval.

## Phase 2 — Auditable workforce credential verification

### Credential model and security

- Extend the existing `pro_credentials` workflow with jurisdiction/country and subnational scope; issuer/authority and registry identifier; credential class/scope; standing; issued/expiry dates; evidence type/source; verification method, result, timestamp and reviewer/provider; and separate insurance/safety-training evidence where relevant.
- Add an append-only review/event history for submissions, requested corrections, verification attempts, decisions, expiry, suspension, revocation and appeals. Store private documents in access-controlled storage, not in publicly readable views.
- Design RLS and storage policies for worker, authorized reviewer/admin and public-directory access. Public surfaces must not expose registration identifiers, identity documents, contact details or reviewer notes unless the user explicitly authorized the exact field and applicable policy permits it.
- Add jurisdiction-specific verification-source configuration with permitted lookup type, registry URL/API or manual review procedure, allowed credential types, freshness expectations and escalation/contact owner. A URL field or manually toggled boolean alone does not verify a credential.

### Workflow and UI

- Define precise statuses (for example submitted, pending_review, verified_by_source, verified_by_reviewer, expired, suspended, revoked, rejected, unable_to_verify) with clear meanings and transitions. Preserve any legacy status in a safe migration; do not silently promote legacy `verified` records to verified-by-authority.
- Build a guided worker submission flow for jurisdiction, credential type, issuer, registration reference and expiry, with consent, privacy notice, validation, upload safeguards and saved progress.
- Build an accessible reviewer console with source/evidence preview under authorization, comparison fields, decision reason, audit history, expiry queues and escalation. Require reviewer identity and reason for manual decisions.
- Public Pro Connect cards show only jurisdiction-scoped status and last-checked date; they must distinguish “document reviewed” from “registry verified” and must not show an unqualified global “compliant” badge.
- Add reminders and status refresh/review queues only where a valid source, consent and operational owner exist. Failed/unavailable registry lookups remain pending/unverified, not verified.

### Credential tests and release checks

- RLS tests across worker, reviewer/admin and anonymous users; storage access tests; redaction tests; unauthorized update and privilege-escalation tests.
- State-transition and audit immutability tests, including expiry, revoked/suspended status, conflicting sources and unavailable/changed registries.
- Verify every enabled jurisdiction against its issuing authority or a documented, accountable human-review procedure. Obtain privacy/legal review and retention/deletion requirements before enabling uploads.

## Phase 3 — Evidence-backed site calendars and procurement logistics

### Data foundation and integrations

- Separate planning heuristics from sourced operational events. Add versioned calendar data keyed by country and required subnational region with timezone, local workweek, official holidays/non-working dates, source, effective year, last refresh and completeness status.
- Require explicit project site location and timezone before applying a local calendar. Missing calendar coverage must be disclosed and must not be substituted with a neighbor’s calendar.
- Inventory existing marketplace, supplier, purchase and order states. Define auditable states for listed, quote_requested, quoted, approved, purchase_ordered, dispatched, in_transit, customs_hold, delivered, partial_delivery, exception and cancelled. Record actor, source, timestamp, line items, quantities/units, supplier and destination at each transition.
- Add procurement comparison only for comparable material specification, package/unit, currency, tax basis, stock/availability source, quote validity and delivery destination. Show source age and separate merchandise, tax, freight, customs and estimated delivery costs; unknown components remain unknown.
- Before adding provider code, identify an authorized carrier/procurement/calendar data provider and confirm API terms, credential storage, supported geographies, quotas, coverage and operational owner. Build server-side adapters and mock/test fixtures; never fabricate live-looking shipment events or customs clearance.
- Represent lead times as sourced estimates with ranges, confidence/coverage and as-of timestamps. Customs/tariff classification must come from an approved authoritative source or qualified user/reviewer input; software must not infer clearance outcome.

### Planning and UI

- Update the project timeline to calculate dates from estimated work durations plus the selected site’s verified calendar; retain uncertainty ranges and disclose excluded weather, logistics, permits and other blockers.
- Add an optional delivery-to-site plan linking material needs to supplier quotes/orders and milestones. Distinguish requested dates, supplier-confirmed dates, carrier estimates and actual delivery; reconcile delays/partial deliveries to project schedule with visible provenance.
- Give project teams a premium, responsive logistics board with filters by project, supplier, delivery status and exception; timeline/calendar view; source and last-updated labels; clear no-provider/no-data states; and a mobile-friendly field update flow.
- Keep existing heuristic-only duration estimates available as planning estimates where appropriate, labeled as heuristics, until source data is contracted, validated and deployed.

### Logistics tests and release checks

- Calendar tests for timezone boundaries, leap years, weekends, local holidays, missing/stale calendars and date-range end behavior.
- Provider adapter contract tests for duplicate/out-of-order events, retries, rate limits, provider outage, stale status, partial delivery and reconciliation. Test secrets never reach client bundles/logs.
- End-to-end tests for role-authorized quote/PO approval, dispatch/delivery updates, exception resolution and date recalculation with an audit trail.
- Activate integrations only for documented provider/geography coverage; establish freshness monitoring, incident owner, retry limits, rollback and user-facing outage status.

## Phase 4 — Cross-engine UI/UX integration

- Present a consistent project-level operations summary: Tax status; Workforce credential status; Procurement/shipment status; and schedule impact. Each item links to its evidence and action, with no green “complete” state for missing data.
- Align tax detail and quote state, credential badges and review history, and procurement states with the existing FRELUX visual system and navigation. Avoid adding disconnected admin-only pages without a user path.
- Meet WCAG 2.1 AA targets: semantic labels, keyboard operation, focus visibility, contrast, screen-reader status announcements, responsive reflow, accessible error summaries and reduced-motion behavior.
- Add comprehensive loading, empty, unavailable, stale, permission-denied, provider-error, pending-review and success states. Explain what is and is not verified in plain language.
- Do not add country-specific placeholder rates, credentials, calendar events or logistics samples to production fixtures. Demonstrations must be clearly labeled test data.

## Phase 5 — Verification, rollout and operation

1. Start with implementation infrastructure and tests, then one explicitly selected pilot jurisdiction per engine only after primary sources, an accountable local reviewer and provider access are available. The pilot selection remains open; do not choose a country or fabricate source data on another agent’s behalf.
2. Keep each engine/jurisdiction behind a server-side feature gate. Expand one market at a time; do not activate every represented market from generic locale profiles.
3. Run clean migration replay and schema checks, RLS/security review, unit and integration tests, `npm run typecheck`, focused suites, full `npm test`, production `npm run build`, and `git diff --check`.
4. Verify live database migration application and representative readback separately from repository tests. Do not claim deployed coverage from migration files or seeds alone.
5. Complete local expert/user acceptance, accessibility and privacy review, provider failure drills, monitoring dashboards, support runbooks and rollback procedure.
6. Update `handoff.md` and `TODO-AGENT-HANDOFF.md` after each completed slice with exact sources, jurisdiction coverage, evidence freshness, deployed state, tests, blockers and commit. Keep all unverified functionality explicitly partial.

## Definition of done

The tax engine, credential verification engine and logistics engine are individually releasable only when their relevant phase acceptance checks pass for a named jurisdiction/provider and are verified in the deployed environment. “All markets operational” requires those gates separately for every enabled market. Until then, retain the existing helpful estimator and manual-review behavior with prominent partial/unverified labels; do not make legal, tax, credential or delivery guarantees.
=======
# Frelux Internationalization Roadmap — "International Standard" Upgrade

Last updated: 2026-10-14
Status: APPROVED DRAFT (execution started)

---

## HARD CONSTRAINT (applies to every item below)

**Everything ships internationalized.** No feature lands for a single market.

1. All 20 live markets (NG US GB CA AU DE IN GH KE ZA JP FR BR SA AE CN ID MX KR IT)
   are supported on day one of each release: currency, units, price books,
   methodology and locale flow from the existing market context
   (`market-context`, `pricing-resolver`, `measurement-bridge`).
2. Dual measurement systems (metric / imperial / mixed) work in every new input,
   output and document. No hard-coded m², bags, or ₦ anywhere.
3. No silent NG fallbacks. Missing-market behavior must be disclosed in the UI,
   never substituted with Nigerian defaults (existing fellBackToNg pattern).
4. All public routes remain prerendered, permanent-URL, SEO/crawl-friendly.
   Core Web Vitals preserved; calculations stay interactive JS.
5. Never break: existing calculators, database connections, auth, Supabase.
6. No invented testimonials, user counts, or claims.

---

## Code Audit Summary (2026-10-14)

Already built — do NOT rebuild:
- Workspace layer: ContractorProjects / ProjectWorkspace / ProjectDashboard + data
  model (rooms, labour plans, shopping items w/ is_purchased, e-signed quotations,
  timelines, attachments, markup/profit totals, project currency).
- BOQ engine (traceable line items), BoqGenerator, branded quote/invoice export
  (quote-export.ts), ClientEstimateEditor/View.
- Price intelligence: price_scan_runs, price-intel-scan/price-digest edge
  functions, pg_cron price-intel-weekly, 20-market manual price books.
- Dual units: measurement-bridge (normalize/denormalize), MeasurementSystem,
  calculation-audit. GPS: location-intelligence (browser geolocation first).
- Pro Connect: directory, profiles, 4-tier verification (OTP/NIN/identity/Pro),
  ratings + verified project reviews, moderated messages.
- Payments: Paystack/Flutterwave/Stripe checkout+webhooks, subscriptions, credits.

---

## WAVE 1 — Close the estimation loop (core product, monetizable, no new infra)

### 1.1 Estimate vs. Actual expense tracking  ← IN PROGRESS
- New `project_expenses` entity (user-scoped, RLS): amount, currency (project
  currency default, never assumed NGN), category (material/labour/transport/
  misc to mirror project totals), spent_at date, optional link to shopping item,
  notes, market code inherited from project location.
- Variance engine (pure, testable): estimated vs actual per category and total,
  in the project's own currency; no unit assumptions inside the math.
- UI: expenses tab in contractor ProjectDashboard — add/edit/delete expense,
  variance table (estimated | actual | Δ | % of budget), budget-burn bar.
- Internationalization: currency symbol from project record; date format per
  market locale; category labels localized where i18n exists.

### 1.2 Editable Digital BOQ (bank-submittable tier)
- In-app editing of BOQ lines (client-collaborative via existing
  ClientEstimateEditor pattern), revision history + version stamping.
- "Bank BOQ" export template: formal Bill of Quantities layout acceptable to
  commercial banks for construction-loan applications (company block, project
  block, grand summary, unit rates, terms page), paid-tier gated.
- Localized: currency + measurement-system columns per market, bilingual labels
  where required (FR/DE markets), VAT/tax naming per market (VAT/MwSt/GST/IVA).

### 1.3 Click-to-Invoice
- New `invoices` entity: sequential numbering, issued/paid/overdue status,
  payment recording, client block; one-click estimate/quotation → invoice.
- Rendering reuses quote-export (already invoice-styled, branded, printable).
- Internationalization: invoice currency = project currency; tax line per
  market's scheme; numbering format configurable per market.

---

## WAVE 2 — Data architecture to international standard

### 2.1 Imperial completeness sweep
- Verify metric/imperial input fidelity across all 54 engines; harden
  calculation-audit with per-engine dual-unit tests (US/GB/CA/AU native imperial).
- Metric-to-imperial material-packaging display (cubic yards, board feet,
  square feet, gallons) per market defaults.

### 2.2 Supplier price connectors + GPS-aware refresh
- Extend price-intel pipeline with direct supplier API adapters where public
  APIs exist (Home Depot, Jumia/Konga, Screwfix/B&Q…); most of our 20 markets
  have NO public supplier APIs — the verified scan pipeline stays primary.
  Connectors enhance; they do not replace.
- Wire browser GPS → market auto-resolution on estimator entry (opt-in),
  surface price freshness (scan date + confidence) in estimator UI.

---

## WAVE 3 — Pro Connect trust engine

### 3.1 Vetting & insurance tracking
- Trade-license + liability-insurance fields on pro profiles, expiry monitoring,
  badges; extends existing 4-tier verification.

### 3.2 Booking system
- Booking entity + job lifecycle + calendar availability. Ratings/reviews exist;
  this completes the closed-loop trust system.

### 3.3 Milestone payments → escrow
- v1: milestone-verified payment links on top of existing checkout functions
  (Paystack/Flutterwave/Stripe). True fund-holding escrow is regulatory-dependent
  (NG requires licensed wallet partner) — design now, execute when partnered.

---

## Ordering rationale

Wave 1 makes the core product defensible and monetizable without new
infrastructure. Wave 2 hardens the "international standard" data claims.
Wave 3 builds marketplace trust on a proven product. Each wave ships
independently; every item lands 20-market ready.
>>>>>>> 6a5d50dd (feat(contractor): Wave 1.1 expense tracking + full i18n currency compliance)
