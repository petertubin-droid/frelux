-- =========================================================
-- BIM/IFC Interop Engine (Future Engine 15)
-- =========================================================
-- Purpose: parse architect-exported .ifc (STEP) files entirely
-- client-side, extract the building elements and QUANTITIES THE
-- FILE ITSELF DECLARES, and turn them into a material takeoff.
-- No external AI, no server round-trip — and no invented data:
-- if the file declares no quantities, only element counts are
-- reported with an honest warning.
-- =========================================================
-- Rules (admin-editable in Estimation Config -> Calc Rules):

INSERT INTO estimation_calc_rules (rule_key, calculator_type, rule_value, rule_status, description, is_active)
VALUES
  ('rounding_decimals', 'bim_ifc',
   '{"value": 2}'::jsonb, 'verified_frelux',
   'Decimal places for reported quantity totals in the BIM/IFC takeoff.', true),
  ('max_entities_per_file', 'bim_ifc',
   '{"value": 250000}'::jsonb, 'verified_frelux',
   'Safety cap: IFC files with more parsed entities than this are refused with an honest error instead of freezing the browser tab. Raise only if the machine can handle it.', true)
ON CONFLICT (rule_key, calculator_type) DO NOTHING;
