# FRELUX Engine Dependency Graph (auto-generated 2026-10-13, P0)

Consumer map for all 54 canonical engines. Importers include src/lib, src/pages,
src/components and netlify/functions; key consumers column filters to user-facing
pages/components/serverless. Engines consumed via barrel re-exports are matched by
module-symbol fallback. Re-run the generator when engines or wiring change.

| Engine | Importers (all) | Key page/component/serverless consumers |
|---|---|---|
| ai_color_assistant | 1 | src/components/ui/PaintMatcher.tsx |
| ai_image_estimator | 1 |  |
| block | 15 | src/components/home/InteractiveEstimatePreview.tsx, src/pages/BuildToRoofEstimator.tsx, src/pages/CostEstimator.tsx, src/pages/FinishEstimator.tsx, src/pages/ImageEstimator.tsx, src/pages/PaintCalculator.tsx |
| boq_generator | 1 | src/pages/BoqGenerator.tsx |
| build_to_roof | 4 | src/pages/BuildToRoofEstimator.tsx, src/pages/ImageEstimator.tsx |
| cash_flow | 1 | src/pages/CashFlowTimeline.tsx |
| circular_reuse | 1 | src/pages/CircularReuse.tsx |
| contractor_credit | 1 | src/pages/ContractorCredit.tsx |
| conversational_estimator | 1 | src/pages/ConversationalEstimator.tsx |
| cost_estimator | 4 | src/pages/PaintingEstimator.tsx, src/pages/RegionalCostIndex.tsx, src/pages/TyroleneEstimator.tsx, src/pages/admin/AdminPaintEngineTest.tsx |
| count_vision | 3 | src/pages/CountVision.tsx, src/pages/admin/AdminCountVision.tsx |
| defect_diagnosis | 1 | src/pages/DefectDiagnosis.tsx |
| doors_windows | 1 | src/pages/DoorsWindowsEstimator.tsx |
| electrical | 1 | src/pages/ElectricalEstimator.tsx |
| embodied_carbon | 1 | src/pages/CarbonFootprint.tsx |
| estimate_refresh | 1 | src/pages/EstimateRefresh.tsx |
| fence | 4 |  |
| flooring | 1 | src/pages/FlooringEstimator.tsx |
| foundation | 2 | src/pages/FoundationCalculator.tsx, src/pages/FoundationEstimator.tsx |
| generator | 1 | src/pages/GeneratorEstimator.tsx |
| grafitex | 2 | src/pages/TyroleneEstimator.tsx |
| heat_comfort | 1 | src/pages/HeatComfort.tsx |
| labour_estimator | 1 | src/pages/LabourEstimator.tsx |
| learning_engine | 10 | src/components/project-agent/ProjectAgentPanel.tsx |
| maintenance | 1 | src/pages/MaintenancePlanner.tsx |
| margin_calculator | 1 | src/pages/MarginCalculator.tsx |
| market_crawler | 4 | src/pages/admin/AdminMarketIntelligence.tsx |
| measurement_confidence | 11 |  |
| measurement_explanation | 4 |  |
| mineral_stone | 1 | src/pages/ConfigurableFinishCalculator.tsx |
| offline_field | 2 | src/pages/FieldSync.tsx, src/pages/admin/AdminFieldSync.tsx |
| painting | 3 | src/pages/PaintCalculator.tsx, src/pages/PaintingEstimator.tsx, src/pages/admin/AdminPaintEngineTest.tsx |
| plumbing | 2 | src/pages/PlumbingEstimator.tsx, src/pages/admin/AdminMarkets.tsx |
| pop_ceiling | 4 | src/pages/PopCeilingCalculator.tsx, src/pages/PopCeilingCostEstimator.tsx, src/pages/TileCalculator.tsx, src/pages/TileCostEstimator.tsx |
| price_forecast | 1 | src/components/estimation/MaterialPriceForecast.tsx |
| price_validator | 1 | src/pages/admin/AdminPriceUpdater.tsx |
| quotation_generator | 1 |  |
| regional_cost | 1 | src/pages/RegionalCostIndex.tsx |
| reinforcement | 1 | src/pages/ReinforcementEstimator.tsx |
| roof_geometry | 2 | src/components/roof-view/RoofGeometryEditor.tsx, src/pages/BuildToRoofEstimator.tsx |
| roof_plan_scanner | 4 |  |
| roofing | 1 |  |
| screeding | 116 | src/components/MarketScopeNotice.tsx, src/components/admin/AdminLayout.tsx, src/components/calculators/SaveToProjectButton.tsx, src/components/contractor/ProjectWizard.tsx, src/components/contractor/RoomBuilder.tsx, src/components/copilot/CopilotWidget.tsx |
| sequence | 1 | src/pages/ConstructionSequence.tsx |
| solar_pv | 1 | src/pages/SolarPvEstimator.tsx |
| space_measurement | 3 |  |
| structural | 5 | src/pages/BuildToRoofEstimator.tsx, src/pages/FoundationEstimator.tsx, src/pages/PlumbingEstimator.tsx, src/pages/ReinforcementEstimator.tsx, src/pages/StructuralCalculator.tsx |
| stucco | 1 | src/pages/ConfigurableFinishCalculator.tsx |
| surface_assessment | 1 | src/components/estimation/ConstructionExtractionPanel.tsx |
| tile | 4 | src/pages/PopCeilingCalculator.tsx, src/pages/PopCeilingCostEstimator.tsx, src/pages/TileCalculator.tsx, src/pages/TileCostEstimator.tsx |
| tyrolene | 2 | src/pages/TyroleneEstimator.tsx |
| wall_finishing | 1 | src/pages/RegionalCostIndex.tsx |
| warranty_dispute | 1 | src/pages/WarrantyCertificate.tsx |
| waterproofing | 1 | src/pages/WaterproofingEstimator.tsx |

## Zero-importer engines (dead-code or non-import wiring candidates): none
