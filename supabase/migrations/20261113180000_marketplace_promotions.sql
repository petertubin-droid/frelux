-- =========================================================
-- Paid product promotion
--
-- A seller pays FRELUX to put a product in front of buyers on the marketplace
-- and on calculator pages. The money side is a promotion row; the display side
-- is an ordinary sponsored ad_campaigns row, so every existing slot, targeting
-- rule, impression counter and Sponsored label keeps working unchanged.
-- =========================================================

create table if not exists public.marketplace_promotion_packages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  days integer not null check (days between 1 and 365),
  placements text[] not null,
  price_ngn_minor bigint not null check (price_ngn_minor > 0),
  price_usd_minor bigint not null check (price_usd_minor > 0),
  is_active boolean not null default true,
  sort_order integer not null default 50,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.marketplace_promotions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  product_id uuid not null references public.marketplace_products(id) on delete cascade,
  package_id uuid not null references public.marketplace_promotion_packages(id),
  reference text not null unique,
  provider text not null check (provider in ('paystack', 'flutterwave')),
  currency text not null,
  amount_minor bigint not null check (amount_minor > 0),
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'active', 'expired', 'failed', 'refunded')),
  campaign_id uuid references public.ad_campaigns(id) on delete set null,
  starts_at timestamptz,
  ends_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists marketplace_promotions_user_idx
  on public.marketplace_promotions (user_id, created_at desc);
create index if not exists marketplace_promotions_product_idx
  on public.marketplace_promotions (product_id, status);
create index if not exists marketplace_promotions_status_idx
  on public.marketplace_promotions (status, created_at desc);

alter table public.marketplace_promotion_packages enable row level security;
alter table public.marketplace_promotions enable row level security;

-- Anyone may read the catalogue: the prices are public shop-window prices.
drop policy if exists "promotion packages are public" on public.marketplace_promotion_packages;
create policy "promotion packages are public"
  on public.marketplace_promotion_packages for select using (true);

drop policy if exists "promotion packages are admin writable" on public.marketplace_promotion_packages;
create policy "promotion packages are admin writable"
  on public.marketplace_promotion_packages for all
  using (public.is_admin()) with check (public.is_admin());

-- A seller sees only their own purchases; only the service role writes them,
-- so a browser cannot mark its own promotion paid.
drop policy if exists "own promotions are readable" on public.marketplace_promotions;
create policy "own promotions are readable"
  on public.marketplace_promotions for select
  using (user_id = auth.uid() or public.is_admin());

grant select on public.marketplace_promotion_packages to anon, authenticated;
grant select on public.marketplace_promotions to authenticated;
grant select, insert, update, delete on public.marketplace_promotion_packages to service_role;
grant select, insert, update, delete on public.marketplace_promotions to service_role;

insert into public.marketplace_promotion_packages
  (slug, name, description, days, placements, price_ngn_minor, price_usd_minor, sort_order)
values
  ('marketplace-7', 'Marketplace boost, 7 days',
   'Your product highlighted in the marketplace grid and the product rail for one week.',
   7, array['marketplace_native', 'marketplace_sidebar'], 500000, 600, 10),
  ('marketplace-30', 'Marketplace boost, 30 days',
   'A full month in the marketplace grid, the sidebar and category pages.',
   30, array['marketplace_native', 'marketplace_sidebar'], 1500000, 1800, 20),
  ('network-30', 'Full network, 30 days',
   'Marketplace, calculator result pages and the learning library for a month.',
   30, array['marketplace_native', 'marketplace_sidebar', 'calculator_results'], 2500000, 3000, 30)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  days = excluded.days,
  placements = excluded.placements,
  price_ngn_minor = excluded.price_ngn_minor,
  price_usd_minor = excluded.price_usd_minor,
  sort_order = excluded.sort_order,
  updated_at = now();
