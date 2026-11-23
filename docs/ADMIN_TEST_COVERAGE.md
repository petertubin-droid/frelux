# Admin test coverage audit

Audited 2026-11-23. Companion to `ADMIN_ACCESS_AUDIT.md`, which covers who may
reach these screens; this covers whether anything proves they work.

## What was checked

1. **Files without a test.** All 114 admin pages and 17 admin components.
   Result: one page (`AdminBlockchain`) and two components (`AdminEngineMatrix`,
   `SevenCountryCoverage`) had no test file. All three now do.
2. **Routes.** Every admin page is imported and mounted from `src/App.tsx` under
   the single nested `/admin` tree. No orphans, no admin page reachable outside
   `RequireAdmin`.
3. **Whether existing tests assert anything.** This is where the real gap is.

## Finding: 43 of 115 admin page tests are smoke-only

A smoke-only test renders the page and checks that some text appeared. It never
clicks anything, never asserts that a service was called with the right
arguments, and never checks a failure path. Such a test passes when the button
calls the wrong function, when a delete fires on the wrong row, or when an error
is silently swallowed. `AdminBlockchain` proved this pattern is not theoretical:
it was the only page with no test at all, and reading it for a test exposed a
live defect where every NOWPayments invoice was verified by the BTCPay
verifier.

The worst case is `AdminEngineConfig.test.tsx`, which asserts only that the
module exports something:

```ts
it("module exports something", async () => {
  const mod = await import("@/pages/admin/AdminEngineConfig");
  expect(Object.keys(mod).length).toBeGreaterThan(0);
});
```

That test passes if the page renders a blank div.

### Correction (23 November 2026): the first pass undercounted

Re-running the classification above over the same commit (`c50b6ffd`) finds
**82** smoke-only suites, not 43. The inventory below lists the 43 the first
pass caught; these 39 were missed and are smoke-only by the same definition
(no interaction, no mock-call assertion, no negative assertion):

`AdminAiMonetization`, `AdminAnalytics`, `AdminColors`, `AdminContactMessages`,
`AdminErrors`, `AdminEstimationAudit`, `AdminEstimationConfig`,
`AdminEstimationPricing`, `AdminEstimationProduction`, `AdminGallery`,
`AdminImageEstimation`, `AdminLabourSettings`, `AdminLearn`, `AdminLegal`,
`AdminLogin`, `AdminMarketIntelligence`, `AdminMarketplace`,
`AdminMaterialCatalog`, `AdminMedia`, `AdminOverview`, `AdminPaintComparison`,
`AdminPaintEngineTest`, `AdminPaintTypes`, `AdminPdfBranding`, `AdminPriceScan`,
`AdminPriceUpdater`, `AdminPricing`, `AdminProConnect`, `AdminProjectStages`,
`AdminQuotationSettings`, `AdminRewardedAccess`, `AdminRewards`,
`AdminSeoLocation`, `AdminSettings`, `AdminTemplates`, `AdminTileMaterials`,
`AdminTimelineTemplates`, `AdminTypography`, `AdminTyroleneConfig`.

So the corrected arithmetic is 82 smoke-only at audit time, 30 upgraded since,
and **52 remaining**: the 13 inventoried suites below plus these 39. Every
number in the tranche records stands; only the starting total and the
remaining total were wrong.

## The inventory

Tier 1 is money and destructive actions, where a wrong argument costs a user or
the business real amounts. Tier 2 is engine wiring, where a wrong setting
silently changes calculated output. Tier 3 is content CRUD.

| file                          | tests | assertions | tier     |
| ----------------------------- | ----- | ---------- | -------- |
| `AdminBoqTemplates`           | 4     | 8          | 1 money  |
| `AdminCashFlowTemplates`      | 4     | 9          | 1 money  |
| `AdminCreditProfiles`         | 6     | 14         | 1 money  |
| `AdminEstimationEstimates`    | 1     | 2          | 1 money  |
| `AdminExpenseLedger`          | 2     | 6          | 1 money  |
| `AdminFinance`                | 2     | 4          | 1 money  |
| `AdminMarginPresets`          | 1     | 3          | 1 money  |
| `AdminMarketPrices`           | 1     | 1          | 1 money  |
| `AdminSupplierLedger`         | 5     | 11         | 1 money  |
| `AdminAiSettings`             | 6     | 12         | 2 engine |
| `AdminEngineConfig`           | 5     | 10         | 2 engine |
| `AdminEngineStudio`           | 5     | 12         | 2 engine |
| `AdminIntelligenceSources`    | 10    | 22         | 2 engine |
| `AdManager`                   | 2     | 3          | 3 CRUD   |
| `AdminAIAssistant`            | 1     | 2          | 3 CRUD   |
| `AdminCaseStudies`            | 2     | 2          | 3 CRUD   |
| `AdminConstructionDictionary` | 1     | 3          | 3 CRUD   |
| `AdminCountVision`            | 6     | 16         | 3 CRUD   |
| `AdminCurrencySettings`       | 3     | 7          | 3 CRUD   |
| `AdminFeedback`               | 1     | 3          | 3 CRUD   |
| `AdminFieldSync`              | 5     | 13         | 3 CRUD   |
| `AdminIntegrations`           | 1     | 2          | 3 CRUD   |
| `AdminIntelligence`           | 2     | 3          | 3 CRUD   |
| `AdminLearningReview`         | 1     | 3          | 3 CRUD   |
| `AdminListedMarkets`          | 7     | 16         | 3 CRUD   |
| `AdminMaintenanceProfiles`    | 5     | 14         | 3 CRUD   |
| `AdminPriceIndex`             | 9     | 20         | 3 CRUD   |
| `AdminPriceSubmissions`       | 6     | 15         | 3 CRUD   |
| `AdminRegionalCostIndices`    | 6     | 16         | 3 CRUD   |
| `AdminReuseFactors`           | 5     | 15         | 3 CRUD   |
| `AdminSiteIntelligence`       | 2     | 3          | 3 CRUD   |
| `AdminSocialBrandCenter`      | 1     | 3          | 3 CRUD   |
| `AdminSolarPanels`            | 5     | 15         | 3 CRUD   |
| `AdminSolarPrices`            | 6     | 16         | 3 CRUD   |
| `AdminSuppliers`              | 2     | 2          | 3 CRUD   |
| `AdminTestimonials`           | 2     | 4          | 3 CRUD   |
| `AdminThermalFactors`         | 5     | 15         | 3 CRUD   |
| `AdminTranslations`           | 2     | 4          | 3 CRUD   |
| `AdminTravelApprovals`        | 6     | 14         | 3 CRUD   |
| `AdminWallFinishingLibrary`   | 2     | 2          | 3 CRUD   |
| `AdminWebVitals`              | 2     | 3          | 3 CRUD   |
| `SeoPerformance`              | 2     | 2          | 3 CRUD   |
| `SystemHealth`                | 1     | 2          | 3 CRUD   |

## Tranche plan

Each tranche is one commit, same rule as everywhere else: test first, and if
reading the page to write the test exposes a defect, fix it in the same commit
with the test that proves it.

- **Tranche 1** (money): `AdminMarketPrices`, `AdminFinance`,
  `AdminExpenseLedger`, `AdminEstimationEstimates`, `AdminMarginPresets`.
  Every one must assert the payload written to the database, not that a table
  rendered.
- **Tranche 2** (engines): `AdminEngineConfig` first, since its current test is
  a placeholder and it writes engine settings that change calculated output.
- **Tranche 3** (content CRUD): the remainder, cheapest last.

## Tranche 1 progress (23 November 2026)

Three of the five money pages now assert behaviour instead of rendering.

| file                       | before                             | after                                                                                                                                                                                                                                                                                                                                                          |
| -------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AdminMarginPresets`       | 1 test, "module exports something" | 9 tests: exact create payload (trimmed name, numeric margin, null description, numeric sort order), zero margin refused without a database call, margin-on-price at 100 refused, edit updates the opened row id rather than creating, delete only after the confirmation is accepted, load error surfaced, rejected save surfaced instead of a success message |
| `AdminMarketPrices`        | 1 test, 1 assertion                | 6 tests: quotation written with the market's own currency (NGN for NG, not a hardcoded default), supplier name and location kept when given and null when blank, zero price refused without an insert, rejected insert surfaced, scan invoked with `{trigger: "admin", force: true, market}`, scan failure reported                                            |
| `AdminEstimationEstimates` | 1 test, "module exports something" | 5 tests: rows listed, calculator filter applied in the query, status filter applied alongside it, line items fetched for the opened estimate with the right `estimate_id`, and not refetched when the row is reopened                                                                                                                                          |

Defects found by writing these:

1. **`AdminMarginPresets` row toggles had unusable accessible names.** Both passed
   `srLabel="{`Default: ${p.name}`}"` as a literal string, so a screen reader
   announced backticks and `${}` instead of the preset name. Now interpolated,
   with a test asserting the accessible name.
2. **`AdminEstimationEstimates` crashes on a record without `labour_status`.**
   The row calls `est.labour_status.replace(...)` with no guard, so one row
   missing that column takes the whole page down rather than that row. _Fixed
   with this tranche_: a missing column now reads "not stated" rather than
   asserting a labour basis, and a test renders a record without the column.

### Tranche 1 closed (23 November 2026)

`AdminFinance` now has 7 tests, up from 2. The dispute paths are the point: a
refund invokes `escrow-release` with the contract id and records
`refund_amount_minor` in minor units (250,000 NGN is 25,000,000, not 250,000),
the write is guarded by `status = 'open'` so two admins cannot both refund, an
order that was never escrowed is refused without calling the function at all,
dismissing returns the order to `client_review`, a missing summary function is
named as such rather than shown as a generic failure, and a dispute load failure
leaves the money totals standing.

`AdminExpenseLedger` gained two tests: the select asks for exactly seven columns
rather than `select("*")`, which would ship free-text notes into a screen that
only shows totals, and Refresh re-reads the ledger.

Tranche 1 is complete.

### Tranche 2 started (23 November 2026)

`AdminEngineConfig` had the placeholder test that asserted only that the module
exports something. It now has five tests over the settings tab, which is the tab
that changes calculated output:

- a numeric setting is saved as a number, not the typed string, so `7.5` reaches
  the engine as `7.5` rather than `"7.5"`
- a plain text setting stays text
- a boolean setting is saved as a boolean
- a rejected save raises "Failed to save" instead of closing silently
- only settings marked editable offer an edit control

Defect found: every row's edit and save buttons were labelled "Edit setting" and
"Save setting", so a screen reader heard the same two names on every row with no
way to tell which setting was about to change. They now name their key, and the
tests assert the specific name.

`AdminAiSettings` also had a placeholder test. It now has six, pinning the save
payload: the update carries exactly the eighteen AI and estimation columns and
nothing else, so a column owned by another admin screen (site name, AdSense
client, welcome email) cannot be overwritten by a save from this page. The
update targets the row it loaded rather than the first row in the table, the
loaded values survive the round trip, a rejected save reports the database error
instead of claiming success, and a read failure is shown rather than swallowed.

### Tranche 2 closed (23 November 2026)

`AdminEngineStudio` and `AdminIntelligenceSources` complete Tranche 2:

- `AdminEngineStudio` (5 tests): verifies runner dispatch via `executeEngine`,
  numeric conversion of form inputs (string length/height parsed to numbers
  before execution), JSON payload mode for complex parameter inputs, and distinct
  result vs error/refusal rendering.
- `AdminIntelligenceSources` (10 tests): covers required name and URL validation,
  allowed URL prefix line normalisation, source enable/disable toggles,
  on-demand test crawl dispatch, crawl button disabled when source is inactive,
  source deletion, and live query search via `searchWeb`.

Tranche 2 is complete.

### Tier 1 Money conformance complete (23 November 2026)

All 9 Tier 1 money pages are now fully conformance-tested:

- `AdminBoqTemplates` (4 tests): verifies template listing, template create
  payload, section create payload, and automatic sort order calculation.
- `AdminCashFlowTemplates` (4 tests): verifies exact sum-to-100% milestone
  validation (refuses saving invalid distributions), positive percentage and
  offset type conversions, deletion confirmation, and accessible switch names.
  _Defect found and fixed_: `srLabel` on row toggles was passed as a literal
  string `"{`Default: ${t.name}`}"` rather than interpolated expression.
- `AdminCreditProfiles` (6 tests): verifies contractor credit profile listing,
  validation rule that on-time jobs cannot exceed verified jobs, required
  verification reference enforcement, create/update payloads, deletion
  confirmation, and safe error presentation.
- `AdminSupplierLedger` (5 tests): pins the query to exactly the eight allowed
  columns on `supplier_bills`, ensures separate currency cards are rendered
  without cross-currency mixing, verifies manual refresh, ensures read failures
  conceal balances rather than showing partial figures, and checks empty state.

### Tier 3 Content & Operations tranche complete (23 November 2026)

Seven Tier 3 admin operational and content suites upgraded from smoke tests to comprehensive behavioral conformance suites:

- `AdminCurrencySettings` (6 tests): pins query to `site_settings.display_currencies`, verifies inverse-rate recalculation and saved numeric currency configuration, ensures scoped updates by row id, and asserts error presentation on load/save failures.
- `AdminConstructionDictionary` (5 tests): verifies terminology listing and category/status/confidence metrics, approves terminology with `{ action: "approve", verified_by: "admin" }`, rejects and flags for review, loads version history entries, and verifies error handling on query failures.
- `AdminFeedback` (4 tests): verifies feedback listings with contact emails and origin URLs, updates feedback status via dropdown to `feedback_suggestions`, tests status filter switching, and verifies empty and error state rendering.
- `AdminTestimonials` (5 tests): verifies testimonial listing and guidance notes, enforces minimum 10-character quote and author name validation before database writes, verifies creation payloads with trimmed strings and nullable fields, tests active/inactive toggle, and verifies deletion confirmation protection.
- `AdminSuppliers` (6 tests): verifies overview stats and queue listings, routes verification approvals and rejections through `supplier-ops` edge function, tests listing moderation actions, resolves marketplace complaints and dispute reports, and asserts safe presentation of edge function errors.
- `AdminTranslations` (6 tests): verifies localization console and status metrics, generates machine drafts via `translate-content` edge function with user session bearer tokens, publishes localized pages with recorded reviewer id, tests rejection workflow, and tests active draft review with inline editing and saving.
- `AdminCaseStudies` (6 tests): loads approved gallery entries and existing case studies, tests publish/unpublish toggling via `setCaseStudyPublished`, verifies deletion protection with confirmation dialog, verifies modal editing and upsert payload with clean numeric budgets and currencies, and checks empty and error state handling.

### Tier 3 Material, Cost Index & Operations tranche complete (23 November 2026)

Ten Tier 3 admin pricing, cost index, environmental factors, and operational suites upgraded from smoke tests to comprehensive behavioral conformance suites:

- `AdminPriceSubmissions` (6 tests): tests status filtering (pending/approved/rejected/flagged), review RPC invocation with approved status and verified notes, modal rejection workflow with mandatory reasoning, price flag review, and error state presentation.
- `AdminTravelApprovals` (6 tests): verifies pending orders listing with client names and travel fees, pro verification badges, approval and revocation RPC payload generation, safety risk warning modal, empty states, and RPC failure handling.
- `AdminListedMarkets` (7 tests): enforces non-admin access gating, displays provider and company news lists with sentiment and market categories, updates provider sync frequency in milliseconds, toggles active state on companies and news, and tests investor access grant workflow.
- `AdminPriceIndex` (9 tests): verifies submissions, active cities and market prices loading, approval and rejection actions with note prompts, city active status toggling, cross-currency market comparison statistics, CSV export payload, and error handling.
- `AdminRegionalCostIndices` (6 tests): lists regional cost factors by country and state, enforces positive numeric factor and source reference validation, validates single active factor per country/state/category, verifies creation payload, tests activation toggle, and verifies deletion confirmation.
- `AdminReuseFactors` (5 tests): renders material reuse factor catalogue, validates recovery and reuse/recycle fraction bounds (0–1, reuse + recycle <= 1), verifies required source references, tests factor creation payload, verifies edit modal workflow and updates, and confirms deletion.
- `AdminThermalFactors` (5 tests): renders thermal finish factor library with solar reflectance (albedo) values, validates albedo range [0, 1] and source citations, verifies factor creation payload with surface types (roof/wall), tests edit modal and updates, and verifies deletion.
- `AdminMaintenanceProfiles` (5 tests): verifies finish maintenance schedules with service lives and cost factors, enforces service life ranges (min <= max) and maintenance interval constraints within service life, tests profile creation payload, tests profile updates, and verifies deletion.
- `AdminSolarPanels` (5 tests): displays solar panel models with watt peak, physical dimensions, and datasheet citations, validates positive dimensions and watt peak, handles unpriced panels honestly as N/A, tests model creation and edit updates, and verifies deletion.
- `AdminSolarPrices` (6 tests): lists component prices with currency formatting and supplier references, validates recognised component keys against engine constants, enforces positive prices and units, tests price creation and edit modal updates, and verifies deletion.

Defects found and fixed during this tranche:

1. **`AdminPriceIndex` city toggle button label was inverted**: inactive cities displayed "Disable" instead of "Enable", misleading admins on city availability. Now accurately displays "Enable" when inactive and "Disable" when active.
2. **`AdminReuseFactors` modal title bug**: modal title was hardcoded as "Edit thermal factor" / "New thermal factor" due to copy-paste from another pane. Corrected to "Edit reuse factor" and "Add reuse factor".
3. **`AdminRegionalCostIndices` accessibility label**: toggle switch had generic label without state or category, making it ambiguous for screen readers. Now specifies `Active: ${r.state} ${r.category}`.
4. **`AdminThermalFactors` action button accessibility labels**: row edit and delete buttons only contained `${f.surface_type}`, producing ambiguous "Edit roof" labels for multiple roof factors. Now specifies `${f.category_label || f.category} (${f.surface_type})`.
5. **`AdminSolarPrices` action button accessibility fallback**: row edit and delete buttons omitted a fallback if `p.component_label` was null, causing `Edit undefined`. Now properly falls back to `p.component_key`.

### Tier 3 Intelligence, Field Performance & Monitoring tranche complete (23 November 2026)

Eleven Tier 3 admin intelligence, performance, learning review, and platform health suites upgraded from smoke tests to comprehensive behavioral conformance suites:

- `AdManager` (7 tests): campaign listing and budget totals, modal campaign creation with date validation and status defaulting, creative status toggles, deletion with confirmation dialog, and error recovery.
- `AdminAIAssistant` (7 tests): model selection, prompt execution, temperature parameter tuning, token usage estimation, chat transcript archiving, and network error handling.
- `AdminIntegrations` (6 tests): connector inventory with health indicators, API key credential updates, webhook endpoint configuration, manual sync dispatch, and error state alerts.
- `AdminIntelligence` (6 tests): platform analytics metrics, user retention cards, refresh dispatch with `{ force: true }`, administrator-only access gating, and database error alerts.
- `AdminLearningReview` (6 tests): learning record filtering, expandable audit trails with lifecycle stage tracking, status advance with mandatory justification, AI reference submission, and actual outcome recording.
- `AdminSiteIntelligence` (7 tests): site review reports table, verify/reject actions via review RPC, regional soil/environment profile creation with validation, profile withdrawal by id, and soil tabs display.
- `AdminSocialBrandCenter` (9 tests): credential management, platform authorization flows, account sync/disconnect/revoke actions, permission modal, and social analytics report rendering.
- `AdminWallFinishingLibrary` (7 tests): candidate topic counts and market coverage metrics, topic verification status updates, source citation creation, citation accept/reject reviews, article draft saving linked to topic slots, and load failure alerts.
- `AdminWebVitals` (8 tests): field performance dashboard with Core Web Vitals targets, formatted percentiles (LCP, INP, CLS, TTFB, FCP), slowest route breakdowns, time window filtering (7d, 30d, 90d), manual refresh, missing migration explanation (42P01), and error alerts.
- `SeoPerformance` (7 tests): administrator access gating, Search Console connection and live query metrics (clicks, impressions, CTR, position), disconnected status with historical baseline fallback, edge function error handling, and listing change category filters.
- `SystemHealth` (8 tests): non-admin access gating, centralized error monitoring overview with status dot and stats cards, error list with severity badges, search keyword filtering, error detail modal with stack trace, open/resolved toggle, service health checks, and alert threshold configuration.

Defects and accessibility improvements found and fixed during this tranche:

1. **`AdminButton` missing `aria-label` forwarding in `AdminUi.tsx`**: `AdminButton` did not include `aria-label` in its props interface or pass it to the underlying `Button`, breaking screen reader labels on icon-only and programmatic action buttons across the admin console. Now explicitly types and forwards `aria-label`.
2. **`AdminSiteIntelligence` ambiguous action button labels**: verify and reject buttons on site reports had non-specific accessible names. Now uniquely labeled `Verify report ${r.title}` and `Reject report ${r.title}`.
3. **`AdminSocialBrandCenter` missing accessible labels on account and credential controls**: action buttons (Add keys, Replace keys, Save keys, Connect, Permissions, Sync, Disconnect, Revoke) lacked contextual platform identifiers. Now includes full platform context (e.g. `Save keys for ${p.label}`, `Revoke access for ${p.label}`).
4. **`AdminWallFinishingLibrary` icon-only citation review buttons**: citation accept button rendered only `<Check className="h-4 w-4" />` with no text or accessible name. Added explicit `aria-label={`Accept citation: ${s.title}`}` and `aria-label={`Reject citation: ${s.title}`}`.

Remaining: Tier 3 content and system suites audited; behavioral suites now cover 28 core admin surfaces across pricing, materials, operations, intelligence, and system monitoring.

### Tier 3 Engine panes tranche complete (23 November 2026)

The last two inventoried suites now assert their wiring rather than their text:

- `AdminCountVision` (10 tests): the pane asks for `(page, pageSize)` and the
  rules once, the pager asks the server for the next page instead of slicing in
  the browser, a page-size change restarts at page 0, the pager reports the
  server's count ("Showing 26–50 of 60") rather than the rows it received, and a
  rules read failure hides the log entirely instead of inviting a decision on
  stale limits.
- `AdminFieldSync` (8 tests): the pane asks for the newest 100 captures and the
  rules once, the retry card counts only captures with a recorded queue attempt
  (one of two in the fixture), and a rules failure shows no capture list at all.

Defect found: the `AdminCountVision` mock wrapped the query functions without
forwarding arguments, so the suite could not have noticed the pane asking for
the wrong page. The wrapper now forwards, and the pagination tests prove it.

Remaining: 39 smoke-only suites, all from the 39 the first pass missed (see the
correction). The arithmetic: 82 smoke-only at audit time, 43 upgraded across the
tranches, 39 left.

## Limits of this audit

The smoke-only classification is a heuristic over the test source: interaction
helpers, mock-call assertions, and negative assertions. A file with none of the
three is treated as smoke-only. It can miss a file that asserts through a helper,
and it cannot judge whether an assertion is the right one. Reading each file is
the only way to settle that, which is what the tranches do.

## What a green suite did not prove

The upgraded suites pass, and until this audit nobody had run the repository's
type gate over them: `npm run typecheck` was failing on 27 errors across twelve
admin test files, six of them written by the 10-suite tranche. The causes were
all in the tests, not the pages:

- mocks resolved `{ data, error }` for functions whose real contract is
  `{ error }` only (`create`/`update`/`delete` on solar prices, solar panels,
  thermal factors, reuse factors and credit profiles), so a suite would have
  kept passing after the page started reading a field that never arrives;
- fixtures omitted required columns (`slug`, `measurement_system`,
  `recently_changed`, the intelligence source's crawl dates) or carried columns
  the type does not have, which is how `client_name` survived in a gallery
  fixture that the page never reads;
- literal types widened to `string` (`price_kind`, `verification_status`), and a
  partial `useAuth` stub that only compiled because it was cast.

`AdminIntelligenceSources` also read `res.message` from clients that never
return one. The page now shows the server's own message when the response
carries one and otherwise states what it just did ("Source disabled"), and its
test mocks what the client actually returns.

All 117 admin suites and `npm run typecheck` are green as of this commit.
