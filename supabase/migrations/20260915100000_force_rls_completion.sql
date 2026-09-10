-- =============================================================
-- FRELUX RLS — FORCE ROW LEVEL SECURITY COMPLETION (audit F2)
-- Owner-approved fix, 2026-09-10.
--
-- All public tables already have RLS ENABLED with explicit
-- policies. FORCE closes the last gap: the table owner is no
-- longer exempt from RLS. The Supabase service role has
-- BYPASSRLS and is unaffected; anon/authenticated were already
-- subject to RLS, so no access changes for real users.
--
-- Tables covered: 141 (RLS enabled, FORCE missing).
-- Idempotent: ALTER TABLE ... FORCE is re-runnable.
-- =============================================================

ALTER TABLE public."agent_events" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."ai_facts" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."archie_calculation_traces" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."archie_change_audit" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."archie_change_requests" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."archie_code_findings" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."archie_constitution" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."archie_evolution_memory" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."archie_evolution_settings" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."archie_global_authorizations" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."archie_global_market_observations" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."archie_governance_rules" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."archie_inspection_reports" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."archie_installation_identity" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."archie_language_entries" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."archie_language_evidence" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."archie_language_profiles" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."archie_legal_documents" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."archie_legal_events" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."archie_memory_rights_requests" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."archie_migration_environments" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."archie_offensive_engagements" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."archie_offensive_findings" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."archie_offensive_targets" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."archie_patch_proposals" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."archie_privacy_consents" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."archie_subsystem_status" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."archie_subsystems" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."construction_extractions" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."construction_term_versions" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."construction_terms" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_account_pauses" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_api_entitlements" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_api_keys" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_api_plans" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_api_transactions" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_api_usage" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_archie_agent_events" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_archie_audit_events" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_archie_audit_log" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_archie_change_requests" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_archie_cognitive_traces" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_archie_connection_events" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_archie_connections" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_archie_contradictions" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_archie_contributions" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_archie_contributors" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_archie_conversations" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_archie_core_principles" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_archie_crypto_analysis" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_archie_crypto_assets" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_archie_crypto_observations" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_archie_crypto_portfolio" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_archie_datasets" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_archie_device_accounts" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_archie_device_data_consents" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_archie_device_health" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_archie_device_sessions" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_archie_devices" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_archie_domain_gaps" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_archie_domains" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_archie_execution_runs" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_archie_execution_targets" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_archie_family_members" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_archie_ingestions" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_archie_internal_agents" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_archie_invitations" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_archie_knowledge_history" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_archie_knowledge_links" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_archie_languages" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_archie_market_observations" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_archie_memory" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_archie_messages" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_archie_mobile_consents" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_archie_mobile_learnings" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_archie_model_experiments" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_archie_model_invocations" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_archie_model_registry" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_archie_model_runtimes" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_archie_native_facts" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_archie_native_outcomes" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_archie_paid_capabilities" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_archie_people" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_archie_shares" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_archie_terminology" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_archie_trusted_devices" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_archie_voice_samples" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_archie_whatsapp_accounts" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_archie_whatsapp_events" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_archie_whatsapp_messages" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_archie_whatsapp_reminders" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_archie_whatsapp_settings" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_archie_world_model" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_crawl_runs" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_crawled_pages" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_escrow_flags" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_evaluation_cases" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_evaluation_datasets" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_evaluation_results" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_extracted_products" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_improvement_proposals" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_infrastructure_budgets" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_infrastructure_costs" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_intelligence_sources" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_knowledge_items" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_learning_audit" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_learning_events" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_learning_rate_limits" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_learning_records" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_learning_versions" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_owner_authorizations" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_owner_credentials" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_price_observations" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_professional_profiles" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_protected_item_versions" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_protected_items" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_search_providers" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_security_events" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_security_sessions" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_social_accounts" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_social_analyses" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_social_tokens" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_studio_files" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_studio_projects" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_studio_reviews" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_studio_versions" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."frelux_trust_safety_events" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."learn_article_inserts" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."plan_documents" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."plan_extractions" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."project_agent_actions" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."project_agent_activity" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."project_agent_alerts" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."project_agent_approvals" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."project_agent_memory" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."project_agent_sessions" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."project_agent_state_baselines" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."properties" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."subscription_plan_prices" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."token_purchase_config" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."token_purchases" FORCE ROW LEVEL SECURITY;

-- Self-verify: fail loudly if any public table still lacks FORCE.
DO $$
DECLARE
  remaining integer;
BEGIN
  SELECT count(*) INTO remaining
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r'
    AND c.relrowsecurity AND NOT c.relforcerowsecurity;
  IF remaining > 0 THEN
    RAISE EXCEPTION 'FORCE RLS completion FAILED: % tables remain unforced', remaining;
  END IF;
END $$;
