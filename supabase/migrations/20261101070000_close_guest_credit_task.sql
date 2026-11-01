-- =========================================================
-- complete_credit_task: anon can no longer complete quests
-- Migration: 20261101070000_close_guest_credit_task.sql
--
-- This function takes p_user_id, p_task_id and a verification
-- reference, inserts a completion row and awards credits. It was
-- reachable by anon, so any visitor could award credits to any account
-- without completing anything.
--
-- It has a real client caller (the rewards UI), so it stays
-- authenticated instead of moving to service_role. Minting credits
-- from a signed-in session for a client-supplied user id is still a
-- gap; it needs an auth.uid() check inside the body, which is a
-- follow-up that recreates the function. Until then the hourly monitor
-- records it.
--
-- It is also removed from the monitor allowlist, where it was listed
-- as a public surface by mistake during the first pass.
-- =========================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'complete_credit_task'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', r.sig);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.privileged_grant_allowlist()
RETURNS TEXT[]
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT ARRAY[
    'frelux_community_size',
    'find_nearby_listings',
    'find_nearby_products',
    'find_nearby_professionals',
    'search_marketplace_products',
    'fetch_shared_estimate',
    'respond_to_client_estimate',
    'contact_messages_rate_ok',
    'get_published_translations',
    'get_translation_alternates',
    'get_public_shared_project',
    'generate_marketplace_order_number',
    'increment_view_count',
    'increment_product_view_count',
    'price_group_progress',
    'check_pro_level_eligibility',
    'classify_catalogue_backlog',
    'get_user_verification_tier',
    'archie_evidence_health'
  ]::TEXT[];
$$;

REVOKE ALL ON FUNCTION public.privileged_grant_allowlist() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.privileged_grant_allowlist() TO service_role;
