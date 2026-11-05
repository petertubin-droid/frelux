-- =========================================================
-- Product updates + three day what's new digest
--
-- 1. product_updates: the single source of truth for what
--    shipped and when. The public site may read published
--    rows (a future /updates page), everything else is
--    service role only.
--
-- 2. product_update_deliveries: one row per subscriber per
--    update that has been emailed, so the every-three-days
--    job can never repeat an announcement and a brand new
--    subscriber still receives the recent ones they missed.
--
-- 3. product_updates_digest_tokens: per-installation token
--    the cron passes to the edge function (same pattern as
--    price_digest_tokens / signup_digest_tokens).
--
-- 4. Schedule: every three days at 08:00 UTC (09:00 Lagos).
--    The job sends nothing when there is nothing new, so a
--    quiet week is silent instead of a hollow email.
--
-- NOTE: the URL hardcodes the freluxproject ref, matching
-- the price digest migration. If the project moves, update
-- this block and re-run the schedule.
-- =========================================================

-- 1. Updates ------------------------------------------------
create table if not exists public.product_updates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text not null,
  body text,
  category text not null default 'feature'
    check (category in ('feature', 'improvement', 'fix', 'security')),
  product_area text,
  link_path text,
  is_highlight boolean not null default false,
  is_published boolean not null default true,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_updates_published_idx
  on public.product_updates (is_published, published_at desc);

alter table public.product_updates enable row level security;

-- This project's default privileges miss new tables, so both
-- grants are explicit. Anonymous readers only ever see rows
-- that are published.
grant select on public.product_updates to anon, authenticated;
grant select, insert, update, delete on public.product_updates to service_role;

drop policy if exists "Published product updates are public"
  on public.product_updates;
create policy "Published product updates are public"
  on public.product_updates
  for select
  using (is_published = true);

-- 2. Deliveries ---------------------------------------------
create table if not exists public.product_update_deliveries (
  subscriber_id uuid not null
    references public.newsletter_subscribers (id) on delete cascade,
  update_id uuid not null
    references public.product_updates (id) on delete cascade,
  sent_at timestamptz not null default now(),
  primary key (subscriber_id, update_id)
);

alter table public.product_update_deliveries enable row level security;
grant select, insert, update, delete
  on public.product_update_deliveries to service_role;

-- 3. Digest token -------------------------------------------
create table if not exists public.product_updates_digest_tokens (
  token text primary key,
  created_at timestamptz not null default now()
);

alter table public.product_updates_digest_tokens enable row level security;
grant select, insert, update, delete
  on public.product_updates_digest_tokens to service_role;

insert into public.product_updates_digest_tokens (token)
select gen_random_uuid()::text
where not exists (select 1 from public.product_updates_digest_tokens);

-- 4. Schedule -----------------------------------------------
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('product-updates-digest')
  where exists (select 1 from cron.job where jobname = 'product-updates-digest');

select cron.schedule(
  'product-updates-digest',
  '0 8 */3 * *',
  $$
  select net.http_post(
    url := 'https://nfgaaohweygwydoelxnf.supabase.co/functions/v1/product-updates-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-digest-token', (select token from public.product_updates_digest_tokens limit 1)
    ),
    body := jsonb_build_object('{}')
  );
  $$
);

-- 5. What has shipped so far --------------------------------
-- Written from the commit history, newest first. Slugs are
-- stable so re-running this migration never duplicates a row
-- and never overwrites an edit made in the database.
insert into public.product_updates
  (slug, title, summary, category, product_area, link_path, is_highlight, published_at)
values
  (
    'vernacular-units',
    'Coaches, trips and plots are now real units',
    'Height in coaches, sand in tipper trips or wheelbarrows, land in plots. FRELUX converts them to metres and cubic metres before the engine runs, so the arithmetic stays standard while the input reads like the site.',
    'feature',
    'Estimators',
    '/fence-block-calculator/',
    true,
    now() - interval '2 days'
  ),
  (
    'fence-block-calculator',
    'Fence and block calculator',
    'Perimeter fence quantities from plot size, height in coaches and block size: blocks, mortar, cement and sand in the delivery units you actually buy.',
    'feature',
    'Estimators',
    '/fence-block-calculator/',
    true,
    now() - interval '2 days'
  ),
  (
    'german-floor-calculator',
    'German floor calculator',
    'Layer by layer quantities for a German floor or slab on grade: laterite fill, hardcore, concrete mix and the reinforcement that goes with it.',
    'feature',
    'Estimators',
    '/german-floor-calculator/',
    false,
    now() - interval '5 days'
  ),
  (
    'tank-stand-design',
    'Overhead tank stands are designed, not guessed',
    'The borehole estimator now sizes tank stand piers and pads, checks slenderness and wind overturning, and adds a caged ladder and guard rails above 2.5 m.',
    'improvement',
    'Water systems',
    '/borehole-water-system-estimator/',
    true,
    now() - interval '5 days'
  ),
  (
    'imperial-units',
    'Feet, inches and gallons follow the market',
    'Wall finishes and partitions switch between metres and feet, tiles take millimetres or inches, and paint packs follow the market: gallons and drums in the US, litres in the UK, Canada and Australia.',
    'improvement',
    'Estimators',
    '/painting-calculator/',
    false,
    now() - interval '8 days'
  ),
  (
    'price-gateway',
    'One price gateway across every market',
    'Every estimator now resolves prices through the same gateway, with verified market sources, inheritance where a market is thin, and an explicit label whenever a price is inherited rather than local.',
    'improvement',
    'Pricing',
    '/price-tracker/',
    false,
    now() - interval '11 days'
  ),
  (
    'borehole-faq',
    'Borehole and water system answers',
    'A long form guide covering yield, pump setting, storage, drawdown and what a tank stand actually needs to carry.',
    'feature',
    'Learn',
    '/faq/borehole-water-system/',
    false,
    now() - interval '14 days'
  ),
  (
    'one-page-header',
    'One header across the platform',
    'Every customer facing page now opens on the same title, breadcrumb and action layout, so a calculator, a listing and a project all read as one product.',
    'improvement',
    'Interface',
    '/',
    false,
    now() - interval '17 days'
  )
on conflict (slug) do nothing;
