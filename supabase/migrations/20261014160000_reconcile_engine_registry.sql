-- ============================================================
-- FRELUX: Engine registry reconciliation (2026-10-13, P0)
--
-- The comprehensive_engine_inventory audit found 54 real engines;
-- the canonical capability registry (and this table's CHECK
-- constraint) only allowed 34. The code registry now carries all
-- 54 canonical ids; this migration widens the CHECK so admin
-- configuration rows can reference every real engine.
--
-- Integrity fix (honest-status rule): the engine_market_support_matrix
-- rows for 19 of the 20 newly registered engines were seeded with a
-- boilerplate "Fully internationalized and verified..." note marking
-- every non-NG market "verified" without per-market evidence. Per the
-- internationalization mandate (no green statuses without evidence),
-- those rows are downgraded to "requires_verification". NG rows keep
-- "verified" (the engines are implemented and NG-tested). fence rows
-- keep their differentiated evidence-based statuses untouched.
-- ============================================================

ALTER TABLE market_calculator_config
  DROP CONSTRAINT IF EXISTS market_calculator_config_calculator_type_check;

ALTER TABLE market_calculator_config
  ADD CONSTRAINT market_calculator_config_calculator_type_check
  CHECK (calculator_type = ANY (ARRAY[
    'painting','screeding','pop_ceiling','tile','wall_finishing','tyrolene',
    'grafitex','mineral_stone','stucco','flooring','waterproofing',
    'doors_windows','block','roofing','build_to_roof','foundation',
    'structural','reinforcement','electrical','plumbing','generator',
    'solar_pv','heat_comfort','cost_estimator','labour_estimator',
    'margin_calculator','boq_generator','sequence','ai_image_estimator',
    'ai_color_assistant','conversational_estimator','count_vision',
    'defect_diagnosis','surface_assessment',
    'regional_cost','cash_flow','contractor_credit','circular_reuse',
    'embodied_carbon','estimate_refresh','maintenance','price_forecast',
    'warranty_dispute','fence','roof_geometry','roof_plan_scanner',
    'space_measurement','measurement_confidence','measurement_explanation',
    'quotation_generator','offline_field','learning_engine',
    'price_validator','market_crawler'
  ]::text[]));

-- Honest-status correction: downgrade evidence-free "verified" rows.
UPDATE engine_market_support_matrix
SET status = 'requires_verification',
    notes = 'Engine is implemented and NG-tested; per-market currency, tax, typology, unit and price-basis evidence not yet verified (reconciliation 2026-10-13).'
WHERE engine_id IN (
  'regional_cost','cash_flow','contractor_credit','circular_reuse',
  'embodied_carbon','estimate_refresh','maintenance','price_forecast',
  'warranty_dispute','roof_geometry','roof_plan_scanner','space_measurement',
  'measurement_confidence','measurement_explanation','quotation_generator',
  'offline_field','learning_engine','price_validator','market_crawler'
)
AND market_code <> 'NG'
AND status = 'verified'
AND notes LIKE 'Fully internationalized and verified%';



-- Mirror the 20 new canonical engines into the DB registry (FK target for
-- engine_capability_verified). Names/categories/portability match
-- capability-registry.ts exactly.
INSERT INTO engine_capabilities (engine_id, name, category, deterministic, portability, evidence)
VALUES
  ('regional_cost', 'Regional Cost Engine', 'costing', true, 'market_method', 'Source-audit reconciliation 2026-10-13 (NG implemented and tested; non-NG requires verification)'),
  ('cash_flow', 'Cash Flow & Financial Forecasting Engine', 'costing', true, 'market_method', 'Source-audit reconciliation 2026-10-13 (NG implemented and tested; non-NG requires verification)'),
  ('contractor_credit', 'Contractor Credit Engine', 'costing', true, 'market_method', 'Source-audit reconciliation 2026-10-13 (NG implemented and tested; non-NG requires verification)'),
  ('circular_reuse', 'Circular Reuse Engine', 'costing', true, 'market_method', 'Source-audit reconciliation 2026-10-13 (NG implemented and tested; non-NG requires verification)'),
  ('embodied_carbon', 'Embodied Carbon Engine', 'costing', true, 'market_method', 'Source-audit reconciliation 2026-10-13 (NG implemented and tested; non-NG requires verification)'),
  ('estimate_refresh', 'Estimate Refresh Engine', 'costing', true, 'market_method', 'Source-audit reconciliation 2026-10-13 (NG implemented and tested; non-NG requires verification)'),
  ('maintenance', 'Maintenance & Warranty Engine', 'costing', true, 'market_method', 'Source-audit reconciliation 2026-10-13 (NG implemented and tested; non-NG requires verification)'),
  ('price_forecast', 'Price Forecast Engine', 'costing', true, 'market_method', 'Source-audit reconciliation 2026-10-13 (NG implemented and tested; non-NG requires verification)'),
  ('warranty_dispute', 'Warranty & Dispute Engine', 'costing', true, 'market_method', 'Source-audit reconciliation 2026-10-13 (NG implemented and tested; non-NG requires verification)'),
  ('fence', 'Fencing & External Works Engine', 'structure', true, 'market_method', 'Source-audit reconciliation 2026-10-13 (NG implemented and tested; non-NG requires verification)'),
  ('roof_geometry', 'Roof Geometry Engine', 'structure', true, 'portable', 'Source-audit reconciliation 2026-10-13 (NG implemented and tested; non-NG requires verification)'),
  ('roof_plan_scanner', 'Roof Plan Scanner', 'ai', false, 'portable', 'Source-audit reconciliation 2026-10-13 (NG implemented and tested; non-NG requires verification)'),
  ('space_measurement', 'Space Measurement Engine', 'structure', true, 'portable', 'Source-audit reconciliation 2026-10-13 (NG implemented and tested; non-NG requires verification)'),
  ('measurement_confidence', 'Measurement Confidence Engine', 'ai', true, 'portable', 'Source-audit reconciliation 2026-10-13 (NG implemented and tested; non-NG requires verification)'),
  ('measurement_explanation', 'Measurement Explanation Engine', 'ai', true, 'portable', 'Source-audit reconciliation 2026-10-13 (NG implemented and tested; non-NG requires verification)'),
  ('quotation_generator', 'Quotation Generator', 'costing', true, 'market_method', 'Source-audit reconciliation 2026-10-13 (NG implemented and tested; non-NG requires verification)'),
  ('offline_field', 'Offline Field Engine', 'costing', true, 'portable', 'Source-audit reconciliation 2026-10-13 (NG implemented and tested; non-NG requires verification)'),
  ('learning_engine', 'Learning & Predictive Intelligence Engine', 'ai', false, 'market_method', 'Source-audit reconciliation 2026-10-13 (NG implemented and tested; non-NG requires verification)'),
  ('price_validator', 'Price Validator', 'ai', true, 'market_method', 'Source-audit reconciliation 2026-10-13 (NG implemented and tested; non-NG requires verification)'),
  ('market_crawler', 'Market Crawler & Price Scanning Engine', 'ai', true, 'market_method', 'Source-audit reconciliation 2026-10-13 (NG implemented and tested; non-NG requires verification)')
ON CONFLICT (engine_id) DO NOTHING;

-- Seed the 20 newly canonical engines as NG-verified (implemented and
-- NG-tested; matches capability-registry.ts verifiedMarkets).
INSERT INTO engine_capability_verified (engine_id, market_code) VALUES
  ('regional_cost', 'NG'),
  ('cash_flow', 'NG'),
  ('contractor_credit', 'NG'),
  ('circular_reuse', 'NG'),
  ('embodied_carbon', 'NG'),
  ('estimate_refresh', 'NG'),
  ('maintenance', 'NG'),
  ('price_forecast', 'NG'),
  ('warranty_dispute', 'NG'),
  ('fence', 'NG'),
  ('roof_geometry', 'NG'),
  ('roof_plan_scanner', 'NG'),
  ('space_measurement', 'NG'),
  ('measurement_confidence', 'NG'),
  ('measurement_explanation', 'NG'),
  ('quotation_generator', 'NG'),
  ('offline_field', 'NG'),
  ('learning_engine', 'NG'),
  ('price_validator', 'NG'),
  ('market_crawler', 'NG')
ON CONFLICT (engine_id, market_code) DO NOTHING;


-- Seed availability config rows from the (now updated) verified pairs, same
-- idempotent pattern as 20261014130000. This makes the 20 new engines
-- resolvable as enabled for NG (their only verified market).
INSERT INTO market_calculator_config (market_code, calculator_type, is_available, config, labels)
SELECT v.market_code, v.engine_id, true, '{}'::jsonb, '{}'::jsonb
FROM engine_capability_verified v
ON CONFLICT (market_code, calculator_type) DO NOTHING;

-- Verification: expect 54 types allowed and 19x19 rows downgraded.
