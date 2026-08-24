# FRELUX Paint Calculation Engine — Final Report

## 1. Current FRELUX calculator logic discovered

- `/paint-calculator` used `src/lib/calc.ts` with hardcoded `DEFAULT_COVERAGE_M2_PER_LITER = 10` and `SURFACE_CONDITION_FACTORS` constants
- `/painting-estimator` used `src/lib/estimation/painting-engine.ts` (Phase 2 engine) with DB-driven products, qualities, prices, and calc rules
- Two separate calculation systems existed — no single source of truth
- Coverage was not product-specific or quality-specific in the legacy calculator

## 2. Existing logic preserved

- All existing URLs remain functional (`/paint-calculator`, `/painting-estimator`)
- SEO metadata, navigation, saved estimates all intact
- Tyrolene partition-based calculator untouched (separate engine)
- Grafitex separate engine untouched
- Phase 2 painting-engine.ts continues to work alongside the new central engine
- Legacy `calc.ts` functions still available as fallback

## 3. Existing logic corrected

- `DEFAULT_COVERAGE_M2_PER_LITER = 10` clearly labeled as LEGACY FALLBACK, not a FRELUX business rule
- PaintCalculator now tries the central engine first (DB-configured coverage/prices)
- Falls back to legacy only when no DB config available

## 4. Paint Calculation Engine architecture

```
src/lib/estimation/paint-engine.ts     ← CENTRAL ENGINE (single source of truth)
src/lib/estimation/paint-engine-bridge.ts ← Bridge for legacy API compatibility
src/lib/estimation/painting-engine.ts  ← Phase 2 engine (still used by /painting-estimator)
src/lib/calc.ts                        ← Legacy engine (fallback only)
```

The central engine (`paint-engine.ts`) is used by:
- `/paint-calculator` (via bridge, with legacy fallback)
- Admin Test Calculator (`/admin/paint-engine-test`)
- Available for `/painting-estimator` to adopt in future

## 5. Database changes

Migration: `supabase/migrations/20260824070000_paint_engine_coverage_units.sql`

- `coverage_unit` column on `estimation_product_quality` (m2_per_liter, m2_per_bucket, ft2_per_liter, ft2_per_bucket, frelux_calibration)
- `ceiling_coverage` column on `estimation_product_quality` (separate ceiling coverage rate)
- `ceiling_coverage_unit` column on `estimation_product_quality`
- New calc rules: `ceiling_coverage_rate`, `standard_coat_count`, `frelux_calibration_references`, `coverage_unit_options`

## 6. Admin configuration

- **Products** (`/admin/estimation-products`): Coverage unit dropdown now has 5 options, ceiling coverage rate + unit fields
- **Config & Rules** (`/admin/estimation-config`): Existing calc rules management
- **Pricing** (`/admin/estimation-pricing`): Per product/quality pricing
- **Engine Test Calculator** (`/admin/paint-engine-test`): NEW — test engine with real inputs, full step-by-step breakdown
- **Admin nav**: "Engine Test Calculator" link added under Estimation section

## 7. Coverage system

- Product-specific + quality-specific (no global inheritance)
- Each paint type (Emulsion, Matt, Satin) × quality (Standard, Premium, High Quality) has independent coverage
- Coverage units: m²/L, m²/bucket, ft²/L, ft²/bucket, FRELUX Calibration
- Engine normalizes all units to m²/L internally

## 8. Satin-specific coverage system

- Satin has its own independent coverage model
- Satin Standard, Premium, High Quality each load different coverage records
- No inheritance from Emulsion or Matt
- Verified by tests: `Satin Premium vs Emulsion Premium vs Matt Premium — all different`

## 9-11. Matt/Emulsion coverage systems

- Each product has independent coverage per quality level
- Admin controls actual numerical values (nothing hardcoded)
- Verified by tests

## 12. Room-based calculation

- Customer enters: room name, length, width, height, doors, windows, ceiling, paint type, quality, coats
- m² calculated internally (not customer-facing input)
- Default unit: feet (metric supported)

## 13. Ceiling calculation

- Separate from wall coverage
- `ceiling_coverage` field on quality level (independent from wall `coverage`)
- Falls back to `ceiling_quantity_per_room` rule if no ceiling coverage configured
- Never assumes ceiling coverage = wall coverage

## 14. Door/window calculation

- Simple mode: number of doors + number of windows
- Professional mode: individual opening dimensions (width, height, quantity)
- Deduction percentage configurable (default 100% = full deduction)

## 15. Height logic

- FRELUX standard: 8 ft (configurable via `standard_room_height` rule)
- Above 8 ft triggers warning: "exceeds FRELUX standard"
- Actual height used directly in wall area calculation

## 16. Coat logic

- Default: 2 coats (configurable via `standard_coat_count` rule)
- Colour condition `min_coats_override` can force minimum (e.g., 3 for dark-over-light)

## 17. Surface/colour adjustments

- Surface condition: `coverage_adjustment_factor` from DB (e.g., 0.75 for rough)
- Colour condition: `min_coats_override` from DB
- No invented percentages — all from admin configuration

## 18. Theoretical vs practical quantity

- Theoretical: exact calculation (e.g., 1.37 buckets) — preserved with decimals
- Practical: rounds up to full buckets (e.g., 2 × 20-L buckets)
- Rounding rule configurable (ceil, round, floor — default ceil)

## 19. Pricing

- Per product/quality from `estimation_prices` table
- Nothing hardcoded
- Missing price → warning: "Price not configured"

## 20. Price snapshots

- `PriceSnapshotData` captures: product name, quality name, pack size, coverage rate, coverage unit, unit price, price ID, currency, effective date, calc version ID
- Old estimates retain snapshot; new estimates use current config

## 21. Calculation versioning

- `calc_version_id` included in every result and price snapshot
- Version tracked through `estimation_calc_versions` table

## 22. Audit logging

- `estimation_audit_log` table records admin changes
- Existing audit infrastructure used (AdminEstimationAudit page)

## 23. Security/RLS

- Only admin can modify coverage, prices, rules (existing Supabase RLS)
- Normal users cannot modify configuration
- No security weakened

## 24. Test results

- 470 tests passing (420 existing + 50 new engine tests)
- New tests cover: coverage normalization, product/quality specific coverage, Satin independence, ceiling separate coverage, theoretical vs practical, height rules, surface conditions, colour conditions, multi-room, calibration, price snapshots, labour exclusion

## 25-27. TypeScript/ESLint/Build status

- TypeScript: clean (no errors)
- ESLint: clean
- Production build: 75 routes prerendered, sitemap generated

## 28. GitHub commit

- Branch: `workspace` (not main)
- Latest commit: `d8aaa18`
- Repo: `https://github.com/petertubin-droid/frelux`

## 29. FRELUX settings still requiring real values from Admin

- Coverage rates for each product × quality combination (Emulsion/Matt/Satin × Standard/Premium/High Quality)
- Prices for each product × quality combination
- Ceiling coverage rates (if different from wall)
- FRELUX calibration reference points (if using frelux_calibration unit)
- Surface condition coverage_adjustment_factor values
- Colour condition min_coats_override values
- Height adjustment factors
- Opening deduction percentage
- Pack size (default 20L)
- Purchase rounding rule (default ceil)

## 30. Remaining issues / next steps

- `/painting-estimator` still uses Phase 2 `painting-engine.ts` — could be migrated to use `paint-engine.ts` directly for full unification
- PaintCalculator engine integration uses first quality found (doesn't let customer select quality level yet — would need UI update)
- FRELUX calibration reference points need to be configured by admin with real-world data
- Coverage values need to be entered by admin (no values are hardcoded)
- Audit log triggers for coverage/price changes could be added to the admin UI forms
