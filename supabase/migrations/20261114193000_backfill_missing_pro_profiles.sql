-- Backfill professional profiles for accounts already marked pro_worker.
--
-- An account can carry account_type = 'pro_worker' with no pro_profiles row:
-- general signup sets the account type, while only the Pro Connect flow (or an
-- admin invite) creates the professional record. Such an account is invisible
-- in every Pro Connect register, and editing it from the admin screen failed
-- with "This account has no professional profile".
--
-- The rows are created unlisted on purpose. A profile with no trade category,
-- service area or bio should not be published automatically; the admin lists it
-- once those are set ("List this professional in the directory").

INSERT INTO public.pro_profiles (
  user_id, display_name, slug, availability, is_listed, verification_status
)
SELECT
  p.id,
  COALESCE(NULLIF(btrim(p.full_name), ''), split_part(p.email, '@', 1)),
  trim(both '-' from lower(regexp_replace(
    COALESCE(NULLIF(btrim(p.full_name), ''), split_part(p.email, '@', 1)),
    '[^a-zA-Z0-9]+', '-', 'g'
  ))) || '-' || substr(md5(random()::text), 1, 5),
  'available',
  false,
  'unverified'
FROM public.profiles p
LEFT JOIN public.pro_profiles pp ON pp.user_id = p.id
WHERE p.account_type = 'pro_worker'
  AND pp.id IS NULL;
