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

## The inventory

Tier 1 is money and destructive actions, where a wrong argument costs a user or
the business real amounts. Tier 2 is engine wiring, where a wrong setting
silently changes calculated output. Tier 3 is content CRUD.

| file                          | tests | assertions | tier     |
| ----------------------------- | ----- | ---------- | -------- |
| `AdminBoqTemplates`           | 2     | 3          | 1 money  |
| `AdminCashFlowTemplates`      | 1     | 3          | 1 money  |
| `AdminCreditProfiles`         | 1     | 3          | 1 money  |
| `AdminEstimationEstimates`    | 1     | 2          | 1 money  |
| `AdminExpenseLedger`          | 2     | 6          | 1 money  |
| `AdminFinance`                | 2     | 4          | 1 money  |
| `AdminMarginPresets`          | 1     | 3          | 1 money  |
| `AdminMarketPrices`           | 1     | 1          | 1 money  |
| `AdminSupplierLedger`         | 2     | 2          | 1 money  |
| `AdminAiSettings`             | 1     | 2          | 2 engine |
| `AdminEngineConfig`           | 1     | 2          | 2 engine |
| `AdminEngineStudio`           | 2     | 3          | 2 engine |
| `AdminIntelligenceSources`    | 1     | 3          | 2 engine |
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
| `AdminListedMarkets`          | 2     | 3          | 3 CRUD   |
| `AdminMaintenanceProfiles`    | 1     | 3          | 3 CRUD   |
| `AdminPriceIndex`             | 2     | 2          | 3 CRUD   |
| `AdminPriceSubmissions`       | 1     | 3          | 3 CRUD   |
| `AdminRegionalCostIndices`    | 1     | 3          | 3 CRUD   |
| `AdminReuseFactors`           | 1     | 3          | 3 CRUD   |
| `AdminSiteIntelligence`       | 2     | 3          | 3 CRUD   |
| `AdminSocialBrandCenter`      | 1     | 3          | 3 CRUD   |
| `AdminSolarPanels`            | 1     | 3          | 3 CRUD   |
| `AdminSolarPrices`            | 1     | 3          | 3 CRUD   |
| `AdminSuppliers`              | 2     | 2          | 3 CRUD   |
| `AdminTestimonials`           | 2     | 4          | 3 CRUD   |
| `AdminThermalFactors`         | 1     | 3          | 3 CRUD   |
| `AdminTranslations`           | 2     | 4          | 3 CRUD   |
| `AdminTravelApprovals`        | 1     | 1          | 3 CRUD   |
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
   missing that column takes the whole page down rather than that row. Recorded
   here; the fix belongs with the page, not the test.

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

Tranche 1 is complete. Remaining overall: tranche 2 engine pages, starting with
`AdminEngineConfig`.

## Limits of this audit

The smoke-only classification is a heuristic over the test source: interaction
helpers, mock-call assertions, and negative assertions. A file with none of the
three is treated as smoke-only. It can miss a file that asserts through a helper,
and it cannot judge whether an assertion is the right one. Reading each file is
the only way to settle that, which is what the tranches do.
