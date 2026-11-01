-- FRELUX Market Intelligence: storage for listed construction companies,
-- provider-sourced quotes and candles, curated news, provider state, and the
-- investor document register.
--
-- Nothing here invents a price. Quote and candle rows only ever hold what a
-- provider returned, stamped with the provider, its own as-of timestamp and
-- whether the feed is delayed. An empty table is the honest state when no
-- provider key is configured, and the UI says so instead of showing a number.

begin;

-- ── Listed companies ────────────────────────────────────────────────────
create table if not exists public.mi_companies (
  id uuid primary key default gen_random_uuid(),
  symbol text not null unique,
  name text not null,
  exchange text not null,
  country_code text not null,
  sector text not null default 'construction',
  industry text,
  currency text not null default 'USD',
  website text,
  description text,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Quotes: one row per symbol, replaced by the provider fetcher ────────
create table if not exists public.mi_stock_quotes (
  symbol text primary key,
  price numeric,
  previous_close numeric,
  change_abs numeric,
  change_pct numeric,
  day_high numeric,
  day_low numeric,
  volume bigint,
  market_cap numeric,
  currency text,
  exchange text,
  provider text not null,
  is_delayed boolean not null default true,
  as_of timestamptz,
  fetched_at timestamptz not null default now()
);

create table if not exists public.mi_stock_candles (
  id bigserial primary key,
  symbol text not null,
  interval text not null default '1d',
  ts timestamptz not null,
  open numeric not null,
  high numeric not null,
  low numeric not null,
  close numeric not null,
  volume bigint,
  provider text not null,
  fetched_at timestamptz not null default now(),
  unique (symbol, interval, ts)
);

create index if not exists mi_stock_candles_symbol_ts
  on public.mi_stock_candles (symbol, interval, ts desc);

-- ── Curated news, with attribution required ────────────────────────────
create table if not exists public.mi_market_news (
  id uuid primary key default gen_random_uuid(),
  headline text not null,
  summary text,
  url text not null,
  source_name text not null,
  source_url text,
  category text not null default 'industry',
  symbol text,
  market_code text,
  published_at timestamptz not null,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists mi_market_news_published
  on public.mi_market_news (published_at desc) where is_published;

-- ── Provider state, read by the admin panel ────────────────────────────
create table if not exists public.mi_provider_config (
  slug text primary key,
  label text not null,
  capabilities text[] not null default '{}',
  requires_key boolean not null default true,
  key_env_var text,
  docs_url text,
  is_enabled boolean not null default true,
  update_frequency_minutes integer not null default 15,
  last_ok_at timestamptz,
  last_error text,
  last_error_at timestamptz,
  updated_at timestamptz not null default now()
);

-- ── Investor centre access + document register ─────────────────────────
create table if not exists public.mi_investor_access (
  user_id uuid primary key references auth.users (id) on delete cascade,
  granted_by uuid references auth.users (id) on delete set null,
  note text,
  granted_at timestamptz not null default now()
);

create table if not exists public.mi_investor_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  period text,
  doc_type text not null default 'report',
  file_url text,
  summary text,
  visibility text not null default 'investor'
    check (visibility in ('investor', 'admin')),
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ── RLS ────────────────────────────────────────────────────────────────
alter table public.mi_companies enable row level security;
alter table public.mi_stock_quotes enable row level security;
alter table public.mi_stock_candles enable row level security;
alter table public.mi_market_news enable row level security;
alter table public.mi_provider_config enable row level security;
alter table public.mi_investor_access enable row level security;
alter table public.mi_investor_documents enable row level security;

drop policy if exists mi_companies_public_read on public.mi_companies;
create policy mi_companies_public_read on public.mi_companies
  for select using (is_active);

drop policy if exists mi_quotes_public_read on public.mi_stock_quotes;
create policy mi_quotes_public_read on public.mi_stock_quotes
  for select using (true);

drop policy if exists mi_candles_public_read on public.mi_stock_candles;
create policy mi_candles_public_read on public.mi_stock_candles
  for select using (true);

drop policy if exists mi_news_public_read on public.mi_market_news;
create policy mi_news_public_read on public.mi_market_news
  for select using (is_published);

-- Provider state and investor access are admin-only. Writes go through the
-- service role (edge functions and admin actions), never the browser.
drop policy if exists mi_provider_admin_read on public.mi_provider_config;
create policy mi_provider_admin_read on public.mi_provider_config
  for select to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  ));

drop policy if exists mi_investor_access_self_read on public.mi_investor_access;
create policy mi_investor_access_self_read on public.mi_investor_access
  for select to authenticated
  using (user_id = auth.uid() or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  ));

drop policy if exists mi_investor_docs_read on public.mi_investor_documents;
create policy mi_investor_docs_read on public.mi_investor_documents
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
    or (
      visibility = 'investor'
      and exists (
        select 1 from public.mi_investor_access a where a.user_id = auth.uid()
      )
    )
  );

grant select on public.mi_companies, public.mi_stock_quotes,
  public.mi_stock_candles, public.mi_market_news to anon, authenticated;
grant select on public.mi_provider_config, public.mi_investor_access,
  public.mi_investor_documents to authenticated;

-- ── Seed: real, publicly listed construction and infrastructure issuers ─
insert into public.mi_companies
  (symbol, name, exchange, country_code, sector, industry, currency, website,
   description, is_featured, sort_order)
values
  ('CAT',  'Caterpillar Inc.',                'NYSE',  'US', 'construction', 'Construction machinery',        'USD', 'https://www.caterpillar.com',  'Earthmoving, mining and construction equipment, engines and financing.', true, 10),
  ('DE',   'Deere & Company',                 'NYSE',  'US', 'construction', 'Agricultural and construction machinery', 'USD', 'https://www.deere.com', 'Agricultural, turf and construction equipment including the John Deere line.', true, 20),
  ('VMC',  'Vulcan Materials Company',        'NYSE',  'US', 'materials',    'Aggregates',                    'USD', 'https://www.vulcanmaterials.com', 'Crushed stone, sand and gravel producer supplying construction aggregates.', true, 30),
  ('MLM',  'Martin Marietta Materials, Inc.', 'NYSE',  'US', 'materials',    'Aggregates and cement',         'USD', 'https://www.martinmarietta.com', 'Aggregates, cement and ready-mixed concrete supplier.', true, 40),
  ('CRH',  'CRH plc',                         'NYSE',  'IE', 'materials',    'Building materials',            'USD', 'https://www.crh.com', 'Cement, aggregates, asphalt and building products across Europe and North America.', true, 50),
  ('HOLN', 'Holcim Ltd',                      'SIX',   'CH', 'materials',    'Cement and aggregates',         'CHF', 'https://www.holcim.com', 'Cement, aggregates, ready-mix concrete and roofing systems.', true, 60),
  ('HEI',  'Heidelberg Materials AG',         'XETRA', 'DE', 'materials',    'Cement and aggregates',         'EUR', 'https://www.heidelbergmaterials.com', 'Cement, aggregates, ready-mixed concrete and asphalt.', true, 70),
  ('SGO',  'Compagnie de Saint-Gobain',       'EPA',   'FR', 'materials',    'Building products',             'EUR', 'https://www.saint-gobain.com', 'Glass, gypsum, insulation, mortars and construction chemicals.', true, 80),
  ('NUE',  'Nucor Corporation',               'NYSE',  'US', 'materials',    'Steel',                         'USD', 'https://www.nucor.com', 'Steel and steel products including rebar, beams and joists.', true, 90),
  ('STLD', 'Steel Dynamics, Inc.',            'NASDAQ','US', 'materials',    'Steel',                         'USD', 'https://www.steeldynamics.com', 'Flat-rolled steel, structural beams, rail and recycled scrap processing.', true, 100),
  ('FLR',  'Fluor Corporation',               'NYSE',  'US', 'engineering',  'Engineering and construction',  'USD', 'https://www.fluor.com', 'Engineering, procurement, construction and maintenance services.', true, 110),
  ('J',    'Jacobs Solutions Inc.',           'NYSE',  'US', 'engineering',  'Engineering consultancy',       'USD', 'https://www.jacobs.com', 'Design, engineering and programme management for infrastructure.', true, 120),
  ('PWR',  'Quanta Services, Inc.',           'NYSE',  'US', 'infrastructure','Utility and energy infrastructure','USD', 'https://www.quantaservices.com', 'Infrastructure services for electric power, pipeline and communications.', false, 130),
  ('URI',  'United Rentals, Inc.',            'NYSE',  'US', 'services',     'Equipment rental',              'USD', 'https://www.unitedrentals.com', 'Construction and industrial equipment rental.', false, 140),
  ('SHW',  'The Sherwin-Williams Company',    'NYSE',  'US', 'materials',    'Paints and coatings',           'USD', 'https://www.sherwin-williams.com', 'Paint, coatings and finishing products for construction and industry.', false, 150),
  ('EXP',  'Eagle Materials Inc.',            'NYSE',  'US', 'materials',    'Cement, gypsum and aggregates', 'USD', 'https://www.eaglematerials.com', 'Cement, gypsum wallboard, aggregates and recycled paperboard.', false, 160),
  ('GVA',  'Granite Construction Incorporated','NYSE', 'US', 'infrastructure','Heavy civil construction',      'USD', 'https://www.graniteconstruction.com', 'Transportation and water infrastructure construction.', false, 170),
  ('MTZ',  'MasTec, Inc.',                    'NYSE',  'US', 'infrastructure','Infrastructure engineering',    'USD', 'https://www.mastec.com', 'Engineering and construction for energy, utility and communications.', false, 180),
  ('BECN', 'Beacon Roofing Supply, Inc.',     'NASDAQ','US', 'distribution', 'Building products distribution','USD', 'https://www.becn.com', 'Roofing, siding and waterproofing distribution.', false, 190),
  ('TTEK', 'Tetra Tech, Inc.',                'NASDAQ','US', 'engineering',  'Consulting and engineering',    'USD', 'https://www.tetratech.com', 'Water, environment and infrastructure consulting and engineering.', false, 200)
on conflict (symbol) do update set
  name = excluded.name,
  exchange = excluded.exchange,
  country_code = excluded.country_code,
  sector = excluded.sector,
  industry = excluded.industry,
  currency = excluded.currency,
  website = excluded.website,
  description = excluded.description,
  is_featured = excluded.is_featured,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.mi_provider_config
  (slug, label, capabilities, requires_key, key_env_var, docs_url, update_frequency_minutes)
values
  ('finnhub',      'Finnhub',              '{quote,candles,news,profile}', true,  'FINNHUB_API_KEY',      'https://finnhub.io/docs/api',            15),
  ('fmp',          'Financial Modeling Prep','{quote,candles,news,profile}', true, 'FMP_API_KEY',          'https://site.financialmodelingprep.com/developer/docs', 15),
  ('twelvedata',   'Twelve Data',          '{quote,candles}',              true,  'TWELVE_DATA_API_KEY',  'https://twelvedata.com/docs',            15),
  ('alphavantage', 'Alpha Vantage',        '{quote,candles}',              true,  'ALPHA_VANTAGE_API_KEY','https://www.alphavantage.co/documentation', 60),
  ('bls',          'US Bureau of Labor Statistics', '{producer_price_index}', false, null, 'https://www.bls.gov/ppi/', 720),
  ('worldbank',    'World Bank Open Data', '{construction_value_added}',   false, null, 'https://data.worldbank.org',            1440)
on conflict (slug) do update set
  label = excluded.label,
  capabilities = excluded.capabilities,
  requires_key = excluded.requires_key,
  key_env_var = excluded.key_env_var,
  docs_url = excluded.docs_url,
  update_frequency_minutes = excluded.update_frequency_minutes,
  updated_at = now();

commit;
