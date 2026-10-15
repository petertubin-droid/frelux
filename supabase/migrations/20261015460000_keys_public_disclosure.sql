-- =========================================================
-- FRELUX 20261015460000: integration_keys_public DISCLOSURE FIX
--
-- Bug found while wiring push notifications: the view only
-- returned rows with client_visible = true, so SERVER-SIDE
-- providers (Resend, Web Push private) never appeared — the
-- client's honest "configured?" chips could never turn true,
-- even after an admin pasted a key.
--
-- Fix (additive, no data change, column order preserved — the
-- existing (provider_id, key_value, updated_at) order is kept
-- so all running clients keep working):
--   * ALL active rows are now visible in the view.
--   * key_value is nulled for rows that are NOT client_visible,
--     so raw server-side secrets (Resend, VAPID private) are
--     still NEVER exposed — only their PRESENCE is disclosed,
--     which is exactly what the UI chips need.
--   * client_visible rows (OpenWeather, VAPID public) keep
--     their key_value, as public-by-design values.
-- =========================================================

drop view if exists public.integration_keys_public;

create view public.integration_keys_public as
  select
    provider_id,
    case when client_visible then key_value else null end as key_value,
    updated_at,
    status
  from public.integration_secrets
  where status = 'active';

grant select on public.integration_keys_public to anon, authenticated;

comment on view public.integration_keys_public is
  'Active provider keys. key_value is exposed ONLY for client_visible rows; server-side rows appear with a null value so the UI can honestly disclose configuration state without leaking secrets.';
