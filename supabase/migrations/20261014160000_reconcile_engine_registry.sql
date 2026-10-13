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

-- Verification: expect 54 types allowed and 19x19 rows downgraded.
