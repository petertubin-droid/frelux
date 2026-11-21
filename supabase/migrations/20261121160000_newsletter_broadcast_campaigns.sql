-- =========================================================
-- Newsletter Broadcast Campaigns & Automated Scheduler
--
-- Enables administrators to compose, preview, schedule, and
-- broadcast emails to active newsletter subscribers for:
--  - Weekly price updates & market intelligence digests
--  - Product improvements, fixes, & engine updates
--  - New feature releases & calculator launches
--  - General announcements & seasonal updates
--
-- Features:
--  1. newsletter_campaigns: records campaign metadata, body,
--     category, dynamic snapshot flags, scheduling timer,
--     and delivery statistics.
--  2. newsletter_campaign_deliveries: per-subscriber delivery
--     audit log with delivery timestamps and failure tracking.
--  3. newsletter_scheduler_tokens: secure internal token for
--     pg_cron to trigger scheduled dispatches via edge function.
--  4. Admin RLS policies allowing verified operators to manage
--     broadcasts and inspect subscriber lists.
-- =========================================================

-- 1. Broadcast Campaigns -----------------------------------
create table if not exists public.newsletter_campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subject text not null,
  preview_text text,
  campaign_type text not null default 'general_announcement'
    check (campaign_type in ('weekly_price_update', 'new_feature', 'improvement', 'general_announcement', 'custom')),
  target_audience text not null default 'all_active'
    check (target_audience in ('all_active', 'price_alerts_only', 'custom_test')),
  content_html text not null,
  content_text text not null,
  cta_label text,
  cta_url text,
  include_price_snapshot boolean not null default false,
  include_recent_updates boolean not null default false,
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'sending', 'sent', 'cancelled', 'failed')),
  scheduled_for timestamptz,
  sent_at timestamptz,
  total_recipients integer not null default 0,
  successful_sends integer not null default 0,
  failed_sends integer not null default 0,
  error_log text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists newsletter_campaigns_status_idx
  on public.newsletter_campaigns (status, scheduled_for);

create index if not exists newsletter_campaigns_created_at_idx
  on public.newsletter_campaigns (created_at desc);

alter table public.newsletter_campaigns enable row level security;

-- 2. Delivery Audit Log ------------------------------------
create table if not exists public.newsletter_campaign_deliveries (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.newsletter_campaigns(id) on delete cascade,
  subscriber_id uuid references public.newsletter_subscribers(id) on delete set null,
  email text not null,
  status text not null default 'pending'
    check (status in ('pending', 'delivered', 'failed')),
  error_message text,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists newsletter_deliveries_campaign_idx
  on public.newsletter_campaign_deliveries (campaign_id, status);

alter table public.newsletter_campaign_deliveries enable row level security;

-- 3. Grants & RLS Policies ---------------------------------
grant select, insert, update, delete on public.newsletter_campaigns to authenticated, service_role;
grant select, insert, update, delete on public.newsletter_campaign_deliveries to authenticated, service_role;

-- Allow verified admins to manage campaigns
drop policy if exists "Admins can manage newsletter campaigns" on public.newsletter_campaigns;
create policy "Admins can manage newsletter campaigns"
  on public.newsletter_campaigns
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Allow verified admins to view deliveries
drop policy if exists "Admins can manage newsletter deliveries" on public.newsletter_campaign_deliveries;
create policy "Admins can manage newsletter deliveries"
  on public.newsletter_campaign_deliveries
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Allow verified admins to view subscriber lists and stats
grant select on public.newsletter_subscribers to authenticated;

drop policy if exists "Admins can view newsletter subscribers" on public.newsletter_subscribers;
create policy "Admins can view newsletter subscribers"
  on public.newsletter_subscribers
  for select
  to authenticated
  using (public.is_admin());

-- 4. Scheduler Tokens & Automation Trigger -----------------
create table if not exists public.newsletter_scheduler_tokens (
  token text primary key,
  created_at timestamptz not null default now()
);

alter table public.newsletter_scheduler_tokens enable row level security;
grant select, insert, update, delete on public.newsletter_scheduler_tokens to service_role;

-- Idempotent token creation
insert into public.newsletter_scheduler_tokens (token)
select gen_random_uuid()::text
where not exists (select 1 from public.newsletter_scheduler_tokens);

-- 5. pg_cron Recurring Scheduler ---------------------------
-- Checks every 5 minutes for scheduled broadcasts that are due
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('newsletter-campaign-dispatcher')
  where exists (select 1 from cron.job where jobname = 'newsletter-campaign-dispatcher');

select cron.schedule(
  'newsletter-campaign-dispatcher',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://nfgaaohweygwydoelxnf.supabase.co/functions/v1/broadcast-campaign',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-scheduler-token', (select token from public.newsletter_scheduler_tokens limit 1)
    ),
    body := jsonb_build_object('action', 'dispatch_scheduled')
  );
  $$
);
