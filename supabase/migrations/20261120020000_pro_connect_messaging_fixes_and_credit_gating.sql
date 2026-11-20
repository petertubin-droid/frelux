-- Charge 5 FRELUX Credits only when a Pro Connect message is successfully
-- stored. Charging and insertion share one database transaction, so failed
-- inserts cannot leave a charge without a message.

INSERT INTO public.ai_feature_costs (
  feature_key, feature_name, description, credit_cost, requires_credits,
  ad_unlock_enabled, ad_unlock_credits, daily_usage_limit, is_enabled, sort_order
)
VALUES (
  'pro_connect_message', 'Pro Connect Message',
  'Send one message in a Pro Connect conversation',
  5, true, false, 0, 0, true, 9
)
ON CONFLICT (feature_key) DO UPDATE
SET feature_name = EXCLUDED.feature_name,
    description = EXCLUDED.description,
    credit_cost = 5,
    requires_credits = true,
    ad_unlock_enabled = false,
    is_enabled = true;

ALTER TABLE public.pro_messages
  ADD COLUMN IF NOT EXISTS client_request_id text;

CREATE UNIQUE INDEX IF NOT EXISTS pro_messages_sender_request_unique
  ON public.pro_messages(sender_id, client_request_id)
  WHERE client_request_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.send_pro_message_with_credits(
  p_conversation_id uuid,
  p_body text,
  p_attachment_url text DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_conversation public.pro_conversations%ROWTYPE;
  v_message public.pro_messages%ROWTYPE;
  v_spend record;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'code', 'AUTH_REQUIRED', 'error', 'Sign in to send messages.');
  END IF;
  IF p_idempotency_key IS NULL OR length(p_idempotency_key) < 16 OR length(p_idempotency_key) > 128 THEN
    RETURN jsonb_build_object('success', false, 'code', 'BAD_REQUEST', 'error', 'A valid send request ID is required.');
  END IF;
  IF p_body IS NULL OR char_length(btrim(p_body)) < 1 OR char_length(p_body) > 4000 THEN
    RETURN jsonb_build_object('success', false, 'code', 'BAD_REQUEST', 'error', 'Messages must contain 1–4000 characters.');
  END IF;

  -- Serialize retries with the same key and return the already-created message.
  PERFORM pg_advisory_xact_lock(hashtext('pro_message:' || v_user_id::text || ':' || p_idempotency_key));
  SELECT * INTO v_message
  FROM public.pro_messages
  WHERE sender_id = v_user_id AND client_request_id = p_idempotency_key;
  IF FOUND THEN
    RETURN jsonb_build_object('success', true, 'message', to_jsonb(v_message), 'duplicate', true);
  END IF;

  SELECT * INTO v_conversation
  FROM public.pro_conversations c
  WHERE c.id = p_conversation_id
    AND c.status = 'active'
    AND (
      c.customer_id = v_user_id
      OR EXISTS (
        SELECT 1 FROM public.pro_profiles pp
        WHERE pp.id = c.professional_id AND pp.user_id = v_user_id
      )
    )
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'CONVERSATION_UNAVAILABLE', 'error', 'This conversation is unavailable or inactive.');
  END IF;

  SELECT * INTO v_spend
  FROM public.spend_credits(
    v_user_id,
    'pro_connect_message',
    5,
    'pro_message_' || p_idempotency_key,
    jsonb_build_object('conversation_id', p_conversation_id, 'message_request_id', p_idempotency_key)
  );
  IF NOT COALESCE(v_spend.success, false) THEN
    RETURN jsonb_build_object(
      'success', false,
      'code', CASE WHEN v_spend.error = 'insufficient_credits' THEN 'INSUFFICIENT_CREDITS' ELSE 'CREDIT_SPEND_FAILED' END,
      'error', COALESCE(v_spend.error, 'Could not charge credits.'),
      'required_credits', 5,
      'current_balance', v_spend.new_balance
    );
  END IF;
  IF v_spend.error = 'already_spent' THEN
    -- A spent request with no corresponding message should not send free content.
    RETURN jsonb_build_object('success', false, 'code', 'REQUEST_ALREADY_USED', 'error', 'This send request was already used. Please retry with a new message.');
  END IF;

  INSERT INTO public.pro_messages (
    conversation_id, sender_id, body, attachment_url, client_request_id
  ) VALUES (
    p_conversation_id, v_user_id, btrim(p_body), p_attachment_url, p_idempotency_key
  ) RETURNING * INTO v_message;

  UPDATE public.pro_conversations
  SET last_message_at = v_message.created_at, updated_at = now()
  WHERE id = p_conversation_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', to_jsonb(v_message),
    'new_balance', v_spend.new_balance,
    'cost', 5
  );
END;
$$;

REVOKE ALL ON FUNCTION public.send_pro_message_with_credits(uuid, text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.send_pro_message_with_credits(uuid, text, text, text) TO authenticated;

-- Enable realtime delivery when these tables are not already published.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'pro_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pro_messages;
  END IF;
END $$;

-- Safe participant-specific conversation list, including the other party's
-- public display identity without broadening profiles table RLS.
CREATE OR REPLACE FUNCTION public.get_my_pro_conversations()
RETURNS TABLE (
  conversation jsonb,
  other_party jsonb,
  last_message_body text,
  unread_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    to_jsonb(c),
    CASE WHEN c.customer_id = auth.uid() THEN
      jsonb_build_object(
        'user_id', pp.user_id,
        'display_name', COALESCE(NULLIF(pp.display_name, ''), NULLIF(pp.business_name, ''), 'Professional'),
        'business_name', pp.business_name,
        'avatar_url', pp.profile_image_url,
        'slug', pp.slug,
        'is_pro', true
      )
    ELSE
      jsonb_build_object(
        'user_id', c.customer_id,
        'display_name', COALESCE(NULLIF(customer_pro.display_name, ''), NULLIF(customer_pro.business_name, ''), 'Customer'),
        'business_name', customer_pro.business_name,
        'avatar_url', customer_pro.profile_image_url,
        'slug', customer_pro.slug,
        'is_pro', customer_pro.id IS NOT NULL
      )
    END,
    (SELECT m.body FROM public.pro_messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC, m.id DESC LIMIT 1),
    (SELECT count(*)::bigint FROM public.pro_messages m WHERE m.conversation_id = c.id AND m.sender_id <> auth.uid() AND m.is_read = false)
  FROM public.pro_conversations c
  JOIN public.pro_profiles pp ON pp.id = c.professional_id
  LEFT JOIN LATERAL (
    SELECT p.id, p.display_name, p.business_name, p.profile_image_url, p.slug
    FROM public.pro_profiles p
    WHERE p.user_id = c.customer_id
    ORDER BY p.is_profile_complete DESC, p.created_at DESC
    LIMIT 1
  ) customer_pro ON true
  WHERE auth.uid() IS NOT NULL
    AND (c.customer_id = auth.uid() OR pp.user_id = auth.uid())
  ORDER BY COALESCE(c.last_message_at, c.created_at) DESC;
$$;
REVOKE ALL ON FUNCTION public.get_my_pro_conversations() FROM public;
GRANT EXECUTE ON FUNCTION public.get_my_pro_conversations() TO authenticated;
