-- =========================================================
-- Credit rewards: two defects that made the feature unusable
-- Migration: 20261101092000_fix_credit_overloads_and_types.sql
--
-- Found while testing the new identity guard on complete_credit_task.
-- The guard worked. The function could still never succeed, for two
-- unrelated reasons:
--
-- 1. Overload collision. Three credit functions exist twice with the
--    same parameter names reordered:
--      complete_credit_task(p_task_id, p_user_id, ...) and (p_user_id, p_task_id, ...)
--      award_offerwall_credits(5 args) and (6 args, with defaults)
--      redeem_reward(3 args) and (4 args, p_client_hash defaulted)
--    PostgREST cannot choose between them, so the client call returns
--    PGRST203 "Could not choose the best candidate function" with HTTP
--    300. The rewards UI never awarded anything. Verified with the anon
--    key against production before this migration.
--
-- 2. Invalid credit type. credit_transactions.type has a check
--    constraint allowing only 'earn', 'spend', 'admin_adjust'.
--    complete_credit_task and award_ad_credits insert 'bonus', so even
--    a correctly resolved call raised 23514 and rolled back.
--
-- Both defects predate today's security work and are unrelated to it;
-- they are fixed here because the identity guard is worthless on a
-- function that cannot complete.
--
-- The redundant overloads are the older copies, with no client or edge
-- caller (checked in src/, supabase/functions/ and prosrc) and no
-- structural dependency. The kept versions are the ones the live
-- callers use: credits.ts passes p_user_id, redeem-reward passes
-- p_client_hash, and award_offerwall_credits is called with event type.
-- =========================================================

DROP FUNCTION IF EXISTS public.complete_credit_task(text, uuid, text, jsonb);
DROP FUNCTION IF EXISTS public.award_offerwall_credits(uuid, text, text, integer, jsonb);
DROP FUNCTION IF EXISTS public.redeem_reward(uuid, text, text);

-- Rewrite the type literal in place rather than retyping two long
-- bodies: the only intended change is 'bonus' -> 'earn'.
DO $$
DECLARE
  d TEXT;
BEGIN
  SELECT pg_get_functiondef('public.complete_credit_task(uuid,text,text,jsonb)'::regprocedure) INTO d;
  IF d LIKE '%''bonus''%' THEN
    EXECUTE replace(d, '''bonus''', '''earn''');
  END IF;

  SELECT pg_get_functiondef('public.award_ad_credits(uuid,text,text,integer,jsonb)'::regprocedure) INTO d;
  IF d LIKE '%''bonus''%' THEN
    EXECUTE replace(d, '''bonus''', '''earn''');
  END IF;
END $$;

-- recreate resets grants
REVOKE ALL ON FUNCTION public.complete_credit_task(uuid, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_credit_task(uuid, text, text, jsonb) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.award_ad_credits(uuid, text, text, integer, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_ad_credits(uuid, text, text, integer, jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.award_offerwall_credits(uuid, text, text, integer, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_offerwall_credits(uuid, text, text, integer, text, jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.redeem_reward(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_reward(uuid, text, text, text) TO service_role;
