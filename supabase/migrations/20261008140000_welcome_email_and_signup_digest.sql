-- =========================================================
-- Welcome email + daily signup digest (owner directive 2026-10-08)
--
-- 1. profiles.welcome_email_sent: at-most-once guard for the
--    send-welcome-email edge function. Every signup path (email,
--    Google, OTP) triggers it through the client; existing users
--    are backfilled to TRUE so they never receive a belated
--    "welcome" email.
--
-- 2. signup_digest_tokens: per-installation token that the daily
--    pg_cron job passes to the signup-digest edge function. The
--    function reads it from this table (service role), so no extra
--    function secret is needed to bootstrap.
--
-- 3. Daily cron (07:05 UTC = 08:05 Lagos) calling signup-digest.
--
-- Follows the archie_scheduler pattern (pg_cron + pg_net).
-- NOTE: the URL hardcodes the freluxproject ref. If the Supabase
-- project moves again, update it here and re-run the schedule
-- block.
-- =========================================================

-- 1. Welcome-email flag -------------------------------------
alter table public.profiles
  add column if not exists welcome_email_sent boolean not null default false;

-- Existing accounts never get the welcome email; only users who
-- register AFTER this migration do.
update public.profiles
  set welcome_email_sent = true
  where welcome_email_sent = false;

-- 2. Digest token --------------------------------------------
create table if not exists public.signup_digest_tokens (
  token text primary key,
  created_at timestamptz not null default now()
);
alter table public.signup_digest_tokens enable row level security;

-- Explicit grants: this project's default privileges only hand
-- service_role TRIGGER/REFERENCES/TRUNCATE on new tables, and the
-- signup-digest function (service role) SELECTs this table. No
-- anon/authenticated grant on purpose: the token must stay secret.
grant select, insert, update, delete on public.signup_digest_tokens to service_role;

-- One token per installation (idempotent insert).
insert into public.signup_digest_tokens (token)
select gen_random_uuid()::text
where not exists (select 1 from public.signup_digest_tokens);

-- 3. Daily schedule ------------------------------------------
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Unschedule any previous version first (idempotent).
select cron.unschedule('signup-digest-daily')
  where exists (select 1 from cron.job where jobname = 'signup-digest-daily');

select cron.schedule(
  'signup-digest-daily',
  '5 7 * * *',
  $$
  select net.http_post(
    url := 'https://nfgaaohweygwydoelxnf.supabase.co/functions/v1/signup-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-digest-token', (select token from public.signup_digest_tokens limit 1)
    ),
    body := jsonb_build_object('{}')
  );
  $$
);
