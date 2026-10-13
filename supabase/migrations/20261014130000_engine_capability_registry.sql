-- =========================================================
-- 20-market capability registry, seed + integrity checks
-- Generated from src/lib/international/capability-registry.ts
-- (single source of truth; enforced by migration-sync test)
-- Idempotent: re-running changes nothing. Admin-disabled
-- rows and admin config are preserved (ON CONFLICT DO NOTHING).
-- =========================================================

-- 1. Widen the calculator_type CHECK to the canonical engine list
ALTER TABLE market_calculator_config
  DROP CONSTRAINT IF EXISTS market_calculator_config_calculator_type_check;
ALTER TABLE market_calculator_config
  ADD CONSTRAINT market_calculator_config_calculator_type_check
  CHECK (calculator_type IN (
    'painting',
    'screeding',
    'pop_ceiling',
    'tile',
    'wall_finishing',
    'tyrolene',
    'grafitex',
    'mineral_stone',
    'stucco',
    'flooring',
    'waterproofing',
    'block',
    'roofing',
    'build_to_roof',
    'foundation',
    'structural',
    'reinforcement',
    'doors_windows',
    'electrical',
    'plumbing',
    'generator',
    'solar_pv',
    'heat_comfort',
    'cost_estimator',
    'labour_estimator',
    'margin_calculator',
    'boq_generator',
    'sequence',
    'ai_image_estimator',
    'ai_color_assistant',
    'conversational_estimator',
    'count_vision',
    'defect_diagnosis',
    'surface_assessment'
  ));

-- 2. Canonical engine registry tables (admin visibility + SQL
--    integrity checks; the runtime registry in
--    capability-registry.ts remains the authoritative logic)
CREATE TABLE IF NOT EXISTS engine_capabilities (
  engine_id text PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL,
  deterministic boolean NOT NULL,
  portability text NOT NULL,
  evidence text NOT NULL,
  registry_version text NOT NULL DEFAULT '1.0.0',
  seeded_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS engine_capability_verified (
  engine_id text NOT NULL REFERENCES engine_capabilities(engine_id) ON DELETE CASCADE,
  market_code text NOT NULL REFERENCES market_profiles(country_code) ON DELETE CASCADE,
  verified_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (engine_id, market_code)
);
ALTER TABLE engine_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE engine_capability_verified ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'engine_capabilities' AND policyname = 'engine_capabilities_public_read') THEN
    CREATE POLICY engine_capabilities_public_read ON engine_capabilities
      FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'engine_capability_verified' AND policyname = 'engine_capability_verified_public_read') THEN
    CREATE POLICY engine_capability_verified_public_read ON engine_capability_verified
      FOR SELECT TO anon, authenticated USING (true);
  END IF;
END $$;

-- 3. Seed the engine registry (idempotent upsert of metadata only)
INSERT INTO engine_capabilities (engine_id, name, category, deterministic, portability, evidence) VALUES
  ('painting', 'Painting Calculator', 'finishing', true, 'portable', 'Expansion phases 1–8: native wall/ceiling assemblies, market_material_roles mappings and active pricebook rows for all 15 markets (verified per-market product specs and prices, never cross-market substitutions).'),
  ('screeding', 'Screeding Calculator', 'finishing', true, 'portable', 'Expansion phases 1–8: native wall/ceiling assemblies, market_material_roles mappings and active pricebook rows for all 15 markets (verified per-market product specs and prices, never cross-market substitutions).'),
  ('pop_ceiling', 'POP / Ceiling Calculator', 'finishing', true, 'portable', 'Expansion phases 1–8: native wall/ceiling assemblies, market_material_roles mappings and active pricebook rows for all 15 markets (verified per-market product specs and prices, never cross-market substitutions).'),
  ('tile', 'Tile Calculator', 'finishing', true, 'portable', 'Expansion phases 1–8: native wall/ceiling assemblies, market_material_roles mappings and active pricebook rows for all 15 markets (verified per-market product specs and prices, never cross-market substitutions).'),
  ('wall_finishing', 'Wall Finishing Estimator', 'finishing', true, 'portable', 'Expansion phases 1–8: native wall/ceiling assemblies, market_material_roles mappings and active pricebook rows for all 15 markets (verified per-market product specs and prices, never cross-market substitutions).'),
  ('tyrolene', 'Tyrolene Estimator', 'finishing', true, 'market_method', 'Nigerian exterior finish product data (tyrolene machine finish).'),
  ('grafitex', 'Grafitex Estimator', 'finishing', true, 'market_method', 'Nigerian grafitex wall finish product data.'),
  ('mineral_stone', 'Mineral Stone Calculator', 'finishing', true, 'portable', 'Nigerian mineral stone product and application data.'),
  ('stucco', 'Stucco Calculator', 'finishing', true, 'portable', 'Nigerian stucco base/coat product data.'),
  ('flooring', 'Flooring Estimator', 'finishing', true, 'portable', 'Nigerian flooring material and labour data.'),
  ('waterproofing', 'Waterproofing Estimator', 'finishing', true, 'portable', 'Nigerian waterproofing product data.'),
  ('block', 'Blockwork Calculator', 'structure', true, 'market_method', 'Nigerian sandcrete blockwork quantities and prices.'),
  ('roofing', 'Roofing Estimator', 'structure', true, 'market_method', 'Nigerian roof systems (locally used profiles).'),
  ('build_to_roof', 'Build to Roof Estimator', 'structure', true, 'market_method', 'Nigerian foundation-to- roof masonry + reinforced concrete sequence (the canonical B2R engine).'),
  ('foundation', 'Foundation Estimator', 'structure', true, 'market_method', 'Nigerian strip/raft foundation takeoffs.'),
  ('structural', 'Structural Calculator', 'structure', true, 'market_method', 'Nigerian reinforced concrete element quantity takeoffs.'),
  ('reinforcement', 'Reinforcement Estimator', 'structure', true, 'portable', 'Nigerian rebar weight/bending data.'),
  ('doors_windows', 'Doors & Windows Estimator', 'structure', true, 'portable', 'Nigerian door/window product sizes and prices.'),
  ('electrical', 'Electrical Estimator', 'mep', true, 'market_method', 'Nigerian IEC-oriented wiring quantities and fittings.'),
  ('plumbing', 'Plumbing Estimator', 'mep', true, 'market_method', 'Nigerian PPR/PVC supply and drainage quantities.'),
  ('generator', 'Generator Estimator', 'mep', true, 'portable', 'Nigerian generator sizing and price data.'),
  ('solar_pv', 'Solar PV Estimator', 'mep', true, 'portable', 'Nigerian solar component sizing and prices.'),
  ('heat_comfort', 'Heat Comfort Analyser', 'mep', true, 'portable', 'Nigerian climate comfort model.'),
  ('cost_estimator', 'Cost Estimator', 'costing', true, 'portable', 'Nigerian BOQ cost lines and labour rates.'),
  ('labour_estimator', 'Labour Estimator', 'costing', true, 'portable', 'Nigerian labour rate book (market-scoped).'),
  ('margin_calculator', 'Margin Calculator', 'costing', true, 'portable', 'Pure arithmetic on market currency and costs; currency formatting per market profile.'),
  ('boq_generator', 'BOQ Generator', 'costing', true, 'portable', 'Nigerian BOQ templates and price lookups.'),
  ('sequence', 'Construction Sequence', 'costing', true, 'market_method', 'Nigerian construction sequence model.'),
  ('ai_image_estimator', 'AI Photo Estimator', 'ai', false, 'portable', 'Routes extracted dimensions into the NG-verified engines.'),
  ('ai_color_assistant', 'Smart Color Assistant', 'ai', false, 'portable', 'Colour advice only; consumption estimates route to the painting engine where verified.'),
  ('conversational_estimator', 'Conversational Estimator', 'ai', false, 'portable', 'Routes parsed requests into NG-verified engines.'),
  ('count_vision', 'Count Vision', 'ai', false, 'portable', 'Object counting from images; market-independent.'),
  ('defect_diagnosis', 'Defect Diagnosis', 'ai', false, 'portable', 'Diagnostic guidance; independent of pricing.'),
  ('surface_assessment', 'Surface Assessment', 'ai', false, 'portable', 'Surface condition assessment; independent of pricing.')
ON CONFLICT (engine_id) DO UPDATE SET
  name = EXCLUDED.name, category = EXCLUDED.category,
  deterministic = EXCLUDED.deterministic, portability = EXCLUDED.portability,
  evidence = EXCLUDED.evidence;

-- 4. Seed the verified pairs (idempotent)
INSERT INTO engine_capability_verified (engine_id, market_code) VALUES
  ('painting', 'NG'),
  ('painting', 'US'),
  ('painting', 'GB'),
  ('painting', 'CA'),
  ('painting', 'AU'),
  ('painting', 'DE'),
  ('painting', 'IN'),
  ('painting', 'GH'),
  ('painting', 'KE'),
  ('painting', 'ZA'),
  ('painting', 'JP'),
  ('painting', 'FR'),
  ('painting', 'BR'),
  ('painting', 'SA'),
  ('painting', 'AE'),
  ('screeding', 'NG'),
  ('screeding', 'US'),
  ('screeding', 'GB'),
  ('screeding', 'CA'),
  ('screeding', 'AU'),
  ('screeding', 'DE'),
  ('screeding', 'IN'),
  ('screeding', 'GH'),
  ('screeding', 'KE'),
  ('screeding', 'ZA'),
  ('screeding', 'JP'),
  ('screeding', 'FR'),
  ('screeding', 'BR'),
  ('screeding', 'SA'),
  ('screeding', 'AE'),
  ('pop_ceiling', 'NG'),
  ('pop_ceiling', 'US'),
  ('pop_ceiling', 'GB'),
  ('pop_ceiling', 'CA'),
  ('pop_ceiling', 'AU'),
  ('pop_ceiling', 'DE'),
  ('pop_ceiling', 'IN'),
  ('pop_ceiling', 'GH'),
  ('pop_ceiling', 'KE'),
  ('pop_ceiling', 'ZA'),
  ('pop_ceiling', 'JP'),
  ('pop_ceiling', 'FR'),
  ('pop_ceiling', 'BR'),
  ('pop_ceiling', 'SA'),
  ('pop_ceiling', 'AE'),
  ('tile', 'NG'),
  ('tile', 'US'),
  ('tile', 'GB'),
  ('tile', 'CA'),
  ('tile', 'AU'),
  ('tile', 'DE'),
  ('tile', 'IN'),
  ('tile', 'GH'),
  ('tile', 'KE'),
  ('tile', 'ZA'),
  ('tile', 'JP'),
  ('tile', 'FR'),
  ('tile', 'BR'),
  ('tile', 'SA'),
  ('tile', 'AE'),
  ('wall_finishing', 'NG'),
  ('wall_finishing', 'US'),
  ('wall_finishing', 'GB'),
  ('wall_finishing', 'CA'),
  ('wall_finishing', 'AU'),
  ('wall_finishing', 'DE'),
  ('wall_finishing', 'IN'),
  ('wall_finishing', 'GH'),
  ('wall_finishing', 'KE'),
  ('wall_finishing', 'ZA'),
  ('wall_finishing', 'JP'),
  ('wall_finishing', 'FR'),
  ('wall_finishing', 'BR'),
  ('wall_finishing', 'SA'),
  ('wall_finishing', 'AE'),
  ('tyrolene', 'NG'),
  ('grafitex', 'NG'),
  ('mineral_stone', 'NG'),
  ('stucco', 'NG'),
  ('flooring', 'NG'),
  ('waterproofing', 'NG'),
  ('block', 'NG'),
  ('roofing', 'NG'),
  ('build_to_roof', 'NG'),
  ('foundation', 'NG'),
  ('structural', 'NG'),
  ('reinforcement', 'NG'),
  ('doors_windows', 'NG'),
  ('electrical', 'NG'),
  ('plumbing', 'NG'),
  ('generator', 'NG'),
  ('solar_pv', 'NG'),
  ('heat_comfort', 'NG'),
  ('cost_estimator', 'NG'),
  ('labour_estimator', 'NG'),
  ('margin_calculator', 'NG'),
  ('margin_calculator', 'US'),
  ('margin_calculator', 'GB'),
  ('margin_calculator', 'CA'),
  ('margin_calculator', 'AU'),
  ('margin_calculator', 'DE'),
  ('margin_calculator', 'IN'),
  ('margin_calculator', 'GH'),
  ('margin_calculator', 'KE'),
  ('margin_calculator', 'ZA'),
  ('margin_calculator', 'JP'),
  ('margin_calculator', 'FR'),
  ('margin_calculator', 'BR'),
  ('margin_calculator', 'SA'),
  ('margin_calculator', 'AE'),
  ('boq_generator', 'NG'),
  ('sequence', 'NG'),
  ('ai_image_estimator', 'NG'),
  ('ai_color_assistant', 'NG'),
  ('ai_color_assistant', 'US'),
  ('ai_color_assistant', 'GB'),
  ('ai_color_assistant', 'CA'),
  ('ai_color_assistant', 'AU'),
  ('ai_color_assistant', 'DE'),
  ('ai_color_assistant', 'IN'),
  ('ai_color_assistant', 'GH'),
  ('ai_color_assistant', 'KE'),
  ('ai_color_assistant', 'ZA'),
  ('ai_color_assistant', 'JP'),
  ('ai_color_assistant', 'FR'),
  ('ai_color_assistant', 'BR'),
  ('ai_color_assistant', 'SA'),
  ('ai_color_assistant', 'AE'),
  ('conversational_estimator', 'NG'),
  ('count_vision', 'NG'),
  ('count_vision', 'US'),
  ('count_vision', 'GB'),
  ('count_vision', 'CA'),
  ('count_vision', 'AU'),
  ('count_vision', 'DE'),
  ('count_vision', 'IN'),
  ('count_vision', 'GH'),
  ('count_vision', 'KE'),
  ('count_vision', 'ZA'),
  ('count_vision', 'JP'),
  ('count_vision', 'FR'),
  ('count_vision', 'BR'),
  ('count_vision', 'SA'),
  ('count_vision', 'AE'),
  ('defect_diagnosis', 'NG'),
  ('defect_diagnosis', 'US'),
  ('defect_diagnosis', 'GB'),
  ('defect_diagnosis', 'CA'),
  ('defect_diagnosis', 'AU'),
  ('defect_diagnosis', 'DE'),
  ('defect_diagnosis', 'IN'),
  ('defect_diagnosis', 'GH'),
  ('defect_diagnosis', 'KE'),
  ('defect_diagnosis', 'ZA'),
  ('defect_diagnosis', 'JP'),
  ('defect_diagnosis', 'FR'),
  ('defect_diagnosis', 'BR'),
  ('defect_diagnosis', 'SA'),
  ('defect_diagnosis', 'AE'),
  ('surface_assessment', 'NG'),
  ('surface_assessment', 'US'),
  ('surface_assessment', 'GB'),
  ('surface_assessment', 'CA'),
  ('surface_assessment', 'AU'),
  ('surface_assessment', 'DE'),
  ('surface_assessment', 'IN'),
  ('surface_assessment', 'GH'),
  ('surface_assessment', 'KE'),
  ('surface_assessment', 'ZA'),
  ('surface_assessment', 'JP'),
  ('surface_assessment', 'FR'),
  ('surface_assessment', 'BR'),
  ('surface_assessment', 'SA'),
  ('surface_assessment', 'AE')
ON CONFLICT (engine_id, market_code) DO NOTHING;

-- 5. Seed market_calculator_config for verified pairs only.
--    Preserves admin rows (ON CONFLICT DO NOTHING). A config row can
--    never make an unverified pair available (runtime enforces).
INSERT INTO market_calculator_config (market_code, calculator_type, is_available, config, labels)
SELECT v.market_code, v.engine_id, true, '{}'::jsonb, '{}'::jsonb
FROM engine_capability_verified v
ON CONFLICT (market_code, calculator_type) DO NOTHING;

-- 6. Integrity view: flags config rows that claim availability the
--    registry does not verify, orphaned rows, and missing seeds.
CREATE OR REPLACE VIEW market_config_integrity_issues AS
SELECT
  c.market_code,
  c.calculator_type AS engine_id,
  CASE
    WHEN e.engine_id IS NULL THEN 'unknown_engine'
    WHEN NOT c.is_available THEN 'explicitly_disabled'
    WHEN v.engine_id IS NULL THEN 'available_without_verification'
    ELSE 'ok'
  END AS issue
FROM market_calculator_config c
LEFT JOIN engine_capabilities e ON e.engine_id = c.calculator_type
LEFT JOIN engine_capability_verified v
  ON v.engine_id = c.calculator_type AND v.market_code = c.market_code
WHERE
  e.engine_id IS NULL
  OR (c.is_available AND v.engine_id IS NULL);
