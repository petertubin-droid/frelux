-- 20261031210000_ad_campaigns.sql
-- FRELUX Ad Manager: first-party campaign engine.
--
-- Extends the existing advertising stack (ad_providers / ad_placements /
-- ad_analytics_events) with campaigns we sell or run ourselves, without
-- touching network inventory. Campaigns can be internal promotions today and
-- paid/sponsored placements later; the record already carries the advertiser,
-- sponsorship designation and target market so nothing has to be rebuilt.
--
-- ROLLBACK: supabase/migrations/rollback/20261031210000_ad_campaigns_rollback.sql

begin;

create table if not exists public.ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  -- A campaign is either FRELUX promoting itself or a paying sponsor.
  campaign_type text not null default 'internal'
    check (campaign_type in ('internal', 'sponsored', 'house')),
  status text not null default 'draft'
    check (status in ('draft', 'active', 'paused', 'ended', 'archived')),
  format text not null default 'banner'
    check (format in ('banner', 'native', 'compact')),
  headline text not null,
  description text,
  cta_label text not null default 'Learn more',
  destination_url text not null,
  is_external boolean not null default false,
  image_url text,
  image_alt text,
  advertiser_name text,
  advertiser_logo_url text,
  -- True when money changed hands: prints the Sponsored label.
  is_sponsored boolean not null default false,
  target_markets text[] not null default array['ALL'],
  placements text[] not null default array[]::text[],
  target_tools text[] not null default array[]::text[],
  target_categories text[] not null default array[]::text[],
  target_devices text[] not null default array['desktop', 'tablet', 'mobile'],
  priority integer not null default 50 check (priority between 0 and 100),
  weight integer not null default 1 check (weight between 1 and 100),
  starts_at timestamptz,
  ends_at timestamptz,
  max_impressions integer,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at),
  check (is_sponsored = false or advertiser_name is not null)
);

create index if not exists ad_campaigns_active_idx
  on public.ad_campaigns (status, priority desc, created_at desc);
create index if not exists ad_campaigns_placements_idx
  on public.ad_campaigns using gin (placements);

create table if not exists public.ad_campaign_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.ad_campaigns(id) on delete cascade,
  event_type text not null check (event_type in ('impression', 'click', 'conversion')),
  placement text,
  tool_key text,
  market_code text,
  device text check (device is null or device in ('desktop', 'tablet', 'mobile')),
  session_id text,
  user_id uuid,
  value numeric,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ad_campaign_events_campaign_idx
  on public.ad_campaign_events (campaign_id, event_type, created_at desc);
create index if not exists ad_campaign_events_placement_idx
  on public.ad_campaign_events (placement, created_at desc);
-- One impression per campaign per slot per session per day. A refresh is not a
-- new viewer, and an inflated impression count is a false advertising claim.
create unique index if not exists ad_campaign_events_impression_once_idx
  on public.ad_campaign_events (campaign_id, placement, session_id, ((created_at at time zone 'utc')::date))
  where event_type = 'impression' and session_id is not null;

create table if not exists public.ad_campaign_audit (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid,
  action text not null,
  actor_id uuid,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ad_campaign_audit_campaign_idx
  on public.ad_campaign_audit (campaign_id, created_at desc);

-- Keep updated_at honest without relying on the client.
create or replace function public.ad_campaigns_touch()
returns trigger
language plpgsql
as $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

drop trigger if exists ad_campaigns_touch on public.ad_campaigns;
create trigger ad_campaigns_touch
  before update on public.ad_campaigns
  for each row execute function public.ad_campaigns_touch();

-- Every change to a campaign is recorded with the person who made it. This is
-- the trail a sponsor asks for when they query what ran and when.
create or replace function public.ad_campaigns_audit_row()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  action_name text;
begin
  action_name := lower(tg_op);
  insert into public.ad_campaign_audit (campaign_id, action, actor_id, before, after)
  values (
    coalesce(new.id, old.id),
    action_name,
    auth.uid(),
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$function$;

drop trigger if exists ad_campaigns_audit on public.ad_campaigns;
create trigger ad_campaigns_audit
  after insert or update or delete on public.ad_campaigns
  for each row execute function public.ad_campaigns_audit_row();

-- ── Row level security ────────────────────────────────────────────
alter table public.ad_campaigns enable row level security;
alter table public.ad_campaign_events enable row level security;
alter table public.ad_campaign_audit enable row level security;

drop policy if exists "ad campaigns public read live" on public.ad_campaigns;
create policy "ad campaigns public read live" on public.ad_campaigns
  for select to anon, authenticated
  using (
    status = 'active'
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
  );

drop policy if exists "ad campaigns admin read" on public.ad_campaigns;
create policy "ad campaigns admin read" on public.ad_campaigns
  for select to authenticated
  using (public.is_admin());

drop policy if exists "ad campaigns admin write" on public.ad_campaigns;
create policy "ad campaigns admin write" on public.ad_campaigns
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "ad campaign events admin read" on public.ad_campaign_events;
create policy "ad campaign events admin read" on public.ad_campaign_events
  for select to authenticated
  using (public.is_admin());

drop policy if exists "ad campaign audit admin read" on public.ad_campaign_audit;
create policy "ad campaign audit admin read" on public.ad_campaign_audit
  for select to authenticated
  using (public.is_admin());

-- ── Event recording ───────────────────────────────────────────────
-- Visitors never insert rows directly: the function validates the campaign is
-- genuinely live, constrains the event vocabulary, and ignores impressions that
-- repeat in the same session. A click is a click; a conversion is only ever
-- recorded by an authorised flow with a value, never inferred from a click.
create or replace function public.record_ad_event(
  p_campaign_id uuid,
  p_event_type text,
  p_placement text default null,
  p_tool_key text default null,
  p_market_code text default null,
  p_device text default null,
  p_session_id text default null,
  p_value numeric default null
)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  campaign public.ad_campaigns;
begin
  if p_event_type not in ('impression', 'click', 'conversion') then
    return false;
  end if;

  select * into campaign from public.ad_campaigns where id = p_campaign_id;
  if campaign.id is null then
    return false;
  end if;

  -- Only live campaigns accumulate events. A paused campaign stops counting.
  if campaign.status <> 'active'
     or (campaign.starts_at is not null and campaign.starts_at > now())
     or (campaign.ends_at is not null and campaign.ends_at <= now()) then
    return false;
  end if;

  begin
    insert into public.ad_campaign_events (
      campaign_id, event_type, placement, tool_key, market_code, device,
      session_id, user_id, value
    ) values (
      p_campaign_id, p_event_type, p_placement, p_tool_key, p_market_code,
      case when p_device in ('desktop', 'tablet', 'mobile') then p_device end,
      left(coalesce(p_session_id, ''), 64), auth.uid(), p_value
    );
  exception when unique_violation then
    return false;
  end;

  return true;
end;
$function$;

revoke all on function public.record_ad_event(uuid, text, text, text, text, text, text, numeric) from public;
grant execute on function public.record_ad_event(uuid, text, text, text, text, text, text, numeric) to anon, authenticated;

grant select on public.ad_campaigns to anon, authenticated;
grant insert, update, delete on public.ad_campaigns to authenticated;
grant select on public.ad_campaign_events to authenticated;
grant select on public.ad_campaign_audit to authenticated;
grant all on public.ad_campaigns, public.ad_campaign_events, public.ad_campaign_audit to service_role;
grant execute on function public.ad_campaigns_audit_row() to authenticated, service_role;

-- ── First-party campaigns ─────────────────────────────────────────
-- Eight internal placements, one per calculator, written as real offers with
-- honest copy. They are safe to run immediately and are the reference for what
-- a paid campaign row looks like.
insert into public.ad_campaigns (
  name, slug, campaign_type, status, format, headline, description, cta_label,
  destination_url, is_external, is_sponsored, placements, target_tools,
  target_markets, priority, image_alt, advertiser_name
) values
  ('Smart colour assistant', 'internal-smart-color', 'internal', 'active', 'native',
   'Not sure which colour suits that wall?',
   'Describe the room and the FRELUX Smart Colour Assistant suggests paint shades that fit the light, size and finish.',
   'Try the colour assistant', '/color-consultant', false, false,
   array['calculator_results'], array['paint'], array['ALL'], 70,
   'Paint swatches fanned out beside a painted wall', 'FRELUX'),
  ('Tile suppliers and Pro Connect', 'internal-tile-suppliers', 'internal', 'active', 'banner',
   'Buy tiles from suppliers we can check',
   'Compare live tile prices across verified merchants, or hire a tiler through Pro Connect.',
   'Browse tile suppliers', '/marketplace?category=tiles', false, false,
   array['calculator_results'], array['tile'], array['ALL'], 70,
   'Stacked floor tiles in a showroom', 'FRELUX'),
  ('Cement supplier prices', 'internal-cement-suppliers', 'internal', 'active', 'banner',
   'Cement prices move. Check before you order.',
   'The Building Materials Marketplace shows current cement prices by city, with the source of each price.',
   'See cement prices', '/marketplace?category=cement', false, false,
   array['calculator_results'], array['cement'], array['ALL'], 70,
   'Bags of cement stacked on a pallet', 'FRELUX'),
  ('Build-to-Roof estimator', 'internal-build-to-roof', 'internal', 'active', 'native',
   'Price the roof before the roofers quote',
   'The Build-to-Roof estimator breaks the structure into measurable materials, so you compare quotes line by line.',
   'Open the estimator', '/build-to-roof', false, false,
   array['calculator_results'], array['roofing'], array['ALL'], 70,
   'Timber roof trusses on a new build', 'FRELUX'),
  ('Foundation planning tools', 'internal-foundation-tools', 'internal', 'active', 'native',
   'Get the foundation right the first time',
   'Check depth, concrete volume and reinforcement, then price the materials before work starts.',
   'Plan a foundation', '/foundation-calculator', false, false,
   array['calculator_results'], array['foundation'], array['ALL'], 70,
   'Reinforcement bars laid out in a foundation trench', 'FRELUX'),
  ('Electrical materials and electricians', 'internal-electrical', 'internal', 'active', 'banner',
   'Buy electrical materials from verified sellers',
   'Compare cable, conduit and fitting prices, or find a verified electrician through Pro Connect.',
   'Find electrical suppliers', '/marketplace?category=electrical', false, false,
   array['calculator_results'], array['electrical'], array['ALL'], 70,
   'Electrical cables and distribution board', 'FRELUX'),
  ('Solar equipment and installers', 'internal-solar', 'internal', 'active', 'banner',
   'Size the solar system, then buy the parts',
   'Run the solar estimator, then compare panels, batteries and inverters from suppliers near you.',
   'Compare solar suppliers', '/marketplace?category=solar', false, false,
   array['calculator_results'], array['solar'], array['ALL'], 70,
   'Solar panels on a residential roof', 'FRELUX'),
  ('FRELUX Pro', 'internal-frelux-pro', 'internal', 'active', 'native',
   'Keep every estimate, export it as a PDF',
   'FRELUX Pro saves your estimates, exports client-ready PDFs and unlocks advanced estimation.',
   'See what Pro includes', '/pricing', false, false,
   array['calculator_results'], array['cost'], array['ALL'], 80,
   'Printed construction estimate on a desk', 'FRELUX')
on conflict (slug) do nothing;

commit;
