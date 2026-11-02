# ADR-008: Single Screeding Engine (Legacy Mix Engine Removal)

**Status:** Accepted
**Date:** 2026-10-02
**Supersedes:** none

## Context

FRELUX had **two parallel screeding calculation engines** that produced
estimates from different inputs, different coverage models, and different
data sources:

1. **The authoritative Wall Screeding system** (`src/lib/screeding.ts` +
   `calculateScreedingPutty` / `calculateScreedingMixSystem` /
   `calculateScreedingSystem` in `calc.ts`): DB-backed per-system config
   (`screeding_material_systems`), two material systems (putty and
   white-cement + paint), warnings, and a breakdown model used by the
   Screeding Cost Estimator page.
2. **A legacy "screeding mix" engine** (`calculateScreedingMix` +
   `calculateAdvancedEstimate` in `calc.ts`): a hardcoded fallback config
   fetched from the `screeding_mix_config` table, hardcoded pack sizes
   ("20 L bucket", "40 kg bag"), and a fixed 1:3 / 2:1 mix-ratio model that
   the Smart Calculator switched into whenever that table had a row.

The duplication caused real defects:

- **Silent zeros:** the legacy engine defaulted missing config values
  (`?? 0`) instead of warning, so an incomplete admin config produced a
  confident-looking ₦0 estimate.
- **Broken UI:** the Smart Calculator rendered the screeding-mode tabs
  (Breakdown / Mix Ratio / Compare) from the legacy engine even when the
  page had **no net area**, because `netArea` defaulted to `0`.
- **Divergent numbers:** the same wall could produce different totals from
  the two engines, undermining the golden-numbers audit.
- **Hardcoded business rules** ("20 L bucket", "40 kg bag", `1:3` mix)
  lived in code, contradicting the DB-configurable principle every other
  calculator follows.

## Decision

1. **One engine.** All screeding calculations go through the Wall Screeding
   system (`calculateScreedingPutty` / `calculateScreedingMixSystem` /
   `calculateScreedingSystem`) backed by
   `fetchScreedingSystemConfig(systemType)`. The legacy
   `calculateScreedingMix` and `calculateAdvancedEstimate` functions, the
   `AdvancedCalcInput` / `ScreedingMixConfig` / `ScreedingMixResult` /
   `AdvancedEstimateData` / `AdvancedEstimateLineItem` types, the
   `fetchScreedingMixConfig` query, and the `DbScreedingMixConfig` DB row
   type are **deleted**.
2. **The Smart Calculator is a pure AI estimation tool.** It no longer
   fetches any material configuration and no longer has a screeding mode.
   Its `AdvancedCalculator` renders the AI analysis / cost-adjuster /
   AI-assistant / saved tabs only. All four pages that embed it
   (Smart, Paint, POP, Tile) pass `contextSummary` + `clientHash` only.
3. **Missing config is a warning, never a silent zero.** The authoritative
   engine returns an explicit data-requirement warning (shown in the Cost
   Estimator UI) whenever a needed config value is missing: coverage rate,
   coats, price, quantity, waste percentage, currency, etc. Cost fields are
   `null` until the config is complete.
4. **The `screeding_mix_config` DB table is deprecated.** No code references
   it. It can be deactivated (set `is_active = false`) or dropped in a
   future migration; the authoritative config lives in
   `screeding_material_systems` and its material rows.

## Consequences

- **Positive:** one coverage model, one config source, one number per wall;
  Smart Calculator has a single coherent purpose; missing admin data is
  loud instead of silent; ~270 lines of duplicated engine code and its
  golden tests removed.
- **Negative:** previously saved screeding estimates from the Smart
  Calculator (saved as raw `estimateData` JSON) can no longer be
  re-rendered by a live engine; the Saved tab still lists and deletes
  them. A data migration is possible later if any user data matters.
- **Neutral:** the saved-estimate storage shape (`advanced_estimates`) is
  unchanged; PDF export for the Smart Calculator now always uses the
  AI-generated quotation HTML.

## Verification

- `tsc --noEmit` clean (app + test configs).
- Full suite: **655 files / 5922 tests passing**, including new warning
  tests for every missing-config scenario of both screeding systems
  (`screeding-system.test.ts`) and the rewritten Smart Calculator page
  tests asserting no config fetch happens.
- Production build + sitemap succeed.
