-- =========================================================
-- Pro Connect messaging reliability & conversation status
-- =========================================================
-- Fixes pro messaging delivery failure where send_pro_message_with_credits
-- required c.status = 'active', but the status column was never explicitly
-- added to public.pro_conversations.

ALTER TABLE public.pro_conversations
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

ALTER TABLE public.pro_conversations
  DROP CONSTRAINT IF EXISTS pro_conversations_status_check;

ALTER TABLE public.pro_conversations
  ADD CONSTRAINT pro_conversations_status_check
  CHECK (status IN ('active', 'archived', 'blocked'));

COMMENT ON COLUMN public.pro_conversations.status IS
  'Conversation lifecycle status: active (default), archived, or blocked.';

-- Ensure authenticated role can read and update status on pro_conversations
GRANT SELECT, INSERT, UPDATE ON public.pro_conversations TO authenticated;

-- Hardened message send RPC with status fallback and credit protection
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
    AND (c.status IS NULL OR c.status = 'active')
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
