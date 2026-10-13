# FRELUX Engine Duplicate Audit (P0, 2026-10-13)

Classification of every suspected duplicate among the 54 canonical engines.
Rule (owner mandate): no duplicate engine may exist; legacy wrappers must
not bypass the authoritative implementation.

## Resolved this batch

| Pair | Classification | Action |
|---|---|---|
| `roof_geometry` vs `roof_geometry_calculation` (ai-foundation) | TRUE DUPLICATE + boundary violation: the `_calculation` route recomputed the slope formula inline instead of calling the authoritative engine | `roof_geometry_calculation` removed from engines-expanded.ts (zero external references; requirements layer already used `roof_geometry`) |

## Kept — layered, not duplicates

| Pair | Classification |
|---|---|
| `paint-engine.ts` vs `painting-engine.ts` | Layered: paint-engine is the coverage/litres SUB-engine consumed by painting-engine (the authoritative engine used by pages + AI). Also paint-engine-bridge.ts is an adapter. No duplicate. |
| `timeline-engine.ts` (measurement) vs `timeline-estimator.ts` (engineering) | Different purposes: phase tracking (project-agent) vs duration estimation (ProjectTimeline page). Both stay; see assumption flag below. |

## Foundation pair — reconciled (see 2026-10-13 verification below; complementary, banner added)

| Pair | Classification | Required action | Status |
|---|---|---|---|
| `estimation/foundation-engine.ts` (cost estimation, FoundationEstimator) vs `engineering/foundation-calculator.ts` (structural design: soil bearing -> footing geometry, FoundationCalculator) | VERIFIED COMPLEMENTARY pair, not a cost duplicate: foundation-calculator uses BS 8004 Table 1 soil bearing values (universal engineering constants) with a `custom` bearing override; `lateritic` is a legitimate soil type across tropical markets; page uses useMarket. The canonical 20-market estimator remains `estimation/foundation-engine`. | Cross-link banner on `/foundation-calculator` routes users needing material takeoff + market pricing to `/foundation` (Foundation Estimator); permanent SEO route preserved for engineering sizing. | Reconciled: complementary engines, banner added, no duplicate cost implementation remains. |

## Hardcoded regional assumptions found (P0 sweep seeds)

- `engineering/timeline-estimator.ts`: `Season = "dry" | "rainy"` with a fixed
  rainy=1.2 productivity multiplier is an NG/Africa climate model. Global
  markets need per-market climate/workability inputs (winter shutdowns in
  CA/GB/DE, monsoon in IN/ID, heat restrictions in SA/AE).
- `engineering/structural-calculator.ts`, `sequence-planner.ts`,
  `roof/*`, `wallfinishing/*`: audit for NG-only rules during the P0
  hardcoded-assumptions sweep (next batch; grep targets in handoff).
