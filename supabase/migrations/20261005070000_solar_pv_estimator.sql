-- =========================================================
-- Solar/PV Roofing Estimator (Future Engine 16 — a PRIMARY
-- engine: full material takeoff for solar installation)
-- =========================================================
-- Computes a complete solar installation estimate: panel count
-- and array size, daily energy yield, inverter size, strings,
-- and EVERY material quantity (rails, clamps, connectors,
-- cabling, breakers, surge protection, earthing, batteries,
-- labour) with configured prices rolled into a total.
--
-- Two modes, one deterministic chain:
--   roof_area mode: panels = floor(usable_roof_area / panel_area)
--   energy_target mode:
--     required kWp = target / (sun_hours × (1 − loss_factor))
--     panels = ceil(required kWp / panel kWp)
--
-- Philosophy (unchanged): panel specs and component prices are
-- admin-entered with a mandatory source reference (datasheets,
-- supplier quotes). Quantities are never guessed; prices that
-- are not configured are reported as absent, never invented.
-- =========================================================

-- ─────────────────────────────────────────────
-- 1. solar_panel_models
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS solar_panel_models (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name       text NOT NULL,
  watt_peak        numeric NOT NULL CHECK (watt_peak > 0),
  length_m         numeric NOT NULL CHECK (length_m > 0),
  width_m          numeric NOT NULL CHECK (width_m > 0),
  unit_price_naira numeric,                    -- nullable: price may be unconfigured
  description      text,
  source_reference text NOT NULL,             -- manufacturer datasheet
  effective_date   date NOT NULL DEFAULT CURRENT_DATE,
  is_active        boolean NOT NULL DEFAULT true,
  sort_order       integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS solar_panel_models_name_active_uniq
  ON solar_panel_models (model_name)
  WHERE is_active = true;

ALTER TABLE solar_panel_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE solar_panel_models FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "solar_panel_models_public_read" ON solar_panel_models;
CREATE POLICY "solar_panel_models_public_read" ON solar_panel_models
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "solar_panel_models_admin_write" ON solar_panel_models;
CREATE POLICY "solar_panel_models_admin_write" ON solar_panel_models
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS "solar_panel_models_set_updated_at" ON solar_panel_models;
CREATE TRIGGER "solar_panel_models_set_updated_at"
  BEFORE UPDATE ON solar_panel_models
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE solar_panel_models IS 'Admin-configured solar panel models (wattage, dimensions, price), each with a mandatory datasheet reference. The estimator refuses to run without a configured model — panel specs are never guessed.';

-- ─────────────────────────────────────────────
-- 2. solar_component_prices
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS solar_component_prices (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  component_key    text NOT NULL,             -- e.g. 'mounting_rail_per_m', 'dc_cable_per_m', 'inverter_price_per_kw'
  component_label  text,                      -- human-readable
  unit             text NOT NULL,             -- e.g. 'm', 'unit', 'kW'
  price_naira      numeric NOT NULL CHECK (price_naira >= 0),
  description      text,
  source_reference text NOT NULL,             -- supplier quote
  effective_date   date NOT NULL DEFAULT CURRENT_DATE,
  is_active        boolean NOT NULL DEFAULT true,
  sort_order       integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS solar_component_prices_key_active_uniq
  ON solar_component_prices (component_key)
  WHERE is_active = true;

ALTER TABLE solar_component_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE solar_component_prices FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "solar_component_prices_public_read" ON solar_component_prices;
CREATE POLICY "solar_component_prices_public_read" ON solar_component_prices
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "solar_component_prices_admin_write" ON solar_component_prices;
CREATE POLICY "solar_component_prices_admin_write" ON solar_component_prices
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS "solar_component_prices_set_updated_at" ON solar_component_prices;
CREATE TRIGGER "solar_component_prices_set_updated_at"
  BEFORE UPDATE ON solar_component_prices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE solar_component_prices IS 'Admin-configured component prices for the Solar/PV Estimator (rails, clamps, connectors, cables, breakers, surge protection, earthing, inverter per kW, battery units, labour), each with a mandatory supplier-quote reference. A component without a configured price is reported as unpriced — never invented.';

-- ─────────────────────────────────────────────
-- 3. Engine calc rules (admin-editable via
--    Admin → Estimation Config → Calc Rules)
-- ─────────────────────────────────────────────
INSERT INTO estimation_calc_rules (rule_key, calculator_type, rule_value, rule_status, description, is_active)
VALUES
  ('peak_sun_hours_day', 'solar_pv',
   '{"value": 5.0}'::jsonb, 'verified_frelux',
   'Average daily peak sun hours used for the energy-yield estimate. Admins should set this for their region — the engine reports what is configured, never an invented climate.', true),
  ('system_loss_factor', 'solar_pv',
   '{"value": 0.2}'::jsonb, 'verified_frelux',
   'Fraction of array output lost to temperature, soiling, wiring and conversion (derate = 1 − this).', true),
  ('inverter_dc_ac_ratio', 'solar_pv',
   '{"value": 1.15}'::jsonb, 'verified_frelux',
   'Array DC size to inverter AC size ratio. Inverter size (kW) = array kWp ÷ this ratio.', true),
  ('rails_per_panel', 'solar_pv',
   '{"value": 2}'::jsonb, 'verified_frelux',
   'Mounting rails per panel (typically two rails across the panel length).', true),
  ('mid_clamps_per_panel', 'solar_pv',
   '{"value": 2}'::jsonb, 'verified_frelux',
   'Mid clamps per panel (interior clamping between panels).', true),
  ('end_clamps_per_panel', 'solar_pv',
   '{"value": 4}'::jsonb, 'verified_frelux',
   'End clamps per panel (outer clamping points).', true),
  ('mc4_pairs_per_panel', 'solar_pv',
   '{"value": 1}'::jsonb, 'verified_frelux',
   'MC4 connector pairs per panel for string wiring.', true),
  ('dc_cable_per_panel_m', 'solar_pv',
   '{"value": 2}'::jsonb, 'verified_frelux',
   'Metres of DC string cable per panel within the array.', true),
  ('string_size_max', 'solar_pv',
   '{"value": 10}'::jsonb, 'verified_frelux',
   'Maximum panels per string (string count = ceil(panels / this); one DC breaker per string).', true),
  ('labor_cost_per_panel_naira', 'solar_pv',
   '{"value": 15000}'::jsonb, 'verified_frelux',
   'Installation labour cost per panel, ₦. Multiplied by the panel count.', true),
  ('battery_unit_capacity_kwh', 'solar_pv',
   '{"value": 5.12}'::jsonb, 'verified_frelux',
   'Usable capacity of one configured battery unit (kWh) — battery units = ceil(requested storage ÷ this). Only used when storage is requested.', true),
  ('rounding_decimals', 'solar_pv',
   '{"value": 2}'::jsonb, 'verified_frelux',
   'Decimal places for reported quantities, sizes and costs.', true)
ON CONFLICT (rule_key, calculator_type) DO NOTHING;

-- No seed models or prices. Panel specs and component prices are
-- admin-entered from verifiable sources (datasheets, supplier
-- quotes) — never guessed.
