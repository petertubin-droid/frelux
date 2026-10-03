-- =========================================================
-- Reinforcement / Steel Engine (Tier 2, Engine 5)
-- =========================================================
-- Deterministic reinforcement MATERIAL estimation from the
-- user's bar schedule (total cutting lengths per diameter):
--  - Lengths are NEVER assumed. The user reads their bar
--    bending schedule (or estimates total lengths); the engine
--    converts to 12 m stock lengths with a visible lap/waste
--    allowance.
--  - Unit weights are the standard BS 4449 constants (physics,
--    not market data) and are shown in the breakdown so tonnage
--    for delivery planning is honest.
--  - REUSES the shared materials the Price Tracker manages:
--    rebar-12/16/20/25mm-per-length, binding-wire-per-kg.
--    No new material rows, no prices seeded.
--  - Binding wire follows a visible admin planning rule
--    (kg per tonne of steel).
--  - This does NOT design reinforcement. Bar sizes, spacing and
--    laps are structural engineering decisions.
-- =========================================================

INSERT INTO estimation_calc_rules (rule_key, calculator_type, rule_value, rule_status, description, is_active) VALUES
  ('rebar_lap_waste_pct', 'reinforcement',
   '{"value": 5}'::jsonb, 'configurable_default',
   'Lap/cut/waste allowance added to total cutting length per diameter before dividing into 12 m stock lengths. Shown separately.', true),
  ('binding_wire_kg_per_tonne', 'reinforcement',
   '{"value": 12}'::jsonb, 'configurable_default',
   'PLANNING ALLOWANCE: binding wire kg per tonne of reinforcement. A visible estimate — deactivate to require a site count.', true);
