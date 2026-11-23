-- =========================================================
-- SUBSCRIPTION TIER CONFIG WRITE GRANTS (2026-11-21)
--
-- 20261121090000 grants only SELECT on subscription_tier_configs, so the
-- admin policy (FOR ALL TO authenticated USING is_admin()) had no table
-- privilege behind it: every tier save from the admin console would have been
-- refused with 42501. RLS still gates these writes behind is_admin(), so the
-- grant alone cannot change a tier.
-- =========================================================

GRANT INSERT, UPDATE, DELETE ON public.subscription_tier_configs TO authenticated;
