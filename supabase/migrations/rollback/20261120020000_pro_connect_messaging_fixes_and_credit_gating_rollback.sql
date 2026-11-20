-- Remove the atomic charge-and-send endpoint. Preserve any user-owned credit
-- configuration by restoring the previous Pro Connect feature row if one exists.
DROP FUNCTION IF EXISTS public.send_pro_message_with_credits(uuid, text, text, text);
DROP INDEX IF EXISTS public.pro_messages_sender_request_unique;
ALTER TABLE public.pro_messages DROP COLUMN IF EXISTS client_request_id;
DELETE FROM public.ai_feature_costs WHERE feature_key = 'pro_connect_message';
-- NOTE: Removing pro_messages from the shared realtime publication is not safe
-- in a rollback because another feature may depend on that publication entry.
DROP FUNCTION IF EXISTS public.get_my_pro_conversations();
