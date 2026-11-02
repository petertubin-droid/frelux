-- =========================================================
-- Explicit table grants for the engine tables (RLS gates rows)
-- =========================================================
-- The anon_privilege_cleanup migration (20260910170000)
-- removed default privileges: every new table migration must
-- GRANT explicitly alongside its RLS policies. The engine
-- migrations created the policies but not the grants, so all
-- 20 tables below were returning "permission denied" for
-- EVERY role (including service_role) in production.
--
-- Grants mirror the RLS policies:
--  * authenticated + service_role: full CRUD (RLS restricts
--    rows: admin writes via is_admin(), owners read their own)
--  * anon: SELECT on public-read config tables, INSERT on the
--    public-insert log tables.
-- Idempotent.
-- =========================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.solar_panel_models TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.solar_panel_models TO service_role;
GRANT SELECT ON TABLE public.solar_panel_models TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.solar_component_prices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.solar_component_prices TO service_role;
GRANT SELECT ON TABLE public.solar_component_prices TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.boq_quotes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.boq_quotes TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.cash_flow_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.cash_flow_templates TO service_role;
GRANT SELECT ON TABLE public.cash_flow_templates TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.labour_rates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.labour_rates TO service_role;
GRANT SELECT ON TABLE public.labour_rates TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.margin_presets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.margin_presets TO service_role;
GRANT SELECT ON TABLE public.margin_presets TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.defect_causes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.defect_causes TO service_role;
GRANT SELECT ON TABLE public.defect_causes TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.defects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.defects TO service_role;
GRANT SELECT ON TABLE public.defects TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.warranty_records TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.warranty_records TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.thermal_finish_factors TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.thermal_finish_factors TO service_role;
GRANT SELECT ON TABLE public.thermal_finish_factors TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.material_reuse_factors TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.material_reuse_factors TO service_role;
GRANT SELECT ON TABLE public.material_reuse_factors TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.contractor_credit_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.contractor_credit_profiles TO service_role;
GRANT SELECT ON TABLE public.contractor_credit_profiles TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.regional_cost_indices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.regional_cost_indices TO service_role;
GRANT SELECT ON TABLE public.regional_cost_indices TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.carbon_factors TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.carbon_factors TO service_role;
GRANT SELECT ON TABLE public.carbon_factors TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.maintenance_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.maintenance_profiles TO service_role;
GRANT SELECT ON TABLE public.maintenance_profiles TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.maintenance_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.maintenance_plans TO service_role;
GRANT SELECT ON TABLE public.maintenance_plans TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.count_vision_log TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.count_vision_log TO service_role;
GRANT INSERT ON TABLE public.count_vision_log TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.conversational_language_packs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.conversational_language_packs TO service_role;
GRANT SELECT ON TABLE public.conversational_language_packs TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.conversational_parse_log TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.conversational_parse_log TO service_role;
GRANT INSERT ON TABLE public.conversational_parse_log TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.field_capture_log TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.field_capture_log TO service_role;
GRANT INSERT ON TABLE public.field_capture_log TO anon;
