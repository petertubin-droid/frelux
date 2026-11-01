-- =========================================================
-- Anonymous reachability: close the remaining 27 open writers
-- Migration: 20261101050000_restrict_privileged_anon_exec.sql
--
-- Found by sweeping every SECURITY DEFINER function in public against
-- has_function_privilege('anon', ...) after the eleven-function fix
-- earlier the same day. The earlier fixes were chosen from a written
-- list; this one comes from the live catalog, which is why it is much
-- larger: 85 SECURITY DEFINER functions were executable by anon.
--
-- Of those, these write platform tables and check no identity at all:
--
--   apply_subscription_purchase      grants a paid plan for any user id
--   credit_token_purchase            mints tokens
--   award_ad_credits                 mints ad credits
--   award_offerwall_credits          mints offerwall credits
--   reverse_offerwall_credits        claws credits back
--   redeem_reward                    redeems rewards
--   unlock_ai_feature_via_ad         unlocks paid features via a "ad"
--   unlock_guest_daily_ai_allowance  guest allowance by client hash
--   spend_credits                    debits any balance
--   complete_credit_task             completes quests (see note below)
--   update_mission_progress          advances missions
--   record_activity                  writes activity for any user
--   api_wallet_for                   wallet lookup for any user
--   refresh_subscription_local_prices anon-supplied jsonb rewrote prices
--   ensure_user_default_workspace    creates workspaces for any user
--   diaspora_notify                  sends notifications to any project
--   increment_view_count             counters (kept public, see below)
--   increment_product_view_count     counters (kept public, see below)
--   ... plus catalogue and lock helpers
--
-- Every function below was checked for callers before it was locked:
-- 0 client references in src/, and either an edge-function caller that
-- already uses the service client or no caller at all (cron, trigger,
-- or nested SQL). Anything with a real client caller is left alone and
-- listed at the bottom.
--
-- ARCHIE (archie_evidence_health) is deliberately untouched: ARCHIE is
-- excluded from FRELUX operations.
-- =========================================================

DO $$
DECLARE
  r RECORD;
  service_only TEXT[] := ARRAY[
    -- credit and subscription economy
    'apply_subscription_purchase',
    'credit_token_purchase',
    'award_ad_credits',
    'award_offerwall_credits',
    'reverse_offerwall_credits',
    'redeem_reward',
    'unlock_ai_feature_via_ad',
    'unlock_guest_daily_ai_allowance',
    'spend_credits',
    'update_mission_progress',
    'record_activity',
    'api_wallet_for',
    'refresh_subscription_local_prices',
    'cleanup_old_errors',
    -- workspace, notification and lock helpers
    'ensure_user_default_workspace',
    'diaspora_notify',
    'frelux_try_engine_lock',
    'frelux_release_engine_lock',
    'generate_weekly_mission_if_needed',
    -- catalogue pipeline (scheduled jobs run as the table owner)
    'apply_catalogue_aliases',
    'request_catalogue_sync',
    'stage_catalogue_product',
    'automap_catalogue_products',
    'classify_catalogue_backlog',
    'process_catalogue_responses',
    'recompute_source_reliability',
    'reset_catalogue_suggestions',
    'mark_observation_outliers',
    -- billing and delivery reads that expose another user's data
    'charge_api_request',
    'consume_reward_grant',
    'get_user_push_subscriptions',
    'get_message_recipient_subscriptions',
    'get_verification_tier',
    'is_project_member'
  ];
  auth_only TEXT[] := ARRAY[
    -- real client callers; the admin UI needs them authenticated, and
    -- none of them should answer an anonymous visitor
    'get_user_verification_tier',
    'check_pro_level_eligibility',
    'price_group_progress'
  ];
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = ANY (service_only)
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;

  FOR r IN
    SELECT p.oid::regprocedure AS sig, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = ANY (auth_only)
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', r.sig);
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM unnest(service_only || auth_only) AS wanted(name)
    WHERE NOT EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = wanted.name
    )
  ) THEN
    RAISE EXCEPTION 'A function named in this migration does not exist; review before applying';
  END IF;
END $$;

-- Left reachable by anon on purpose, each already carrying its own gate
-- or being an anonymous product surface:
--
--   view counters (public pages), marketplace and nearby search,
--   shared-estimate links and client feedback tokens, published
--   translations, contact form rate limiting, community size, shared
--   project links, order numbers, price group progress,
--   check_pro_level_eligibility and classify_catalogue_backlog (admin UI),
--   complete_credit_task (client-called; see tracked gap below).
--
-- Tracked, not fixed here: complete_credit_task and
-- get_user_verification_tier take a user id from the client and are now
-- authenticated only, so a signed-in user can still pass another id.
-- Closing that needs an auth.uid() check inside the body, which means
-- recreating the function rather than changing its grants. The hourly
-- monitor records it as a finding until then.
