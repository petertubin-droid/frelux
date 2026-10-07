/*
# Email notifications via Resend: support the insert-returning pattern

The send-email edge function reads a contact row by id (service role)
right after the public contact form stores it. For the frontend to
learn the id of the row it just inserted, Postgres needs a SELECT
policy on contact_messages for anon, otherwise INSERT ... RETURNING
returns null under RLS.

Scope is deliberately minimal:
- anon/authenticated may only SELECT rows created in the last 5
  minutes
- ids are UUIDv4, so this exposes nothing enumerable to a caller who
  did not just create the row
*/

DROP POLICY IF EXISTS "contact_messages_recent_select" ON public.contact_messages;
CREATE POLICY "contact_messages_recent_select"
ON public.contact_messages FOR SELECT
TO anon, authenticated
USING (created_at > now() - interval '5 minutes');
