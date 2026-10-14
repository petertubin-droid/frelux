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
