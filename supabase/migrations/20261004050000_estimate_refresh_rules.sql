-- =========================================================
-- Estimate Refresh Engine rules (Future Engine 6, part 2 —
-- "Inflation-Proof Estimating")
-- =========================================================
-- No new tables: saved estimate items already snapshot their
-- prices (price_snapshot with price_type, ref_id, unit_price,
-- effective_date), and current prices already live in
-- estimation_prices. This engine is pure refresh logic over
-- existing data; it only needs its calc rule row so the
-- rounding behaviour is admin-editable like every other
-- engine (Admin → Estimation Config → Calc Rules).
-- =========================================================

INSERT INTO estimation_calc_rules (rule_key, calculator_type, rule_value, rule_status, description, is_active)
VALUES
  ('rounding_decimals', 'estimate_refresh',
   '{"value": 2}'::jsonb, 'verified_frelux',
   'Decimal places for reported line totals and deltas in the current-cost-today refresh.', true)
ON CONFLICT (rule_key, calculator_type) DO NOTHING;
