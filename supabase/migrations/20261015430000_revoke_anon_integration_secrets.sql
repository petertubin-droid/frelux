-- =========================================================
-- FRELUX 20261015430000: HARDEN integration_secrets GRANTS
--
-- Defense-in-depth follow-up to 20261015420000.
--
-- Supabase grants SELECT on all public tables to `anon` by
-- default. RLS already blocks anon from reading any row (no
-- anon policy exists), but this table stores raw provider API
-- keys — an accidental `disable row level security` would
-- instantly expose them. Revoking the anon table grant closes
-- that path permanently: even with RLS off, anon has no SELECT
-- privilege at all.
--
-- `authenticated` KEEPS its grant: the admin-only RLS policies
-- (integration_secrets_admin_select etc.) rely on it, and the
-- admin UI reads only masked metadata (never key_value).
-- =========================================================

REVOKE SELECT ON public.integration_secrets FROM anon;

-- integration_keys_public stays readable by anon + authenticated:
-- it only ever exposes client_visible keys (by design public,
-- same exposure as the equivalent build-time env var).
