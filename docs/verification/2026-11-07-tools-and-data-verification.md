# FRELUX tools, engines and live-data verification — 7 November 2026

Verification only. No calculator formula, engine constant or schema was changed in this pass.

## 1. Method

- **Register.** 82 tool routes in scope: the 71 entries in `src/config/construction-tools.ts` plus engines routed outside the catalogue (Quote Check, Site Intelligence, BOQ Studio, Document Studio, Cost Estimator, TV Console, Borehole, Water Tower, Screeding cost, Supplier directory, Price submission).
- **Engine evidence.** Targeted suites: `src/lib/engineering`, `src/lib/boq`, `src/lib/estimation`, `src/lib/price-index`, `src/lib/currency`, `src/lib/fx` and all `src/pages` tests. The full ~12k suite was deliberately not run.
- **Independent arithmetic.** Each shared takeoff engine was called directly with canonical inputs and compared against hand calculations.
- **Live data.** Production database read (RLS anon key used by the public site), 41 markets, both price tables, plus a live FX feed (`open.er-api.com`, 7 Nov 2026 00:02 UTC).

## 2. Engine layer result

| Domain                                       | Test files | Assertions | Failures |
| -------------------------------------------- | ---------- | ---------- | -------- |
| engineering + boq + estimation + price-index | 149        | 2,108      | 0        |
| currency + fx + all page/calculator suites   | 270        | 890        | 0        |
| **Total**                                    | **419**    | **2,998**  | **0**    |

## 3. Hand-checked arithmetic

| Engine          | Input                | Engine output                                                                   | Hand calculation                                                                                | Verdict    |
| --------------- | -------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------- |
| Plastering      | 30 m² · 12 mm · 1:4  | dry mortar 0.53 m³ · cement 152 kg · sand 0.42 m³                               | dry 0.53 m³ → cement 0.106 m³ × 1,440 = 153 kg; sand 4 × 0.106 = 0.42 m³                        | consistent |
| Paving          | 50 m²                | pavers 2,511 · bedding sand 1.57 m³ · compacted subbase 7.50 m³ · loose 9.38 m³ | 2,500 pavers at 0.2 × 0.1 m; sand 30 mm = 1.5 m³; 150 mm subbase = 7.5 m³; ×1.25 bulking = 9.38 | consistent |
| Demolition      | wall 10 × 0.23 × 3 m | in-place 6.90 m³ · loose 9.31 m³                                                | 6.9 m³ × 1.35 bulking = 9.32 m³                                                                 | consistent |
| Drywall         | 50 m² single side    | board area 50 m² · 20 sheets                                                    | 1.2 × 2.4 = 2.88 m² → 17.4 + 10% = 19.1 → 20                                                    | consistent |
| Masonry         | 30 m² · 9-inch block | cement 5 bags · sand 0.71 m³                                                    | 30 m² mortar ≈ 0.9 m³ at 1:6 → 4–5 bags                                                         | consistent |
| Drainage        | 30 m run · 110 mm    | 5 stock pieces · 3 chambers · excavation 15 m³                                  | 30 m ÷ 6 m stock = 5; 0.5 × 1 × 30 = 15 m³                                                      | consistent |
| Insulation      | 100 m² · 100 mm      | gross 105 m² · 10.5 m³                                                          | 105 × 0.1 = 10.5 m³                                                                             | consistent |
| Temporary works | 20 m run · 6 m high  | 44 standards · 80 ledgers · 36 m² deck                                          | bay/height layout reconciles with 2.5 m bays                                                    | consistent |

## 4. Live data layer result

41 markets, 1,466 rows in `market_material_prices`, all refreshed within 1 day:

| Market                                                                                                                                                                                                                                                                                                  | Rows | Zero observations | Never verified | Categories | Newest |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ----------------- | -------------- | ---------- | ------ |
| GB                                                                                                                                                                                                                                                                                                      | 115  | 57                | 115            | 19         | —      |
| US                                                                                                                                                                                                                                                                                                      | 79   | 73                | 79             | 24         | —      |
| ZA                                                                                                                                                                                                                                                                                                      | 69   | 50                | 69             | 17         | —      |
| DE                                                                                                                                                                                                                                                                                                      | 66   | 56                | 66             | 17         | —      |
| SA                                                                                                                                                                                                                                                                                                      | 63   | 47                | 63             | 16         | —      |
| CA                                                                                                                                                                                                                                                                                                      | 62   | 47                | 62             | 15         | —      |
| BR                                                                                                                                                                                                                                                                                                      | 60   | 56                | 60             | 17         | —      |
| MX                                                                                                                                                                                                                                                                                                      | 60   | 52                | 60             | 16         | —      |
| AU                                                                                                                                                                                                                                                                                                      | 59   | 57                | 59             | 17         | —      |
| AE                                                                                                                                                                                                                                                                                                      | 59   | 51                | 59             | 16         | —      |
| FR                                                                                                                                                                                                                                                                                                      | 57   | 55                | 57             | 17         | —      |
| KE                                                                                                                                                                                                                                                                                                      | 57   | 57                | 57             | 17         | —      |
| IT                                                                                                                                                                                                                                                                                                      | 57   | 57                | 57             | 16         | —      |
| GH                                                                                                                                                                                                                                                                                                      | 56   | 56                | 56             | 16         | —      |
| ID                                                                                                                                                                                                                                                                                                      | 56   | 56                | 56             | 16         | —      |
| IN                                                                                                                                                                                                                                                                                                      | 56   | 56                | 56             | 16         | —      |
| JP                                                                                                                                                                                                                                                                                                      | 55   | 55                | 55             | 16         | —      |
| KR                                                                                                                                                                                                                                                                                                      | 55   | 55                | 55             | 16         | —      |
| NG                                                                                                                                                                                                                                                                                                      | 54   | 52                | 54             | 17         | —      |
| NL                                                                                                                                                                                                                                                                                                      | 49   | 45                | 49             | 16         | —      |
| CN                                                                                                                                                                                                                                                                                                      | 49   | 47                | 49             | 14         | —      |
| AT                                                                                                                                                                                                                                                                                                      | 17   | 17                | 17             | 7          | —      |
| EG                                                                                                                                                                                                                                                                                                      | 12   | 12                | 12             | 7          | —      |
| CH                                                                                                                                                                                                                                                                                                      | 11   | 8                 | 11             | 9          | —      |
| PL                                                                                                                                                                                                                                                                                                      | 10   | 8                 | 10             | 7          | —      |
| ES                                                                                                                                                                                                                                                                                                      | 9    | 8                 | 9              | 7          | —      |
| NO                                                                                                                                                                                                                                                                                                      | 9    | 8                 | 9              | 6          | —      |
| BE                                                                                                                                                                                                                                                                                                      | 8    | 8                 | 8              | 6          | —      |
| DK                                                                                                                                                                                                                                                                                                      | 8    | 8                 | 8              | 6          | —      |
| FI                                                                                                                                                                                                                                                                                                      | 8    | 8                 | 8              | 6          | —      |
| IE                                                                                                                                                                                                                                                                                                      | 8    | 8                 | 8              | 6          | —      |
| MY                                                                                                                                                                                                                                                                                                      | 8    | 8                 | 8              | 6          | —      |
| NZ                                                                                                                                                                                                                                                                                                      | 8    | 8                 | 8              | 6          | —      |
| PH                                                                                                                                                                                                                                                                                                      | 8    | 8                 | 8              | 6          | —      |
| PK                                                                                                                                                                                                                                                                                                      | 8    | 8                 | 8              | 6          | —      |
| PT                                                                                                                                                                                                                                                                                                      | 8    | 8                 | 8              | 6          | —      |
| SE                                                                                                                                                                                                                                                                                                      | 8    | 8                 | 8              | 6          | —      |
| SG                                                                                                                                                                                                                                                                                                      | 8    | 8                 | 8              | 6          | —      |
| TH                                                                                                                                                                                                                                                                                                      | 8    | 8                 | 8              | 6          | —      |
| TR                                                                                                                                                                                                                                                                                                      | 8    | 8                 | 8              | 6          | —      |
| TZ                                                                                                                                                                                                                                                                                                      | 1    | 0                 | 1              | 1          | —      |
| Index table served to users (`estimation_prices`, read path `src/lib/price-index/queries.ts`): 1,000+ rows between 22 Aug and 6 Nov 2026, **0 rows with three or more supporting submissions**, **0 verified**, `city_slug` null on every sampled row, and 582 rows with no verification status at all. |

### Defects found

1. **Publication gate is not enforced in the read path.** `queries.ts` filters `price_type`, `market`, `is_active` and `effective_date` only. `observations_count` / `supporting_submissions` are never checked, so the index publishes figures the index copy says cannot be published without three independent prices.
2. **Zero evidenced prices globally.** `market_material_prices`: 1,302 of 1,466 rows have 0 observations, 1,466 of 1,466 have no verification date.
3. **Conflicting duplicates, no sale unit.** 25 market/product pairs hold prices 2.5× to 420× apart, mostly one being a different sale quantity: timber (2 x 4) ZAR 29.45 vs 12,362; block (9-inch) SAR 1.92 vs 138.03; cement 50 kg NGN 12,500 vs 15,500; NL cement EUR 7.50 vs 31.77.
4. **Price stored in the unit column.** 10 rows (`AU …10 L` unit=99, `CA …12 L pail` unit=37.78, `IN Tractor Emulsion 20 L` unit=1,900, `NG Wall Primer 20 L` unit=12,000).
5. **City dimension is empty on the index table.** `city_slug` is null throughout, so the 25-city selector cannot filter anything and every city shows the same national figure.

Consequence: engine arithmetic can be certified; **priced output cannot be certified for any market or tool** until evidence exists behind the numbers.

## 5. Repair prepared, not applied

`supabase/migrations/20261107203000_price_index_integrity_repair.sql` with
`supabase/migrations/rollback/20261107203000_price_index_integrity_repair_rollback.sql`.

The migration snapshots every touched row into `price_index_repair_snapshot` before changing it, fixes numeric units, quarantines impossible same-product spreads instead of deleting them, recounts `supporting_submissions` from approved `price_submissions` (guarded by `to_regclass`), and deactivates index rows below the three-price gate. Rollback restores all touched rows and keeps the snapshot as the audit trail.

It is **not applied**: writes need the service-role key, which this workspace does not hold, and deactivating unsupported index rows changes what customers see, so it needs a staging run first.

## 6. Tool register

| Route                                     | Page / engine                             | Suite      | Verdict                                     |
| ----------------------------------------- | ----------------------------------------- | ---------- | ------------------------------------------- |
| `/unit-converter`                         | UnitConverter.tsx                         | yes        | Engine verified — priced output provisional |
| `/german-floor-calculator`                | GermanFloorCalculator.tsx                 | yes        | Engine verified — priced output provisional |
| `/fence-block-calculator`                 | FenceBlockCalculator.tsx                  | yes        | Engine verified — priced output provisional |
| `/window-blind-calculator`                | shared engine page                        | page suite | Engine covered by page/shared suites        |
| `/wallpaper-calculator`                   | WallpaperCalculator.tsx                   | yes        | Engine verified — priced output provisional |
| `/paint-calculator`                       | PaintCalculator.tsx                       | yes        | Engine verified — priced output provisional |
| `/paint-comparison`                       | PaintComparison.tsx                       | yes        | Engine verified — priced output provisional |
| `/screeding-calculator`                   | ScreedingCalculator.tsx                   | yes        | Engine verified — priced output provisional |
| `/finish-estimator`                       | FinishEstimator.tsx                       | yes        | Engine verified — priced output provisional |
| `/pop-ceiling-calculator`                 | PopCeilingCalculator.tsx                  | yes        | Engine verified — priced output provisional |
| `/tile-calculator`                        | TileCalculator.tsx                        | yes        | Engine verified — priced output provisional |
| `/increte-flooring-calculator`            | shared engine page                        | page suite | Engine covered by page/shared suites        |
| `/flooring`                               | FlooringEstimator.tsx                     | yes        | Engine verified — priced output provisional |
| `/waterproofing`                          | WaterproofingEstimator.tsx                | yes        | Engine verified — priced output provisional |
| `/wall-finish-estimator`                  | WallFinishEstimator.tsx                   | page suite | Engine covered by page/shared suites        |
| `/masonry-calculator`                     | shared: masonry-standalone-engine         | yes        | Engine verified — priced output provisional |
| `/plastering-calculator`                  | shared: plastering-standalone-engine      | yes        | Engine verified — priced output provisional |
| `/drywall-calculator`                     | shared: drywall-standalone-engine         | yes        | Engine verified — priced output provisional |
| `/paving-calculator`                      | shared: paving-standalone-engine          | yes        | Engine verified — priced output provisional |
| `/drainage-calculator`                    | shared: drainage-standalone-engine        | yes        | Engine verified — priced output provisional |
| `/septic-sizing-calculator`               | shared: septic                            | page suite | Engine covered by page/shared suites        |
| `/temporary-works-calculator`             | shared: temporary-works-standalone-engine | yes        | Engine verified — priced output provisional |
| `/insulation-calculator`                  | shared: insulation-standalone-engine      | yes        | Engine verified — priced output provisional |
| `/demolition-calculator`                  | shared: demolition-standalone-engine      | yes        | Engine verified — priced output provisional |
| `/blueprint-takeoff`                      | BlueprintTakeoff.tsx                      | page suite | Engine covered by page/shared suites        |
| `/mathematical-plan-elevation`            | MathematicalPlanElevation.tsx             | yes        | Engine verified — priced output provisional |
| `/build-to-roof-estimator`                | BuildToRoofEstimator.tsx                  | yes        | Engine verified — priced output provisional |
| `/structural-calculator`                  | StructuralCalculator.tsx                  | yes        | Engine verified — priced output provisional |
| `/earthworks-cut-fill`                    | shared engine page                        | page suite | Engine covered by page/shared suites        |
| `/roof-framing-calculator`                | shared engine page                        | page suite | Engine covered by page/shared suites        |
| `/foundation-calculator`                  | FoundationCalculator.tsx                  | yes        | Engine verified — priced output provisional |
| `/retaining-wall-calculator`              | shared engine page                        | page suite | Engine covered by page/shared suites        |
| `/rainwater-gutter-soffit-cost-estimator` | shared engine page                        | page suite | Engine covered by page/shared suites        |
| `/diaspora-budget-tracker`                | DiasporaBudgetTracker.tsx                 | page suite | Engine covered by page/shared suites        |
| `/electrical-conduit-wiring-estimator`    | shared engine page                        | page suite | Engine covered by page/shared suites        |
| `/structural-steel-i-beam-calculator`     | shared engine page                        | page suite | Engine covered by page/shared suites        |
| `/foundation`                             | FoundationCalculator.tsx                  | yes        | Engine verified — priced output provisional |
| `/reinforcement`                          | ReinforcementEstimator.tsx                | yes        | Engine verified — priced output provisional |
| `/electrical`                             | ElectricalEstimator.tsx                   | yes        | Engine verified — priced output provisional |
| `/plumbing`                               | PlumbingEstimator.tsx                     | yes        | Engine verified — priced output provisional |
| `/solar-pv-estimator`                     | SolarPvEstimator.tsx                      | yes        | Engine verified — priced output provisional |
| `/generator`                              | GeneratorEstimator.tsx                    | yes        | Engine verified — priced output provisional |
| `/heat-comfort`                           | HeatComfort.tsx                           | yes        | Engine verified — priced output provisional |
| `/material-price-index`                   | MaterialPriceIndex.tsx                    | yes        | Engine verified — priced output provisional |
| `/material-advisor`                       | MaterialAdvisor.tsx                       | yes        | Engine verified — priced output provisional |
| `/doors-windows`                          | DoorsWindowsEstimator.tsx                 | yes        | Engine verified — priced output provisional |
| `/boq-generator`                          | BoqGenerator.tsx                          | yes        | Engine verified — priced output provisional |
| `/labour-estimator`                       | LabourEstimator.tsx                       | yes        | Engine verified — priced output provisional |
| `/margin-calculator`                      | MarginCalculator.tsx                      | yes        | Engine verified — priced output provisional |
| `/cash-flow-timeline`                     | CashFlowTimeline.tsx                      | yes        | Engine verified — priced output provisional |
| `/regional-cost-index`                    | RegionalCostIndex.tsx                     | yes        | Engine verified — priced output provisional |
| `/project-timeline`                       | ProjectTimeline.tsx                       | yes        | Engine verified — priced output provisional |
| `/construction-sequence`                  | ConstructionSequence.tsx                  | yes        | Engine verified — priced output provisional |
| `/maintenance-planner`                    | MaintenancePlanner.tsx                    | yes        | Engine verified — priced output provisional |
| `/global-site-safety-estimator`           | GlobalSiteSafetyEstimator.tsx             | yes        | Engine verified — priced output provisional |
| `/warranty-certificate`                   | WarrantyCertificate.tsx                   | yes        | Engine verified — priced output provisional |
| `/contractor-credit`                      | ContractorCredit.tsx                      | yes        | Engine verified — priced output provisional |
| `/carbon-footprint`                       | CarbonFootprint.tsx                       | yes        | Engine verified — priced output provisional |
| `/circular-reuse`                         | CircularReuse.tsx                         | yes        | Engine verified — priced output provisional |
| `/image-estimator`                        | ImageEstimator.tsx                        | yes        | Engine verified — priced output provisional |
| `/smart-calculator`                       | SmartCalculator.tsx                       | yes        | Engine verified — priced output provisional |
| `/conversational-estimator`               | ConversationalEstimator.tsx               | yes        | Engine verified — priced output provisional |
| `/count-vision`                           | CountVision.tsx                           | yes        | Engine verified — priced output provisional |
| `/ai-color-assistant`                     | AiColorAssistant.tsx                      | yes        | Engine verified — priced output provisional |
| `/color-preview`                          | ColorPreview.tsx                          | yes        | Engine verified — priced output provisional |
| `/surface-assessment`                     | SurfaceAssessment.tsx                     | yes        | Engine verified — priced output provisional |
| `/estimate-refresh`                       | EstimateRefresh.tsx                       | yes        | Engine verified — priced output provisional |
| `/defect-diagnosis`                       | DefectDiagnosis.tsx                       | yes        | Engine verified — priced output provisional |
| `/bim-ifc-import`                         | BimIfcImport.tsx                          | yes        | Engine verified — priced output provisional |
| `/field-sync`                             | FieldSync.tsx                             | yes        | Engine verified — priced output provisional |
| `/material-prices`                        | MaterialPrices.tsx                        | yes        | Engine verified — priced output provisional |
| `/screeding-cost-estimator`               | ScreedingCostEstimator.tsx                | yes        | Engine verified — priced output provisional |
| `/cost-estimator`                         | CostEstimator.tsx                         | yes        | Engine verified — priced output provisional |
| `/tv-console-calculator`                  | TvConsoleCalculator.tsx                   | yes        | Engine verified — priced output provisional |
| `/borehole-water-system-estimator`        | BoreholeWaterSystemEstimator.tsx          | yes        | Engine verified — priced output provisional |
| `/water-tower-staging-estimator`          | shared engine page                        | page suite | Engine covered by page/shared suites        |
| `/quote-check`                            | QuoteCheck.tsx                            | yes        | Engine verified — priced output provisional |
| `/site-intelligence`                      | SiteIntelligence.tsx                      | yes        | Engine verified — priced output provisional |
| `/boq-studio`                             | BoqStudio.tsx                             | page suite | Engine covered by page/shared suites        |
| `/document-studio`                        | DocumentStudio.tsx                        | page suite | Engine covered by page/shared suites        |
| `/price-submission`                       | shared engine page                        | page suite | Engine covered by page/shared suites        |
| `/supplier-directory`                     | shared engine page                        | page suite | Engine covered by page/shared suites        |
