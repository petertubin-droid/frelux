-- =====================================================================
-- Engine #12 (RBAC & clearance): FORCE Row Level Security on every
-- public table that had RLS enabled but NOT forced (66 tables).
--
-- RLS "enabled" alone lets the TABLE OWNER bypass all policies. Every
-- earlier Frelux engine (predictive, compliance, IoT, sync, escrow)
-- was already forced; this closes the gap on the remaining catalog,
-- lexicon, gateway and workspace-adjacent tables so the whole public
-- schema now has one uniform posture: owner included, RLS is law.
--
-- The table list was generated FROM the live database (not transcribed)
-- and an idempotent verification query at the bottom proves the final
-- state: zero public tables remain with RLS enabled-but-not-forced.
-- =====================================================================

ALTER TABLE public.ai_gateway_daily_allowance FORCE ROW LEVEL SECURITY;
ALTER TABLE public.ai_gateway_operations_log FORCE ROW LEVEL SECURITY;
ALTER TABLE public.ai_gateway_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.archie_claim_evidence FORCE ROW LEVEL SECURITY;
ALTER TABLE public.archie_claim_relations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.archie_claims FORCE ROW LEVEL SECURITY;
ALTER TABLE public.archie_evidence_conflicts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.archie_evidence_records FORCE ROW LEVEL SECURITY;
ALTER TABLE public.archie_installation_identity FORCE ROW LEVEL SECURITY;
ALTER TABLE public.archie_migration_environments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.archie_task_states FORCE ROW LEVEL SECURITY;
ALTER TABLE public.comprehensive_engine_inventory FORCE ROW LEVEL SECURITY;
ALTER TABLE public.construction_glossary FORCE ROW LEVEL SECURITY;
ALTER TABLE public.construction_standards FORCE ROW LEVEL SECURITY;
ALTER TABLE public.credit_task_completions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.credit_task_definitions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.crowdsourced_market_benchmarks FORCE ROW LEVEL SECURITY;
ALTER TABLE public.crowdsourced_material_expenses FORCE ROW LEVEL SECURITY;
ALTER TABLE public.engine_capabilities FORCE ROW LEVEL SECURITY;
ALTER TABLE public.engine_capability_verified FORCE ROW LEVEL SECURITY;
ALTER TABLE public.engine_market_support_matrix FORCE ROW LEVEL SECURITY;
ALTER TABLE public.frelux_archie_agent_reports FORCE ROW LEVEL SECURITY;
ALTER TABLE public.frelux_archie_datasets FORCE ROW LEVEL SECURITY;
ALTER TABLE public.frelux_archie_device_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.frelux_archie_domain_constants FORCE ROW LEVEL SECURITY;
ALTER TABLE public.frelux_archie_family_members FORCE ROW LEVEL SECURITY;
ALTER TABLE public.frelux_archie_memory FORCE ROW LEVEL SECURITY;
ALTER TABLE public.frelux_archie_model_experiments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.frelux_archie_model_invocations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.frelux_archie_model_registry FORCE ROW LEVEL SECURITY;
ALTER TABLE public.frelux_archie_model_runtimes FORCE ROW LEVEL SECURITY;
ALTER TABLE public.frelux_archie_recovery_jobs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.frelux_archie_speaker_profile FORCE ROW LEVEL SECURITY;
ALTER TABLE public.frelux_archie_trading_positions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.frelux_archie_trading_state FORCE ROW LEVEL SECURITY;
ALTER TABLE public.frelux_escrow_disputes FORCE ROW LEVEL SECURITY;
ALTER TABLE public.frelux_escrow_events FORCE ROW LEVEL SECURITY;
ALTER TABLE public.frelux_escrow_evidence FORCE ROW LEVEL SECURITY;
ALTER TABLE public.frelux_escrow_milestones FORCE ROW LEVEL SECURITY;
ALTER TABLE public.frelux_escrow_transactions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.header_image_overrides FORCE ROW LEVEL SECURITY;
ALTER TABLE public.integration_secrets FORCE ROW LEVEL SECURITY;
ALTER TABLE public.iot_safety_thresholds FORCE ROW LEVEL SECURITY;
ALTER TABLE public.lexicon_imports FORCE ROW LEVEL SECURITY;
ALTER TABLE public.lexicon_relationships FORCE ROW LEVEL SECURITY;
ALTER TABLE public.lexicon_sense_relations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.lexicon_senses FORCE ROW LEVEL SECURITY;
ALTER TABLE public.lexicon_sources FORCE ROW LEVEL SECURITY;
ALTER TABLE public.lexicon_words FORCE ROW LEVEL SECURITY;
ALTER TABLE public.macro_economic_indicators FORCE ROW LEVEL SECURITY;
ALTER TABLE public.macro_elasticity_rules FORCE ROW LEVEL SECURITY;
ALTER TABLE public.materials FORCE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers FORCE ROW LEVEL SECURITY;
ALTER TABLE public.partnership_inquiries FORCE ROW LEVEL SECURITY;
ALTER TABLE public.price_digest_tokens FORCE ROW LEVEL SECURITY;
ALTER TABLE public.price_intel_tokens FORCE ROW LEVEL SECURITY;
ALTER TABLE public.semantic_graph_edges FORCE ROW LEVEL SECURITY;
ALTER TABLE public.semantic_graph_imports FORCE ROW LEVEL SECURITY;
ALTER TABLE public.semantic_graph_nodes FORCE ROW LEVEL SECURITY;
ALTER TABLE public.signup_digest_tokens FORCE ROW LEVEL SECURITY;
ALTER TABLE public.site_testimonials FORCE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_purchases FORCE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_inventory_items FORCE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.token_purchase_prices FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles FORCE ROW LEVEL SECURITY;

-- Verification: no public table may keep enabled-not-forced RLS.
-- (Fails the migration if any survivor remains.)
DO $$
DECLARE
  survivor text;
BEGIN
  SELECT tablename INTO survivor
  FROM pg_tables
  WHERE schemaname = 'public'
    AND rowsecurity = true
    AND EXISTS (
      SELECT 1 FROM pg_class
      WHERE pg_class.oid = pg_tables.tablename::regclass
        AND relrowsecurity = true
        AND relforcerowsecurity = false
    )
  LIMIT 1;
  IF survivor IS NOT NULL THEN
    RAISE EXCEPTION 'RLS still not forced on public.%', survivor;
  END IF;
END;
$$;
