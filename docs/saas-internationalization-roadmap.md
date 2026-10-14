# Frelux Internationalization Roadmap — "International Standard" Upgrade

Last updated: 2026-10-14 (Wave 1.1 shipped; see status notes)
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

### 1.1 Estimate vs. Actual expense tracking  ✅ COMPLETE (commit 87316478, migration 20261015390000 applied live)
- `project_expenses` table LIVE (RLS enabled, owner-scoped ALL policy): amount,
  currency (per-row, always the project's own), category, spent_at, optional
  shopping_item_id/room_id links, notes, sort_order.
- `budget-variance-engine.ts` (pure) + 9 unit tests: estimated vs actual per
  category and total; math is currency-agnostic.
- ExpensesTab in ProjectDashboard: add/edit/delete, variance table
  (estimated | actual | Δ | % of budget), budget-burn bar — all amounts via
  `formatByCode(project.currency)`; 6 i18n tests lock this.
- Bonus i18n purge shipped with it: 24 en-NG `toLocaleString` calls in
  ProjectDashboard, ContractorProjects card, printQuote/WhatsApp exports, and
  `formatByCode` blank-code fallback (now ISO "XXX", never NGN).
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

### 1.2 Editable Digital BOQ (bank-submittable tier)  ← IN PROGRESS
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
