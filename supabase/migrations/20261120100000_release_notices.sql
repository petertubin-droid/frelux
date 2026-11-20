-- Release notices
--
-- A notice is published, lives for 24 hours, and disappears on its own. The app
-- reads this table at runtime, so publishing needs no deploy, and the Netlify
-- build pause does not stop a notice from reaching users.
--
-- Deliberately not a changelog: changelogs are read by people looking for them.
-- These are for changes that alter something a user already saved.

create table if not exists public.release_notices (
  id uuid primary key default gen_random_uuid(),
  notice_key text unique,
  title text not null,
  body text not null,
  category text,
  published_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint release_notices_window check (expires_at > published_at)
);

create index if not exists release_notices_live_idx
  on public.release_notices (published_at desc)
  where is_active;

alter table public.release_notices enable row level security;

-- Readers see only live notices. Writing is service_role only: there is no
-- insert policy, so an anonymous or signed-in caller cannot publish one.
drop policy if exists release_notices_read_live on public.release_notices;
create policy release_notices_read_live
  on public.release_notices
  for select
  to anon, authenticated
  using (is_active and published_at <= now() and expires_at > now());

comment on table public.release_notices is
  'Short lived site notices. Publish a row to show it for 24 hours; the app reads it at runtime.';
