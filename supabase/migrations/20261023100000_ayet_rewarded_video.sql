-- ayeT Studios web rewarded-video integration.
-- The S2S callback is the sole credit authority; browser SDK callbacks only
-- signal playback UX and never grant credits.

INSERT INTO public.ad_providers
  (name, slug, provider_type, is_active, priority, credentials, settings, is_system)
VALUES
  ('ayeT Studios', 'ayet_studios', 'rewarded', false, 20,
   '{"api_key":"","placement_id":"","app_id":""}'::jsonb,
   '{"rewarded_video_enabled":false,"rewarded_adslot_name":"","rewarded_adslot_id":""}'::jsonb,
   true)
ON CONFLICT (slug) DO UPDATE SET
  name = 'ayeT Studios',
  provider_type = 'rewarded',
  is_system = true,
  credentials = public.ad_providers.credentials || jsonb_build_object(
    'api_key', COALESCE(public.ad_providers.credentials->>'api_key', ''),
    'placement_id', COALESCE(public.ad_providers.credentials->>'placement_id', ''),
    'app_id', COALESCE(public.ad_providers.credentials->>'app_id', '')
  ),
  settings = public.ad_providers.settings || jsonb_build_object(
    'rewarded_video_enabled', CASE WHEN public.ad_providers.settings->'rewarded_video_enabled' = 'true'::jsonb THEN true ELSE false END,
    'rewarded_adslot_name', COALESCE(public.ad_providers.settings->>'rewarded_adslot_name', ''),
    'rewarded_adslot_id', COALESCE(public.ad_providers.settings->>'rewarded_adslot_id', '')
  ),
  updated_at = now();

CREATE TABLE IF NOT EXISTS public.ayet_rewarded_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  external_identifier text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  transaction_id text UNIQUE,
  credits_awarded integer,
  balance_after integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_ayet_rewarded_sessions_user_created
  ON public.ayet_rewarded_sessions (user_id, created_at DESC);

ALTER TABLE public.ayet_rewarded_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ayet_rewarded_sessions FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.ayet_rewarded_sessions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.ayet_rewarded_sessions TO service_role;

CREATE OR REPLACE FUNCTION public.complete_ayet_rewarded_session(
  p_external_identifier text,
  p_transaction_id text,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS TABLE(success boolean, new_balance integer, credits_earned integer, already_awarded boolean, error text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_session public.ayet_rewarded_sessions%ROWTYPE;
  v_provider public.ad_providers%ROWTYPE;
  v_reward_config public.rewarded_ad_credit_config%ROWTYPE;
  v_award record;
BEGIN
  IF p_external_identifier IS NULL OR length(p_external_identifier) < 3
     OR p_transaction_id IS NULL OR length(p_transaction_id) < 4 OR length(p_transaction_id) > 200 THEN
    RETURN QUERY SELECT false, 0, 0, false, 'invalid_callback'::text;
    RETURN;
  END IF;

  -- Serialize callbacks carrying the same provider transaction id before
  -- checking idempotency, so concurrent retries cannot race into a unique
  -- constraint after one has already credited the wallet.
  PERFORM pg_advisory_xact_lock(hashtext('ayet_rewarded_transaction:' || p_transaction_id));

  SELECT * INTO v_session
  FROM public.ayet_rewarded_sessions
  WHERE external_identifier = p_external_identifier
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, 0, false, 'session_not_found'::text;
    RETURN;
  END IF;

  IF v_session.status = 'completed' THEN
    IF v_session.transaction_id = p_transaction_id THEN
      RETURN QUERY SELECT true, COALESCE(v_session.balance_after, 0), COALESCE(v_session.credits_awarded, 0), true, NULL::text;
    ELSE
      RETURN QUERY SELECT false, 0, 0, false, 'session_already_used'::text;
    END IF;
    RETURN;
  END IF;

  IF v_session.status <> 'pending' OR v_session.expires_at < now() THEN
    UPDATE public.ayet_rewarded_sessions SET status = 'expired'
    WHERE id = v_session.id AND status = 'pending';
    RETURN QUERY SELECT false, 0, 0, false, 'session_expired'::text;
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM public.ayet_rewarded_sessions WHERE transaction_id = p_transaction_id) THEN
    RETURN QUERY SELECT false, 0, 0, false, 'duplicate_transaction'::text;
    RETURN;
  END IF;

  SELECT * INTO v_provider FROM public.ad_providers
  WHERE slug = 'ayet_studios' AND is_active = true;
  IF NOT FOUND OR COALESCE((v_provider.settings->>'rewarded_video_enabled')::boolean, false) IS NOT TRUE THEN
    RETURN QUERY SELECT false, 0, 0, false, 'provider_disabled'::text;
    RETURN;
  END IF;

  SELECT * INTO v_reward_config FROM public.rewarded_ad_credit_config WHERE id = 1;
  IF NOT FOUND OR v_reward_config.is_enabled IS NOT TRUE THEN
    RETURN QUERY SELECT false, 0, 0, false, 'rewards_disabled'::text;
    RETURN;
  END IF;

  SELECT * INTO v_award FROM public.award_ad_credits(
    v_session.user_id,
    'ayet_studios',
    p_transaction_id,
    v_reward_config.credits_per_ad,
    COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object('verified_by', 'ayet_s2s', 'session_id', v_session.id)
  );

  IF NOT COALESCE(v_award.success, false) THEN
    RETURN QUERY SELECT false, COALESCE(v_award.new_balance, 0), 0, COALESCE(v_award.already_awarded, false), COALESCE(v_award.error, 'award_failed');
    RETURN;
  END IF;

  UPDATE public.ayet_rewarded_sessions
  SET status = 'completed', transaction_id = p_transaction_id,
      credits_awarded = v_reward_config.credits_per_ad,
      balance_after = v_award.new_balance, completed_at = now()
  WHERE id = v_session.id;

  RETURN QUERY SELECT true, v_award.new_balance, v_reward_config.credits_per_ad,
    COALESCE(v_award.already_awarded, false), NULL::text;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_ayet_rewarded_session(text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_ayet_rewarded_session(text, text, jsonb) TO service_role;
