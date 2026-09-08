# FRELUX Logic and Rules Registry (Authoritative)

The single authoritative reference for FRELUX calculation and business rules. Where this registry and any other document disagree, the certified implementation and this registry win; discrepancies must be flagged and resolved, not papered over.
Last reviewed: 2026-09-08. Implementation reviewed at commit 4c1cba3.

Legend:

- Evidence states: SYSTEM_VERIFIED (certified by automated tests), USER_CONFIRMED (confirmed by FRELUX owner as Nigerian trade practice), ASSUMPTION (labeled default, honest fallback), ESTIMATED (derived, labeled), AI_EXTRACTED (from a plan image, requires confirmation), USER_PROVIDED (entered by the end user).
- Safety classes: FINISHING (non-structural), STRUCTURAL_HIGH_RISK (engineering/safety-critical), BUSINESS (monetization/access).
- Regional scope: GLOBAL (geometry/methodology, region-independent), REGIONAL (per market profile), PROJECT (user-supplied at run time).

---

## 1. PAINTING

- **Engine name:** painting_project (registry), plus painting_wall_area (wall-area-only engine). Wraps `calculatePaint` and helpers in `src/lib/calc.ts`. The central estimation path is `calculateRoom` in `src/lib/estimation/paint-engine.ts`.
- **Purpose:** room painting materials in purchasing terms.
- **Measurement basis:** FRELUX room methodology: wall area 2 x (L + W) x H, plus ceiling area L x W if included, minus door and window openings. The final result is liters and whole containers ("buckets"), never flattened to a bare m2 figure.
- **Required inputs:** length, width, wallHeight (metres or feet; engine converts internally via its unit convention). Optional: doors, windows, coats, paintType, includeCeiling, wasteMargin.
- **Input contract:** `painting_project` input shape in `engines-phase2.ts`; registry validates finite numbers and refuses otherwise.
- **Formula:** paintableArea = walls + ceiling (if any) - openings. liters = paintableArea x coats / coverageRate. adjustedLiters = liters x (1 + wasteMargin/100). Containers chosen from configured pack sizes, preferring the largest practical bucket; totalRecommended and leftover computed from whole containers.
- **Rounding:** whole containers; practical bucket recommendation; purchase rounding rule (`purchase_rounding_rule`) where configured.
- **Waste:** default 10 percent, user-adjustable.
- **Material rules:** coverage rate and container sizes come from the `paint_types` DB row for the standard type (admin managed), with code defaults as labeled fallback; default coat count from `estimation_calc_rules` `standard_coat_count` (fallback 2); quality and price from estimation products/qualities/prices in the central path.
- **Cost logic:** engine reports quantities only (costs null: price is user or market supplied). Cost pages and the central engine price from estimation price records or user input.
- **Configurable values (authoritative source):** coverage and pack size: `paint_types` table; coats, rounding, height/opening rules: `estimation_calc_rules`; colour and surface condition factors: `colour_conditions`, `surface_conditions` tables.
- **Regional scope:** geometry GLOBAL; prices REGIONAL/PROJECT.
- **Evidence:** USER_CONFIRMED methodology (FRELUX painting practice, Nigerian market), SYSTEM_VERIFIED (`calc.ts` tests, paint engine tests, certification suite).
- **Version / verification:** current as of 2026-09-08; propagation of DB paint config to engine consumers fixed and regression-tested 2026-09-08 (certification suite, 26 tests passing).
- **Dependencies:** `calc.ts`, `estimation/paint-engine.ts`, queries for paint types and rules.
- **Consumers:** Paint Calculator, Painting Estimator, Cost Estimator, AI copilot, painting takeoff (agent), PDF export of results.
- **Safety classification:** FINISHING.

## 2. SCREENING (WALL SCREEDING)

- **Engine name:** screeding_system (registry). Wraps `calculateScreedingSystem` in `src/lib/calc.ts`.
- **Purpose:** screeding system materials (putty or white cement + paint, optional extra material slot e.g. Screeding Bond) and costs.
- **Measurement basis:** NET WALL SURFACE AREA: room perimeter x height, minus confirmed openings. Never the floor area.
- **Required inputs:** areaM2 (net wall area), or room dimensions from which the caller derives it. Optional: systemType (putty | white_cement_paint), coats, pre-fetched config.
- **Input contract:** single `areaM2` per the documented engine contract; the takeoff planner derives net wall area from verified room geometry and states this in the plan.
- **Formula:** per material: base = area x coats / coverageAreaM2; waste adds wastePercentage; final and purchase quantities per rounding rule (ceil); cost = purchaseQuantity x pricePerUnit; system total = sum of material totals.
- **Rounding:** `rounding_rule` from config (ceil in production).
- **Waste:** `waste_percentage` from config (20 percent in production).
- **Material rules:** `screeding_system_config` row (one active per system type) is authoritative: coverage, coats default, currency, putty/paint/cement/extra name, unit, per-unit quantity and price.
- **Cost logic:** quantities priced from config prices; cost summary only when prices exist; regionalDataAvailable flag false (config prices, not market feeds).
- **Regional scope:** geometry GLOBAL; prices REGIONAL (NGN config; Nigerian trade practice basis).
- **Evidence:** USER_CONFIRMED (system ratios are FRELUX owner-provided Nigerian trade practice, not universal construction law), SYSTEM_VERIFIED (`screeding-system.test.ts`, certification suite).
- **Version / verification:** Phase 37 added the generic extra material slot (Screeding Bond); 2026-09-08 audit fixed the engine wrapper to read the authoritative result fields purchaseQuantity and totalCost (it previously reported 0 units and null costs to engine consumers) and added propagation regression tests.
- **Dependencies:** `calc.ts` (`calculateScreedingSystem`, `dbToSystemConfig`), `queries.ts` (`fetchScreedingSystemConfig`).
- **Consumers:** Screeding Calculator, Screeding Cost Estimator, screeding_system engine, agent takeoff, saved calculations.
- **Safety classification:** FINISHING.

## 3. TILING

- **Engine name:** tile_estimate (registry). Wraps `calculateTile` in `src/lib/pop-tile-calc.ts`.
- **Purpose:** tile quantities, boxes, adhesive and cost.
- **Measurement basis:** FLOOR AREA: length x width of the surface.
- **Required inputs:** surfaceType (floor|wall), method (traditional|adhesive), length, width, tile dimensions, tiles per box, tile price; all explicit, zero defaults by design.
- **Input contract:** documented in the engine; tile size and price come from user selection or regional profile, never invented.
- **Formula:** area = L x W; tile count from tile coverage; boxes = ceil(tiles / tiles_per_box) with cut allowance; adhesive per method and coverage.
- **Rounding:** whole boxes (ceil).
- **Waste:** cut/breakage allowance in the tile count.
- **Material rules:** tile admin materials provide defaults; user selection is authoritative at run time.
- **Regional scope:** geometry GLOBAL; prices REGIONAL/PROJECT.
- **Evidence:** SYSTEM_VERIFIED (`pop-tile-calc.test.ts`, takeoff tests: tiling blocked at plan time until a selection exists).
- **Version / verification:** current as of 2026-09-08.
- **Consumers:** Tile Calculator, Tile Cost Estimator, tile_estimate engine, agent takeoff (blocked without selection).
- **Safety classification:** FINISHING.

## 4. POP CEILING

- **Engine name:** pop_ceiling (registry). Wraps `calculatePopCeiling` in `src/lib/pop-tile-calc.ts`.
- **Purpose:** POP ceiling materials (boards, cement, accessories) and cost.
- **Measurement basis:** CEILING AREA: the room footprint, roomLength x roomWidth per the certified methodology.
- **Required inputs:** roomLength, roomWidth (metres or feet), unit convention handled by the engine.
- **Formula:** ceiling area = L x W; each material line = area / coverage per package, rounded up per package rules, priced per package.
- **Material rules:** `pop_materials` table (workflow "nigeria", categories primary/optional, coverage_rate per m2, package size/unit, unit price, labour rate). If materials are unavailable the engine refuses honestly (ok: false) with a message pointing to the manual calculator; it never invents quantities.
- **Rounding:** whole packages (ceil per package rules).
- **Cost logic:** package price x packages; labour rate per m2 where configured; currency from config.
- **Regional scope:** geometry GLOBAL; materials/prices REGIONAL (Nigerian workflow basis).
- **Evidence:** USER_CONFIRMED (Nigerian POP trade practice), SYSTEM_VERIFIED (`pop-tile-calc.test.ts`, POP DIY rewrite migration 2026-09-07, certification suite).
- **Version / verification:** POP DIY methodology rewritten 2026-09-07 (migration 20260907222100); certified in Stage 15 re-audit 2026-09-08.
- **Consumers:** POP Ceiling Calculator, POP Ceiling Cost Estimator, pop_ceiling engine, agent takeoff.
- **Safety classification:** FINISHING.

## 5. TYROLENE

- **Engine name:** tyrolene_partition_area (registry, in `engines-registry.ts`).
- **Purpose:** tyrolene partition area quantity.
- **Measurement basis:** PARTITION methodology: partition width x height.
- **Required inputs:** width, height (partition contract).
- **Formula:** area = width x height, returned as m2.
- **Material rules:** `tyrolene_config` (admin managed) supplies material data for the estimator page.
- **Regional scope:** geometry GLOBAL.
- **Evidence:** SYSTEM_VERIFIED (registry and takeoff tests).
- **Version / verification:** current as of 2026-09-08.
- **Consumers:** Tyrolene Estimator page, tyrolene takeoff kind.
- **Safety classification:** FINISHING.

## 6. GRAFITEX (FINISH)

- **Engine name:** none in the registry (single-consumer calculator). Authoritative function: `calculateFinish` in `src/lib/finish-calc.ts`.
- **Purpose:** Grafitex decorative finish materials.
- **Measurement basis:** m2 methodology on the treated wall area.
- **Required inputs:** area, finish type; coats default per finish type (`getDefaultCoats`).
- **Material rules:** `dbToFinishMaterialConfig` maps DB finish material config; code defaults are labeled fallback.
- **Regional scope:** geometry GLOBAL; prices REGIONAL/PROJECT.
- **Evidence:** SYSTEM_VERIFIED (`finish-calc` tests via FinishEstimator tests).
- **Version / verification:** current as of 2026-09-08.
- **Consumers:** Finish Estimator page only (no agent/takeoff consumer today; adding one requires a registry engine, not a copy).
- **Safety classification:** FINISHING.

## 7. SCREEDING COST, TILE COST, POP COST ESTIMATORS

- **Purpose:** cost views over the same quantity functions plus labour.
- **Basis:** identical to sections 2, 3, 4; quantities come from the same authoritative functions (no reimplementation).
- **Cost logic:** quantity x price (user or config) + labour via `calculateLabourCost` and labour settings.
- **Configurable values:** material config tables (sections 2 to 4) and labour settings (admin).
- **Evidence:** SYSTEM_VERIFIED (per-calculator tests).
- **Consumers:** the three cost estimator pages.
- **Safety classification:** FINISHING / BUSINESS for pricing display.

## 8. STRUCTURAL

- **Purpose:** structural member quantity and budget estimation (Structural Calculator).
- **Measurement basis:** member dimensions supplied by the user.
- **Required inputs:** member type and dimensions per the calculator's stated contract.
- **Formula:** member geometry based; parameters are user inputs, not admin-editable formulas.
- **Regional scope:** GLOBAL geometry; prices PROJECT/REGIONAL.
- **Safety classification:** STRUCTURAL_HIGH_RISK. Results are indicative budgeting only. A qualified engineer must review and approve before construction. The agent surfaces the engineer sign-off state (`has_engineer_schedule` flag) and never overrides it. These rules are code-only: no ordinary Admin configuration can alter structural methodology.
- **Governance:** any change follows the high-risk process in section 14.
- **Evidence:** SYSTEM_VERIFIED at the function level; engineering sign-off is USER_CONFIRMED policy.
- **Version / verification:** current as of 2026-09-08.
- **Consumers:** Structural Calculator; predictive intelligence summaries.

## 9. FOUNDATION

- **Purpose:** foundation quantity estimation (Foundation Calculator).
- **Measurement basis:** building footprint and foundation type per the calculator contract.
- **Formula:** footprint-derived quantities with user-supplied prices for inputs such as formwork and DPM per m2.
- **Regional scope:** GLOBAL geometry; prices PROJECT/REGIONAL.
- **Safety classification:** STRUCTURAL_HIGH_RISK. Same engineer-review requirement and admin boundary as structural.
- **Evidence:** SYSTEM_VERIFIED at the function level; policy USER_CONFIRMED.
- **Version / verification:** current as of 2026-09-08.
- **Consumers:** Foundation Calculator, Build-to-Roof stage inputs.

## 10. BUILD-TO-ROOF

- **Engine name:** build_to_roof (registry, `engines-registry.ts`).
- **Purpose:** whole-building staged estimate from foundation to roof.
- **Measurement basis:** building footprint and stage choices; stages reuse the same quantity functions per discipline.
- **Required inputs:** building dimensions and build options; prices (formwork, DPM, labour rates per m2) are USER_PROVIDED inputs with labeled defaults.
- **Formula:** stage quantities per discipline; smart defaults for building assumptions are labeled assumptions with stated origin, not silent regional truth.
- **Regional scope:** GLOBAL geometry; Nigerian default market profile per standing instruction; all prices PROJECT-supplied.
- **Safety classification:** STRUCTURAL_HIGH_RISK for structural stages (same engineer-review requirement); FINISHING for finishing stages.
- **Evidence:** SYSTEM_VERIFIED (BuildToRoofEstimator tests).
- **Version / verification:** current as of 2026-09-08.
- **Dependencies:** discipline quantity functions; timeline engine.
- **Consumers:** Build-to-Roof Estimator page, agent.

## 11. ROOF GEOMETRY

- **Engine name:** roof_geometry (registry).
- **Purpose:** roof area and member quantities from building facts.
- **Measurement basis:** extracted or supplied building facts (length, width, roof type parameters).
- **Safety classification:** STRUCTURAL_HIGH_RISK (code-only, engineer review required).
- **Evidence:** SYSTEM_VERIFIED (registry tests).
- **Version / verification:** current as of 2026-09-08.
- **Consumers:** takeoff roofing kind, Build-to-Roof.

## 12. PROJECT TIMELINE

- **Engine name:** estimateTimeline (`measurement/timeline-engine.ts`).
- **Purpose:** phased construction schedule.
- **Basis:** project scope and template phases (admin timeline templates are the authoritative phase source).
- **Regional scope:** templates REGIONAL (Nigerian practice baseline), GLOBAL engine.
- **Evidence:** SYSTEM_VERIFIED (timeline tests).
- **Version / verification:** current as of 2026-09-08.
- **Consumers:** Project Timeline page, agent timeline tool.

## 13. QUANTITY TAKEOFF (PLAN VISION)

- **Engine name:** none of its own; orchestrator. Mapping `TAKEOFF_ENGINE_IDS` in `plan-vision/takeoff.ts` is the ONLY path from takeoff kind to engine: painting to painting_project, screeding to screeding_system, tiling to tile_estimate, pop_ceiling to pop_ceiling, tyrolene to tyrolene_partition_area, roofing to roof_geometry, building to build_to_roof.
- **Purpose:** per-room material takeoff from verified plan geometry.
- **Input contract:** per-kind documented input shapes; the planner adds no math, no unit conversion and no defaults; engines validate their own inputs.
- **Core semantics (certified, must not be regressed):** screeding uses NET WALL area; tiling uses FLOOR area and is blocked until a tile selection exists; POP uses the ceiling footprint; painting uses the room methodology above; tyrolene uses partition width x height.
- **Recording:** results recorded verbatim per item with engine attribution; missing inputs produce honest `missingData` entries.
- **Regional scope:** GLOBAL process; prices follow each engine's scope.
- **Evidence:** SYSTEM_VERIFIED (takeoff tests, certification suite: agent equals engine equals independent arithmetic).
- **Version / verification:** Stage 15 contract re-audit 2026-09-08; propagation tests 2026-09-08.
- **Consumers:** agent quantity_takeoff tool, plan-based estimating flows.

## 14. AI IMAGE ESTIMATOR

- **Purpose:** extract rooms, dimensions and openings from a floor-plan image for use in calculators and takeoff.
- **Basis:** AI extraction (`ai-construction-extraction` edge function) with per-value confidence.
- **Contract:** AI_EXTRACTED values are candidates until the user confirms them; low-confidence and missing values are requested, never assumed. Only confirmed geometry enters calculations.
- **Regional scope:** GLOBAL.
- **Safety classification:** FINISHING process with confirmation gate; the AI never writes to trusted config.
- **Evidence:** SYSTEM_VERIFIED (image estimation tests); extraction quality monitored via admin.
- **Version / verification:** current as of 2026-09-08.
- **Consumers:** Image Estimator page, plan-vision pipeline.

## 15. PROJECT AND QUOTATION CALCULATIONS

- **Purpose:** saving, replaying and quoting estimates.
- **Contract:** `project_calculations.result_summary` and estimate history `result_data` are IMMUTABLE SNAPSHOTS recorded verbatim at save time. Later configuration or price changes never rewrite saved estimates. PDF export renders the passed result without recalculating. Quotation previews report caller-supplied cost data verbatim; the agent never recomputes costs.
- **Evidence:** SYSTEM_VERIFIED (certification suite verbatim-recording tests, snapshot tests).
- **Safety classification:** BUSINESS.
- **Version / verification:** current as of 2026-09-08.

## 16. MARKET PRICES AND REGIONAL GOVERNANCE

- **Authoritative price source:** `mi_approved_prices` per `market_code` (market profile), unique per product + package, freshness-scored (fresh, recent, stale, expired), admin approved only.
- **Resolution order:** same product + package, same market; then any package for the same product in the same market (labeled ESTIMATED, package mismatch); then NO_PRICE (honest refusal). The resolver NEVER crosses markets: no Nigerian price is substituted for another region.
- **Agent market_intelligence:** requires an explicit market; refuses with honest insufficient_data instead of substituting another region.
- **Knowledge states:** Nigeria: VERIFIED (approved prices, user-confirmed trade practice). Other regions: CANDIDATE or UNAVAILABLE, never silently NG-backed. Where regional information is missing, the limitation is stated and prices are requested from the user.
- **Help FRELUX Learn This Region:** PLANNED, NOT IMPLEMENTED. The intended design: user submissions enter controlled candidate knowledge and require verification before becoming trusted. Today regional data is admin-driven (observations, crawls, approvals).
- **Evidence:** SYSTEM_VERIFIED (market intelligence tests, certification regional scoping tests).

## 17. SINGLE SOURCE OF TRUTH: AUDIT RESULTS

Authoritative sources per rule type: math in `calc.ts`, `pop-tile-calc.ts`, `finish-calc.ts`, `estimation/paint-engine.ts`; config in the admin tables listed in the System Guide section 6; market prices in `mi_approved_prices`; agent results verbatim from engines.

Duplicates and conflicts found by the 2026-09-08 propagation audit, and their resolution:

1. **painting_project engine defaults were code-only** while the calculator pages read `paint_types` and `estimation_calc_rules`. An admin coverage or pack-size change reached the pages but not the agent/takeoff. FIXED (commit 4c1cba3): the engine now reads the same DB sources with code defaults as labeled fallback. Regression-tested.
2. **screeding_system engine wrapper read stale result field names** (`quantity`, `cost`) while the authoritative result exposes `purchaseQuantity`, `totalCost`. Engine consumers (agent, takeoff) received 0 buckets, 0 bags and null costs while the calculators were correct. FIXED (commit 4c1cba3) to read the documented fields. Regression-tested.
3. **Accepted separations (not conflicts):** the manual Cost Estimator page uses `calculateEstimatedTotal` while the AI cost path uses cost-integration with explicit quantitySource and market price resolution; the paint page prefers the central estimation engine with `calculatePaint` as its documented fallback. Both sides trace to the same quantity functions; the agent records caller costs verbatim, so no divergence reaches users unlabeled.
4. **No admin propagation gap remains:** screeding, POP, tile, paint and rule-based configuration are fetched fresh per calculation by every consumer; propagation and missing-config honest failure are now permanent regression tests (certification suite section 11).

## 18. VERSION CONTROL AND CHANGE GOVERNANCE

- Config rows carry `updated_at`; every calculation records its snapshot at save time; the migration history (213 migrations) records schema and rule changes with dates.
- Significant logic changes must be traceable: previous behavior, new behavior, reason, author/reviewer, timestamp, affected engines, affected regions, affected consumers, test status, approval status and rollback capability (git revert plus forward-only migrations with documented notes).
- Historical saved estimates never silently change when configuration versions change (immutable snapshot contract, section 15).
- Every rule in this registry is verified by named test suites; the certification suite (26 tests) is the authoritative gate for agent/engine contract integrity.

## 19. HIGH-RISK CHANGE PROCESS (MANDATORY)

For all STRUCTURAL_HIGH_RISK rules (structural, foundation, roof geometry, build-to-roof structural stages):

1. VERIFY: confirm the requirement and the certified current behavior.
2. TEST: write failing tests capturing the intended change; no change without a test.
3. REVIEW: at minimum one qualified reviewer; for engineering behavior, engineer sign-off.
4. APPROVE: explicit approval recorded (commit message and registry update).
5. VERSION: record previous and new behavior in this registry.
6. DEPLOY: through CI; full suite and build must pass.
7. ROLLBACK: verified rollback path (git revert, Netlify redeploy) before deploy.

Ordinary Admin configuration (prices, coverage of finish materials, rules) can never alter these formulas: high-risk logic is code-only, and admin surfaces expose data, not formulas.

## 20. DOCUMENTATION VALIDATION

This registry was generated from the implemented system on 2026-09-08 and cross-checked: every engine listed exists in the registry code; every stated contract matches the certified test suites (5,443 tests passing); every documented admin propagation path is exercised by the propagation regression tests; planned features ("Help FRELUX Learn This Region") are labeled as planned, not implemented. Known limitations: the registry documents rule families, not every numeric default; individual values live in the admin tables and migrations referenced above, which remain the authoritative numeric sources.

---

## 21. PUBLIC API (FRELUX AI API, PHASE 7)

The public API (`supabase/functions/frelix-api`, served at `/v1`) is a governed surface, not a side channel:

- **Canonical engines only.** Calculation requests are executed by the canonical engine registry, bundled server-side from `src/lib/frelix-api/server-engines.ts` (`npm run build:api-engines`). The API introduces no alternative math, and incomplete input returns a structured `validation_failed` error — missing values are never invented.
- **AI honesty unchanged.** `/v1/chat` routes calculation questions through the deterministic engines; the AI never produces calculation results. Market responses keep the OBSERVED vs CONFIGURED labels and freshness contract; regions without a FRELUX profile return "not available" rather than substituted data.
- **Key governance (§3).** Keys are 32-char `FLX-…` crypto-random secrets; only a SHA-256 hash is stored. Raw keys are shown exactly once at create/rotate. Status, expiry, per-minute rate limit, daily/monthly quotas, capability allow-list and plan region entitlement are enforced before any business logic runs; the tenant is always resolved from the key record.
- **Feedback enters governance.** `/v1/feedback` writes `USER_PROVIDED` `CANDIDATE` learning records (Phase 6.5 pipeline) — never auto-approved, never trusted; structural topics are flagged `requires_engineering_review`.
- **Audited like the UI.** Every request is metered in `frelux_api_usage` (method, path, status, capability) — an audit trail equivalent to the in-app audit registry.
