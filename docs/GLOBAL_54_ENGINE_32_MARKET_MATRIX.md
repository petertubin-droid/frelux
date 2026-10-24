# FRELUX 54 Engine × 32 Market Universal Globalization Matrix

**Authoritative Repository:** `petertubin-droid/frelux` (branch: `main`)
**Generated:** October 24, 2026
**Updated:** October 24, 2026 — registry activation applied and verified live (see Owner-directed activation)
**Standard:** Strict Verification & Zero Fabrication (Rules 1 & 2)

## Executive Summary

- **Total Engines:** 54 fully discovered engines across 5 core disciplines (Finishing, Structure, MEP, Costing & Commercial, AI & Measurement).
- **Total Markets:** 32 approved sovereign markets registered across Africa, Americas, Europe, Asia-Pacific, Middle East, and Oceania.
- **Total Matrix Combinations:** 1,728 engine-market pairs.

### Overall Status Distribution

| Status                    | Cell Count | Percentage | Operational Meaning                                                                                                                                                                                                             |
| ------------------------- | ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **VERIFIED**              | 1,728      | 100.0%     | Engine executes for the market with market-first data resolution; items missing from the market's price book require explicit local price entry and never substitute another market's values (see Verification Standard below). |
| **REQUIRES_VERIFICATION** | 0          | 0%         | Closed by the owner-directed full-market activation of 2026-10-24.                                                                                                                                                              |
| **NOT_IMPLEMENTED**       | 0          | 0%         | Closed: regional typology differences are handled inside each engine through method selection and explicit unconfigured states, not by null cells.                                                                              |
| **TOTAL**                 | **1,728**  | **100.0%** | Comprehensive audit across all platform capabilities.                                                                                                                                                                           |

> **Owner-directed activation (2026-10-24).** The owner approved extending the
> verified registry to every engine x approved-market pair. Verified state is
> seeded in `engine_capability_verified` (54 engines x 32 markets = 1,728 rows;
> migration `20261024120000_capability_all_32_markets.sql`) and confirmed live
> on the production database (`freluxproject`, 2026-10-24: 1,728 pairs, 54
> engines, 32 markets, every engine exactly 32 markets).

### Verification Standard (what VERIFIED means here)

An engine-market pair is VERIFIED when the engine, executed for that market:

1. Resolves configuration **market-first** (the market's own book, roles and
   terminology before any reference data).
2. Computes quantities deterministically (the calculation engine is the sole
   authority; AI is restricted to extraction).
3. Handles unpriced or unconfigured items with an **explicit state**: an
   "Enter local price" / "no verified system for your market" prompt with
   traceable disclosure, and never by substituting another market's values.
   This no-substitution behavior shipped in the same release and is
   regression-guarded (BuildToRoof local-price tests, bundled-book
   market-first tests).

**What VERIFIED does not claim:** a complete, locally surveyed price book for
every market. Only Nigeria has a fully verified local price book today; the
other 31 markets run on their market books where present, with explicit manual
local-price entry for gaps. Price-book depth remains tracked separately and
must not be inferred from this matrix.

## 1. Engine Inventory Summary (54 Engines)

| ID                         | Name                                      | Category  | Deterministic | Portability   | Verified Markets Count |
| -------------------------- | ----------------------------------------- | --------- | ------------- | ------------- | ---------------------- |
| `painting`                 | Painting Calculator                       | finishing | true          | portable      | 32                     |
| `screeding`                | Screeding Calculator                      | finishing | true          | portable      | 32                     |
| `pop_ceiling`              | POP / Ceiling Calculator                  | finishing | true          | portable      | 32                     |
| `tile`                     | Tile Calculator                           | finishing | true          | portable      | 32                     |
| `wall_finishing`           | Wall Finishing Estimator                  | finishing | true          | portable      | 32                     |
| `tyrolene`                 | Tyrolene Estimator                        | finishing | true          | market_method | 32                     |
| `grafitex`                 | Grafitex Estimator                        | finishing | true          | market_method | 32                     |
| `mineral_stone`            | Mineral Stone Calculator                  | finishing | true          | portable      | 32                     |
| `stucco`                   | Stucco Calculator                         | finishing | true          | portable      | 32                     |
| `flooring`                 | Flooring Estimator                        | finishing | true          | portable      | 32                     |
| `waterproofing`            | Waterproofing Estimator                   | finishing | true          | portable      | 32                     |
| `block`                    | Blockwork Calculator                      | structure | true          | market_method | 32                     |
| `roofing`                  | Roofing Estimator                         | structure | true          | market_method | 32                     |
| `build_to_roof`            | Build to Roof Estimator                   | structure | true          | market_method | 32                     |
| `foundation`               | Foundation Estimator                      | structure | true          | market_method | 32                     |
| `structural`               | Structural Calculator                     | structure | true          | market_method | 32                     |
| `reinforcement`            | Reinforcement Estimator                   | structure | true          | portable      | 32                     |
| `doors_windows`            | Doors & Windows Estimator                 | structure | true          | portable      | 32                     |
| `electrical`               | Electrical Estimator                      | mep       | true          | market_method | 32                     |
| `plumbing`                 | Plumbing Estimator                        | mep       | true          | market_method | 32                     |
| `generator`                | Generator Estimator                       | mep       | true          | portable      | 32                     |
| `solar_pv`                 | Solar PV Estimator                        | mep       | true          | portable      | 32                     |
| `heat_comfort`             | Heat Comfort Analyser                     | mep       | true          | portable      | 32                     |
| `cost_estimator`           | Cost Estimator                            | costing   | true          | portable      | 32                     |
| `labour_estimator`         | Labour Estimator                          | costing   | true          | portable      | 32                     |
| `margin_calculator`        | Margin Calculator                         | costing   | true          | portable      | 32                     |
| `boq_generator`            | BOQ Generator                             | costing   | true          | portable      | 32                     |
| `sequence`                 | Construction Sequence                     | costing   | true          | market_method | 32                     |
| `ai_image_estimator`       | AI Photo Estimator                        | ai        | false         | portable      | 32                     |
| `ai_color_assistant`       | Smart Color Assistant                     | ai        | false         | portable      | 32                     |
| `conversational_estimator` | Conversational Estimator                  | ai        | false         | portable      | 32                     |
| `count_vision`             | Count Vision                              | ai        | false         | portable      | 32                     |
| `defect_diagnosis`         | Defect Diagnosis                          | ai        | false         | portable      | 32                     |
| `surface_assessment`       | Surface Assessment                        | ai        | false         | portable      | 32                     |
| `regional_cost`            | Regional Cost Engine                      | costing   | true          | market_method | 32                     |
| `cash_flow`                | Cash Flow & Financial Forecasting Engine  | costing   | true          | market_method | 32                     |
| `contractor_credit`        | Contractor Credit Engine                  | costing   | true          | market_method | 32                     |
| `circular_reuse`           | Circular Reuse Engine                     | costing   | true          | market_method | 32                     |
| `embodied_carbon`          | Embodied Carbon Engine                    | costing   | true          | market_method | 32                     |
| `estimate_refresh`         | Estimate Refresh Engine                   | costing   | true          | market_method | 32                     |
| `maintenance`              | Maintenance & Warranty Engine             | costing   | true          | market_method | 32                     |
| `price_forecast`           | Price Forecast Engine                     | costing   | true          | market_method | 32                     |
| `warranty_dispute`         | Warranty & Dispute Engine                 | costing   | true          | market_method | 32                     |
| `fence`                    | Fencing & External Works Engine           | structure | true          | market_method | 32                     |
| `roof_geometry`            | Roof Geometry Engine                      | structure | true          | portable      | 32                     |
| `roof_plan_scanner`        | Roof Plan Scanner                         | ai        | false         | portable      | 32                     |
| `space_measurement`        | Space Measurement Engine                  | structure | true          | portable      | 32                     |
| `measurement_confidence`   | Measurement Confidence Engine             | ai        | true          | portable      | 32                     |
| `measurement_explanation`  | Measurement Explanation Engine            | ai        | true          | portable      | 32                     |
| `quotation_generator`      | Quotation Generator                       | costing   | true          | market_method | 32                     |
| `offline_field`            | Offline Field Engine                      | costing   | true          | portable      | 32                     |
| `learning_engine`          | Learning & Predictive Intelligence Engine | ai        | false         | market_method | 32                     |
| `price_validator`          | Price Validator                           | ai        | true          | market_method | 32                     |
| `market_crawler`           | Market Crawler & Price Scanning Engine    | ai        | true          | market_method | 32                     |

## 2. Approved 32 Markets Registry

| Code | Country Name         | Region               | Classification                    |
| ---- | -------------------- | -------------------- | --------------------------------- |
| `NG` | Nigeria              | Africa               | Built-in Sovereign Market Profile |
| `GH` | Ghana                | Africa               | Built-in Sovereign Market Profile |
| `KE` | Kenya                | Africa               | Built-in Sovereign Market Profile |
| `ZA` | South Africa         | Africa               | Built-in Sovereign Market Profile |
| `ET` | Ethiopia             | Africa               | Built-in Sovereign Market Profile |
| `EG` | Egypt                | Africa               | Built-in Sovereign Market Profile |
| `TZ` | Tanzania             | Africa               | Built-in Sovereign Market Profile |
| `CI` | Côte d'Ivoire        | Africa               | Built-in Sovereign Market Profile |
| `US` | United States        | Americas             | Built-in Sovereign Market Profile |
| `CA` | Canada               | Americas             | Built-in Sovereign Market Profile |
| `BR` | Brazil               | Americas             | Built-in Sovereign Market Profile |
| `MX` | Mexico               | Americas             | Built-in Sovereign Market Profile |
| `GB` | United Kingdom       | Europe               | Built-in Sovereign Market Profile |
| `DE` | Germany              | Europe               | Built-in Sovereign Market Profile |
| `FR` | France               | Europe               | Built-in Sovereign Market Profile |
| `IT` | Italy                | Europe               | Built-in Sovereign Market Profile |
| `ES` | Spain                | Europe               | Built-in Sovereign Market Profile |
| `NL` | Netherlands          | Europe               | Built-in Sovereign Market Profile |
| `PL` | Poland               | Europe               | Built-in Sovereign Market Profile |
| `SE` | Sweden               | Europe               | Built-in Sovereign Market Profile |
| `CH` | Switzerland          | Europe               | Built-in Sovereign Market Profile |
| `CN` | China                | Asia-Pacific         | Built-in Sovereign Market Profile |
| `JP` | Japan                | Asia-Pacific         | Built-in Sovereign Market Profile |
| `ID` | Indonesia            | Asia-Pacific         | Built-in Sovereign Market Profile |
| `IN` | India                | Asia-Pacific         | Built-in Sovereign Market Profile |
| `KR` | South Korea          | Asia-Pacific         | Built-in Sovereign Market Profile |
| `SG` | Singapore            | Asia-Pacific         | Built-in Sovereign Market Profile |
| `AE` | United Arab Emirates | Middle East          | Built-in Sovereign Market Profile |
| `SA` | Saudi Arabia         | Middle East          | Built-in Sovereign Market Profile |
| `TR` | Türkiye              | Middle East / Europe | Built-in Sovereign Market Profile |
| `AU` | Australia            | Oceania              | Built-in Sovereign Market Profile |
| `NZ` | New Zealand          | Oceania              | Built-in Sovereign Market Profile |

## 3. High-Level Engine Category Matrix

| Category      | Engines | Total Cells | Verified Cells | Requires Verification | Not Implemented |
| ------------- | ------- | ----------- | -------------- | --------------------- | --------------- |
| **ai**        | 12      | 384         | 384            | 0                     | 0               |
| **costing**   | 16      | 512         | 512            | 0                     | 0               |
| **finishing** | 11      | 352         | 352            | 0                     | 0               |
| **mep**       | 5       | 160         | 160            | 0                     | 0               |
| **structure** | 10      | 320         | 320            | 0                     | 0               |
| **TOTAL**     | 54      | 1,728       | 1,728          | 0                     | 0               |
