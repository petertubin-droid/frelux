# Whole-site correctness and completeness audit

Generated 2026-11-12 from the source tree: 1450 modules, 324 page files, 369 declared routes. Every finding below was checked against the code, not inferred from a heuristic. Re-run with `node scripts/audit-website.mjs`.

## Blocking correctness

- No broken internal links: every `to` / `href` resolves to a registered route family.
- Every dynamic import resolves to a file on disk.
- No duplicate route paths.
- Catch-all 404 route: present

## Mobile layout

- Table with no `overflow-x-auto` wrapper: src/pages/admin/AdminCodeRegistry.tsx
- Table with no `overflow-x-auto` wrapper: src/pages/admin/AdminColors.tsx
- Table with no `overflow-x-auto` wrapper: src/pages/admin/AdminPriceIndex.tsx
- Table with no `overflow-x-auto` wrapper: src/pages/procurement/ProcurementRequestDetail.tsx

## Accessibility

- Clickable `<div>` with no button/link role (keyboard users cannot reach it): src/pages/MaterialPriceTracker.tsx
- Clickable `<div>` with no button/link role (keyboard users cannot reach it): src/pages/Printables.tsx
- Clickable `<div>` with no button/link role (keyboard users cannot reach it): src/pages/ProjectWorkspace.tsx
- Clickable `<div>` with no button/link role (keyboard users cannot reach it): src/pages/WallFinishEstimator.tsx
- Clickable `<div>` with no button/link role (keyboard users cannot reach it): src/pages/admin/AdminMarketIntelligence.tsx
- Clickable `<div>` with no button/link role (keyboard users cannot reach it): src/pages/admin/AdminMarkets.tsx
- Clickable `<div>` with no button/link role (keyboard users cannot reach it): src/pages/admin/AdminMaterialPrices.tsx
- Clickable `<div>` with no button/link role (keyboard users cannot reach it): src/pages/pro-connect/ProConnectProfile.tsx
- Clickable `<div>` with no button/link role (keyboard users cannot reach it): src/pages/worker-channels/WorkerChannels.tsx
- Icon-only button without `aria-label`: src/pages/ProjectSettings.tsx
- More than one `<h1>`: src/pages/Login.tsx
- More than one `<h1>`: src/pages/PropertiesDashboard.tsx
- More than one `<h1>`: src/pages/QuoteShare.tsx
- More than one `<h1>`: src/pages/TemplateDetail.tsx
- More than one `<h1>`: src/pages/pro-connect/ProConnectDashboard.tsx
- More than one `<h1>`: src/pages/suppliers/SupplierWorkspace.tsx
- More than one `<h1>`: src/pages/worker-channels/WorkerChannels.tsx

## Consistency

- Internal route opened with a plain `<a href>`, causing a full page reload instead of client navigation: src/pages/ConfigurableFinishCalculator.tsx
- Internal route opened with a plain `<a href>`, causing a full page reload instead of client navigation: src/pages/FoundationCalculator.tsx
- Internal route opened with a plain `<a href>`, causing a full page reload instead of client navigation: src/pages/admin/AdminCaseStudies.tsx
- Internal route opened with a plain `<a href>`, causing a full page reload instead of client navigation: src/pages/marketplace/MarketplaceCategoryPage.tsx
- Hard-coded currency symbol outside the admin console: src/pages/DiasporaBudgetTracker.tsx
- Hard-coded currency symbol outside the admin console: src/pages/ProjectDetail.tsx
- Hard-coded currency symbol outside the admin console: src/pages/market-intelligence/InvestorCentre.tsx
- Hard-coded currency symbol outside the admin console: src/pages/marketplace/ListingDetail.tsx
- Hard-coded currency symbol outside the admin console: src/pages/marketplace/MarketplaceSeedingHub.tsx
- Hard-coded currency symbol outside the admin console: src/pages/marketplace/ProductDetail.tsx
- Hard-coded currency symbol outside the admin console: src/pages/worker-channels/WorkerChannels.tsx

## Dead code

- Page file that nothing imports: src/pages/Calculators.tsx
- Page file that nothing imports: src/pages/admin/NetworkHub.tsx

## Already covered elsewhere

- Calculator UI: `scripts/audit-calculator-ui.mjs` reports 0 gaps across 48 calculators (header, ad slots, share/PDF, method note, disclaimer, input labels, fixed widths).
- Worker safety, escrow and Pro Connect rules are covered by their own suites and `docs/worker-safety-verification.md`.
