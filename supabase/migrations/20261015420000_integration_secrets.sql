-- =========================================================
-- FRELUX 20261015420000: EXTERNAL PROVIDER API KEYS (admin slots)
--
-- Operator-pasteable API keys for external providers (Resend,
-- OpenWeather, Open Exchange Rates, ...). The admin can insert
-- a key at any time in Admin → Integration Center; providers
-- activate the moment a key row exists.
--
-- Security model (least privilege):
--   * Base table `integration_secrets` is ADMIN-ONLY: no anon or
--     authenticated policy at all. Only the admin UI (via RLS)
--     and edge functions (via service role) can touch it.
--   * The admin UI never selects key_value — it reads the
--     masked metadata (key_last4, status, timestamps) only.
--     The raw value is selected solely by service-role edge
--     functions at call time.
--   * Client-safe keys (OpenWeather — already shipped in the
--     JS bundle via VITE_ env, so equally public by design)
--     are exposed through the *view* `integration_keys_public`,
--     which only ever returns rows explicitly flagged
--     client_visible = true AND status = 'active'.
--   * Server-side keys (Resend) are never client_visible; the
--     view can never leak them.
-- =========================================================

create table if not exists public.integration_secrets (
  provider_id text primary key,
  key_value text not null,
  key_last4 text not null,
  client_visible boolean not null default false,
  status text not null default 'active'
    check (status in ('active', 'disabled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);

comment on table public.integration_secrets is
  'Operator-pasted external provider API keys. Admin-only; edge functions read via service role. Client-safe keys are exposed only through integration_keys_public.';

alter table public.integration_secrets enable row level security;

-- No anon/authenticated policies on the base table on purpose.
drop policy if exists "integration_secrets_admin_select" on public.integration_secrets;
create policy "integration_secrets_admin_select"
  on public.integration_secrets for select
  to authenticated
  using (public.is_admin());

drop policy if exists "integration_secrets_admin_insert" on public.integration_secrets;
create policy "integration_secrets_admin_insert"
  on public.integration_secrets for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "integration_secrets_admin_update" on public.integration_secrets;
create policy "integration_secrets_admin_update"
  on public.integration_secrets for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "integration_secrets_admin_delete" on public.integration_secrets;
create policy "integration_secrets_admin_delete"
  on public.integration_secrets for delete
  to authenticated
  using (public.is_admin());

-- Edge functions (service role) need explicit grants.
grant select, insert, update on public.integration_secrets to service_role;

-- ---------------------------------------------------------
-- Public view for CLIENT-SAFE provider keys only
-- (e.g. OpenWeather, whose appid is already public in the
-- shipped bundle). Server keys (Resend) are never returned.
-- ---------------------------------------------------------
create or replace view public.integration_keys_public as
  select
    provider_id,
    key_value,
    updated_at
  from public.integration_secrets
  where status = 'active' and client_visible = true;

grant select on public.integration_keys_public to anon, authenticated;

comment on view public.integration_keys_public is
  'Client-safe provider keys (client_visible, active). Never returns server-side keys such as Resend.';
