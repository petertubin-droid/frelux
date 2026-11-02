-- =========================================================
-- Material Price Forecasting Engine (Future Engine 4)
-- =========================================================
-- Trend-aware price projections from recorded price history
-- (material_price_history). No new table: the engine runs a
-- deterministic least-squares linear regression over the
-- recorded price points for each material.
--
-- Philosophy (unchanged): the engine never invents inflation
-- rates or market guesses. It projects ONLY from recorded
-- prices, refuses when there is not enough history, and clamps
-- the horizon to the admin-configured maximum with a warning.
-- =========================================================

-- ─────────────────────────────────────────────
-- Engine calc rules (defaults, admin-editable via
-- Admin → Estimation Config & Rules)
-- ─────────────────────────────────────────────
INSERT INTO estimation_calc_rules (rule_key, calculator_type, rule_value, rule_status, description, is_active)
VALUES
  ('min_history_points', 'price_forecast',
   '{"value": 3}'::jsonb, 'verified_frelux',
   'Minimum recorded price points required before a material can be forecast. Fewer points = the engine refuses instead of guessing a trend.', true),
  ('max_forecast_months', 'price_forecast',
   '{"value": 12}'::jsonb, 'verified_frelux',
   'Maximum forecast horizon in months. Longer horizons are clamped with a warning — linear trends lose reliability far out.', true),
  ('short_history_days', 'price_forecast',
   '{"value": 30}'::jsonb, 'verified_frelux',
   'History spans shorter than this many days get a low-confidence warning on every forecast.', true)
ON CONFLICT (rule_key, calculator_type) DO NOTHING;

-- No seed forecasts. Projections are computed from recorded
-- price history only — never stored guesses.
