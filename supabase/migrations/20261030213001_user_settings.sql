-- =========================================================
-- user_settings: one row per account for the Global Settings Engine.
--
-- Guests keep preferences in localStorage. Signed-in users get this row so
-- their country, units, currency and regional conventions follow them to any
-- device. Every column is nullable on purpose: a null means "follow the
-- country default", which is what lets a single country change re-derive
-- everything the user has not explicitly taken control of.
-- =========================================================

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  country_code text check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  measurement_system text check (measurement_system is null or measurement_system in ('metric','imperial')),
  currency_code text check (currency_code is null or currency_code ~ '^[A-Z]{3}$'),
  language text check (language is null or language ~ '^[a-z]{2}(-[a-z]{2})?$'),
  number_format jsonb,
  regional jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

drop policy if exists "user_settings select own" on public.user_settings;
create policy "user_settings select own" on public.user_settings
  for select using (auth.uid() = user_id);

drop policy if exists "user_settings insert own" on public.user_settings;
create policy "user_settings insert own" on public.user_settings
  for insert with check (auth.uid() = user_id);

drop policy if exists "user_settings update own" on public.user_settings;
create policy "user_settings update own" on public.user_settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "user_settings delete own" on public.user_settings;
create policy "user_settings delete own" on public.user_settings
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete on public.user_settings to authenticated;

comment on table public.user_settings is
  'Per-account preferences for the FRELUX Global Settings Engine. Null columns follow the country default.';
