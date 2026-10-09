-- =========================================================
-- Newsletter + weekly price digest (Phase 12 retention)
--
-- 1. newsletter_subscribers: emails gathered by the site-wide
--    footer signup. Only the edge functions (service role)
--    read or write this table; anon/authenticated get nothing.
--
-- 2. price_digest_tokens: per-installation token that the
--    weekly pg_cron job passes to the price-digest edge
--    function (same pattern as signup_digest_tokens).
--
-- 3. Weekly cron (Mondays 07:15 UTC = 08:15 Lagos) calling
--    price-digest, which emails active subscribers the
--    current tracked material prices with week-over-week
--    changes.
--
-- NOTE: the URL hardcodes the freluxproject ref, matching the
-- signup-digest migration. If the Supabase project moves,
-- update it here and re-run the schedule block.
-- =========================================================

-- 1. Subscribers -------------------------------------------
create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  status text not null default 'active'
    check (status in ('active', 'unsubscribed')),
  unsub_token text not null unique,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.newsletter_subscribers enable row level security;

-- Explicit grant to service role only: this project's default
-- privileges miss new tables (phase33 lesson), and both edge
-- functions run as service role. No anon/authenticated grant
-- on purpose: subscription writes go through the
-- subscribe-newsletter edge function only.
grant select, insert, update, delete on public.newsletter_subscribers to service_role;

-- 2. Digest token --------------------------------------------
create table if not exists public.price_digest_tokens (
  token text primary key,
  created_at timestamptz not null default now()
);

alter table public.price_digest_tokens enable row level security;
grant select, insert, update, delete on public.price_digest_tokens to service_role;

-- One token per installation (idempotent insert).
insert into public.price_digest_tokens (token)
select gen_random_uuid()::text
where not exists (select 1 from public.price_digest_tokens);

-- 3. Weekly schedule ------------------------------------------
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Unschedule any previous version first (idempotent).
select cron.unschedule('price-digest-weekly')
  where exists (select 1 from cron.job where jobname = 'price-digest-weekly');

select cron.schedule(
  'price-digest-weekly',
  '15 7 * * 1',
  $$
  select net.http_post(
    url := 'https://nfgaaohweygwydoelxnf.supabase.co/functions/v1/price-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-digest-token', (select token from public.price_digest_tokens limit 1)
    ),
    body := jsonb_build_object('{}')
  );
  $$
);
