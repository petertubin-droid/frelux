-- =========================================================
-- Public contact email for a listed professional
-- =========================================================
-- A professional who is not online cannot answer a platform message, so the
-- only channel that still reaches them is one outside it. The phone number
-- already has a guarded path (get_pro_public_phone), but that path is
-- deliberately closed until escrow is funded, which is the right trade for a
-- number: it rings a person, and it is the channel the safety settings exist to
-- protect. Email is different. It is the professional's own published address,
-- it is opt-in per profile (contact_email_public), it is asynchronous, and it is
-- the same channel the site's contact form already uses.
--
-- So this returns an address only when the professional has published one, and
-- it does not apply the escrow gate. That is a product decision, recorded here
-- so nobody "fixes" it later by accident: the gate is on the intrusive channel,
-- not on every way of reaching someone.
--
-- The address comes from the account's profiles.email rather than a column on
-- pro_profiles, because that is the address the professional actually signs in
-- with and the only one the platform can vouch for. profiles is own-or-admin
-- under RLS, so a visitor can never read it directly; this function is the only
-- door, and it opens for one listed slug at a time.

CREATE OR REPLACE FUNCTION public.get_pro_public_email(p_slug text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_email text;
BEGIN
  SELECT p.email
    INTO v_email
  FROM public.pro_profiles pp
  JOIN public.profiles p ON p.id = pp.user_id
  WHERE pp.slug = p_slug
    AND pp.is_listed = true
    AND pp.contact_email_public = true
    AND p.email IS NOT NULL
    AND p.email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  LIMIT 1;

  RETURN v_email;
END
$function$;

COMMENT ON FUNCTION public.get_pro_public_email(text) IS
  'The published contact email for one listed professional, or NULL when they have not opted in (contact_email_public). Deliberately not escrow-gated; see the migration comment.';

REVOKE ALL ON FUNCTION public.get_pro_public_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_pro_public_email(text) TO anon, authenticated;
