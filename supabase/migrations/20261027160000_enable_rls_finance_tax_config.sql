-- CRITICAL security fix (audit 2026-10-27): four public tables had Row Level
-- Security completely DISABLED while anon held SELECT and authenticated held
-- full INSERT/UPDATE/DELETE grants. Through PostgREST that meant:
--   * any visitor could read settlement FX rates and tax rules
--   * any signed-up (free) user could rewrite settlement FX rates, tax
--     jurisdiction rules, tax validations, or engine capability state.
-- Settlement FX and tax rules feed money calculations, so silent tampering
-- corrupts every quoted total - a direct FRELUX identity/trust risk.
--
-- Policy model: these are reference/config tables the estimation engines read
-- at runtime. Reads stay public (anon + authenticated) exactly as today;
-- writes become service-role only (admin backend + edge functions), with no
-- policy grant for anon/authenticated.
-- Applies to: settlement_fx_config, tax_jurisdiction_rules,
--             tax_rule_validations, engine_capability_state

BEGIN;

ALTER TABLE public.settlement_fx_config      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlement_fx_config      FORCE  ROW LEVEL SECURITY;
ALTER TABLE public.tax_jurisdiction_rules    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_jurisdiction_rules    FORCE  ROW LEVEL SECURITY;
ALTER TABLE public.tax_rule_validations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_rule_validations      FORCE  ROW LEVEL SECURITY;
ALTER TABLE public.engine_capability_state   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engine_capability_state   FORCE  ROW LEVEL SECURITY;

-- Read: public (engines and guests both need these values).
DROP POLICY IF EXISTS public_read_settlement_fx_config ON public.settlement_fx_config;
CREATE POLICY public_read_settlement_fx_config ON public.settlement_fx_config
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS public_read_tax_jurisdiction_rules ON public.tax_jurisdiction_rules;
CREATE POLICY public_read_tax_jurisdiction_rules ON public.tax_jurisdiction_rules
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS public_read_tax_rule_validations ON public.tax_rule_validations;
CREATE POLICY public_read_tax_rule_validations ON public.tax_rule_validations
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS public_read_engine_capability_state ON public.engine_capability_state;
CREATE POLICY public_read_engine_capability_state ON public.engine_capability_state
  FOR SELECT TO anon, authenticated USING (true);

-- Write: admins only (defence in depth; service role bypasses RLS by design).
DROP POLICY IF EXISTS admin_write_settlement_fx_config ON public.settlement_fx_config;
CREATE POLICY admin_write_settlement_fx_config ON public.settlement_fx_config
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS admin_write_tax_jurisdiction_rules ON public.tax_jurisdiction_rules;
CREATE POLICY admin_write_tax_jurisdiction_rules ON public.tax_jurisdiction_rules
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS admin_write_tax_rule_validations ON public.tax_rule_validations;
CREATE POLICY admin_write_tax_rule_validations ON public.tax_rule_validations
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS admin_write_engine_capability_state ON public.engine_capability_state;
CREATE POLICY admin_write_engine_capability_state ON public.engine_capability_state
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

COMMIT;
