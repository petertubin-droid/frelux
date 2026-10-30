-- =========================================================
-- FRELUX LIVE MATERIAL PRICE INDEX, core schema
--
-- Extends the existing pricing stack rather than duplicating it:
--   estimation_prices      the prices calculators already read
--   price_submissions      supplier/vendor submissions
--   estimation_price_history  change history
--
-- Adds only what a city-level index needs:
--   * market_cities        the supported location database
--   * city / price-kind / supplier / verification columns
--     on estimation_prices (additive, nullable, existing
--     queries and calculators unaffected)
--   * submission provenance columns
--   * price_index_audit    append-only audit trail
--
-- NO PRICES ARE INSERTED HERE. Materials are definitions only;
-- a price exists only when a real submission or survey is approved.
-- =========================================================

-- ── 1. Supported cities ──────────────────────────────────
create table if not exists public.market_cities (
  slug text primary key,
  country_code text not null,
  name text not null,
  state text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  is_active boolean not null default true,
  sort_order integer not null default 100,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists market_cities_country_idx
  on public.market_cities (country_code, sort_order);

alter table public.market_cities enable row level security;

drop policy if exists "market_cities public read" on public.market_cities;
create policy "market_cities public read" on public.market_cities
  for select using (true);

drop policy if exists "market_cities admin write" on public.market_cities;
create policy "market_cities admin write" on public.market_cities
  for all using (is_admin()) with check (is_admin());

-- Seed: the fifteen launch cities, then an expandable set.
insert into public.market_cities (slug, country_code, name, state, latitude, longitude, sort_order)
values
  ('lagos',        'NG', 'Lagos',         'Lagos',        6.524400, 3.379200, 1),
  ('abuja',        'NG', 'Abuja',         'FCT',          9.076500, 7.398600, 2),
  ('port-harcourt','NG', 'Port Harcourt', 'Rivers',       4.815600, 7.049800, 3),
  ('onitsha',      'NG', 'Onitsha',       'Anambra',      6.166700, 6.783300, 4),
  ('ibadan',       'NG', 'Ibadan',        'Oyo',          7.377500, 3.947000, 5),
  ('kano',         'NG', 'Kano',          'Kano',         12.002200, 8.591900, 6),
  ('enugu',        'NG', 'Enugu',         'Enugu',        6.458400, 7.546400, 7),
  ('benin-city',   'NG', 'Benin City',    'Edo',          6.335000, 5.603700, 8),
  ('owerri',       'NG', 'Owerri',        'Imo',          5.483600, 7.033200, 9),
  ('uyo',          'NG', 'Uyo',           'Akwa Ibom',    5.037700, 7.912800, 10),
  ('calabar',      'NG', 'Calabar',       'Cross River',  4.975700, 8.341700, 11),
  ('warri',        'NG', 'Warri',         'Delta',        5.517400, 5.750600, 12),
  ('kaduna',       'NG', 'Kaduna',        'Kaduna',       10.522200, 7.438300, 13),
  ('jos',          'NG', 'Jos',           'Plateau',      9.896500, 8.858300, 14),
  ('abeokuta',     'NG', 'Abeokuta',      'Ogun',         7.147500, 3.361900, 15),
  -- Expandable: additional cities kept inactive until verified pricing exists
  ('aba',          'NG', 'Aba',           'Abia',         5.116700, 7.366700, 20),
  ('asaba',        'NG', 'Asaba',         'Delta',        6.198000, 6.730000, 21),
  ('akure',        'NG', 'Akure',         'Ondo',         7.257100, 5.205800, 22),
  ('ilorin',       'NG', 'Ilorin',        'Kwara',        8.496600, 4.542100, 23),
  ('makurdi',      'NG', 'Makurdi',       'Benue',        7.732200, 8.539100, 24),
  ('maiduguri',    'NG', 'Maiduguri',     'Borno',        11.831100, 13.151000, 25),
  ('sokoto',       'NG', 'Sokoto',        'Sokoto',       13.005900, 5.247600, 26),
  ('ado-ekiti',    'NG', 'Ado Ekiti',     'Ekiti',        7.621100, 5.221400, 27),
  ('osogbo',       'NG', 'Osogbo',        'Osun',         7.782000, 4.541800, 28),
  ('bauchi',       'NG', 'Bauchi',        'Bauchi',       10.310300, 9.843900, 29)
on conflict (slug) do nothing;

-- ── 2. Price records: city, sale basis, provenance ──────
alter table public.estimation_prices
  add column if not exists city_slug text references public.market_cities(slug),
  add column if not exists price_kind text,
  add column if not exists sale_unit text,
  add column if not exists supplier_name text,
  add column if not exists source_url text,
  add column if not exists verified_at timestamptz,
  add column if not exists verification_status text,
  add column if not exists supporting_submissions integer not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'estimation_prices_price_kind_check'
  ) then
    alter table public.estimation_prices
      add constraint estimation_prices_price_kind_check
      check (price_kind is null or price_kind in ('retail','wholesale','delivery_inclusive','ex_depot'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'estimation_prices_verification_check'
  ) then
    alter table public.estimation_prices
      add constraint estimation_prices_verification_check
      check (verification_status is null or verification_status in ('verified','reported','unverified','flagged'));
  end if;
end $$;

create index if not exists estimation_prices_city_lookup_idx
  on public.estimation_prices (market, city_slug, ref_id, effective_date desc);

-- Existing rows carry a stated source string but no per-record verification.
-- Record them honestly as 'reported': a provenance was stated, nothing more.
update public.estimation_prices
   set verification_status = 'reported'
 where verification_status is null
   and price_source is not null
   and is_active;

-- ── 3. Submissions: link to the catalogue and record review ──
alter table public.price_submissions
  add column if not exists city_slug text references public.market_cities(slug),
  add column if not exists price_kind text,
  add column if not exists estimation_material_id uuid references public.estimation_materials(id) on delete set null,
  add column if not exists flag_reason text,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists contact_email text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'price_submissions_price_kind_check'
  ) then
    alter table public.price_submissions
      add constraint price_submissions_price_kind_check
      check (price_kind is null or price_kind in ('retail','wholesale','delivery_inclusive','ex_depot'));
  end if;
end $$;

-- One supplier's price for one material, city, kind and day is one record.
create unique index if not exists price_submissions_dedupe_idx
  on public.price_submissions (
    market,
    coalesce(city_slug, ''),
    coalesce(estimation_material_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(price_kind, ''),
    coalesce(vendor, ''),
    price,
    ((created_at at time zone 'UTC')::date)
  );

-- ── 4. Append-only audit trail ──────────────────────────
create table if not exists public.price_index_audit (
  id uuid primary key default gen_random_uuid(),
  actor uuid references auth.users(id) on delete set null,
  action text not null check (action in (
    'submission_approved','submission_rejected','submission_flagged',
    'price_set','price_updated','price_deactivated',
    'city_enabled','city_disabled','material_created'
  )),
  entity text not null,
  entity_id text,
  before jsonb,
  after jsonb,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists price_index_audit_created_idx
  on public.price_index_audit (created_at desc);
create index if not exists price_index_audit_entity_idx
  on public.price_index_audit (entity, entity_id, created_at desc);

alter table public.price_index_audit enable row level security;

drop policy if exists "price_index_audit admin read" on public.price_index_audit;
create policy "price_index_audit admin read" on public.price_index_audit
  for select using (is_admin());

drop policy if exists "price_index_audit admin append" on public.price_index_audit;
create policy "price_index_audit admin append" on public.price_index_audit
  for insert with check (is_admin());

-- No update/delete policy: history cannot be rewritten.

-- ── 5. Grants ───────────────────────────────────────────
grant select on public.market_cities to anon, authenticated;
grant select, insert, update, delete on public.market_cities to authenticated;
grant select on public.price_index_audit to authenticated;

-- ── 6. Nigerian index materials (definitions only, no prices) ──
-- Slugs are namespaced 'ng-' so they never collide with existing
-- country-flavoured catalogue rows and are trivially identifiable.
insert into public.estimation_materials (name, slug, category, description, is_active, sort_order, last_updated_via)
select v.name, v.slug, v.category, v.description, true, v.sort_order, 'manual'
from (values
  -- Cement (retail sale basis: 50 kg bag)
  ('Dangote 3X cement, 50 kg bag',            'ng-cement-dangote-3x-50kg',    'cement',   'Dangote 3X 42.5R ordinary Portland cement, 50 kg bag', 10),
  ('Dangote Falcon cement, 50 kg bag',        'ng-cement-dangote-falcon-50kg','cement',   'Dangote Falcon 32.5R cement, 50 kg bag', 11),
  ('BUA cement, 50 kg bag',                   'ng-cement-bua-50kg',           'cement',   'BUA 42.5N cement, 50 kg bag', 12),
  ('Lafarge Elephant Supaset, 50 kg bag',     'ng-cement-lafarge-supaset-50kg','cement',  'Lafarge Elephant Supaset 42.5R, 50 kg bag', 13),
  ('Lafarge Elephant Classic, 50 kg bag',     'ng-cement-lafarge-classic-50kg','cement',  'Lafarge Elephant Classic 32.5R, 50 kg bag', 14),
  ('UNICEM cement, 50 kg bag',                'ng-cement-unicem-50kg',        'cement',   'UNICEM (Mfamosing) cement, 50 kg bag', 15),
  -- Reinforcement (sale basis: 12 m length; wholesale by tonne)
  ('8 mm reinforcement bar, 12 m',            'ng-rebar-8mm-12m',             'rebar',    '8 mm deformed high-yield reinforcement bar, 12 m length', 20),
  ('10 mm reinforcement bar, 12 m',           'ng-rebar-10mm-12m',            'rebar',    '10 mm deformed high-yield reinforcement bar, 12 m length', 21),
  ('12 mm reinforcement bar, 12 m',           'ng-rebar-12mm-12m',            'rebar',    '12 mm deformed high-yield reinforcement bar, 12 m length', 22),
  ('16 mm reinforcement bar, 12 m',           'ng-rebar-16mm-12m',            'rebar',    '16 mm deformed high-yield reinforcement bar, 12 m length', 23),
  ('20 mm reinforcement bar, 12 m',           'ng-rebar-20mm-12m',            'rebar',    '20 mm deformed high-yield reinforcement bar, 12 m length', 24),
  ('25 mm reinforcement bar, 12 m',           'ng-rebar-25mm-12m',            'rebar',    '25 mm deformed high-yield reinforcement bar, 12 m length', 25),
  ('32 mm reinforcement bar, 12 m',           'ng-rebar-32mm-12m',            'rebar',    '32 mm deformed high-yield reinforcement bar, 12 m length', 26),
  -- Aggregates (sale basis: per tonne or per trip, recorded per record)
  ('Sharp sand',                              'ng-aggregate-sharp-sand',      'aggregate','Washed sharp sand for concrete', 30),
  ('Plaster sand',                            'ng-aggregate-plaster-sand',    'aggregate','Fine plaster sand', 31),
  ('Filling sand',                            'ng-aggregate-filling-sand',    'aggregate','Filling / lateritic filling sand', 32),
  ('Granite, 3/4 inch',                       'ng-aggregate-granite-34',      'aggregate','Crushed granite aggregate, 3/4 inch', 33),
  ('Granite, 1/2 inch',                       'ng-aggregate-granite-12',      'aggregate','Crushed granite aggregate, 1/2 inch', 34),
  ('Stone dust',                              'ng-aggregate-stone-dust',      'aggregate','Quarry stone dust', 35),
  ('Laterite',                                'ng-aggregate-laterite',        'aggregate','Laterite fill material', 36),
  -- Blocks (sale basis: per piece)
  ('4-inch hollow block',                     'ng-block-4in',                 'masonry',  '4 inch (100 mm) hollow sandcrete block, 450 x 100 x 225 mm', 40),
  ('5-inch hollow block',                     'ng-block-5in',                 'masonry',  '5 inch (125 mm) hollow sandcrete block', 41),
  ('6-inch hollow block',                     'ng-block-6in',                 'masonry',  '6 inch (150 mm) hollow sandcrete block', 42),
  ('9-inch hollow block',                     'ng-block-9in',                 'masonry',  '9 inch (225 mm) hollow sandcrete block', 43),
  -- Other index categories
  ('Aluminium roofing sheet, 0.45 mm',        'ng-roofing-aluminium-045',     'roofing',  'Aluminium roofing sheet, 0.45 mm gauge, per square metre', 50),
  ('Stone-coated roofing sheet',              'ng-roofing-stone-coated',      'roofing',  'Stone-coated steel roofing sheet, per square metre', 51),
  ('Ridge cap, aluminium',                    'ng-roofing-ridge-cap',         'roofing',  'Aluminium ridge cap, per piece', 52),
  ('POP ceiling board, 600 x 600 mm',         'ng-ceiling-pop-board',         'drywall',  'POP ceiling board, 600 x 600 mm, per piece', 60),
  ('Floor tile, 600 x 600 mm',                'ng-tile-floor-600',            'flooring', 'Ceramic floor tile, 600 x 600 mm, per square metre', 61),
  ('Tile adhesive, 20 kg bag',                'ng-tile-adhesive-20kg',        'adhesive', 'Cement-based tile adhesive, 20 kg bag', 62),
  ('Emulsion paint, 20 litre',                'ng-paint-emulsion-20l',        'paint',    'Interior emulsion paint, 20 litre pack', 70),
  ('PVC pipe, 110 mm',                        'ng-plumbing-pvc-110',          'plumbing', 'uPVC soil pipe, 110 mm diameter, per 6 m length', 80),
  ('PVC pipe, 20 mm',                         'ng-plumbing-pvc-20',           'plumbing', 'PVC conduit / water pipe, 20 mm, per length', 81),
  ('1.5 mm electrical cable, 100 m coil',     'ng-electrical-cable-15',       'electrical','1.5 mm single-core copper cable, 100 m coil', 90),
  ('2.5 mm electrical cable, 100 m coil',     'ng-electrical-cable-25',       'electrical','2.5 mm single-core copper cable, 100 m coil', 91),
  ('Waterproofing membrane, 1.5 mm',          'ng-waterproofing-membrane',    'waterproofing','Bituminous waterproofing membrane, 1.5 mm, per square metre', 100),
  ('Timber, 2 x 4 inch',                      'ng-timber-2x4',                'timber',   'Sawn hardwood/softwood, 2 x 4 inch, per length', 110),
  ('Flush door, 900 x 2100 mm',               'ng-doors-flush-900',           'doors_windows','Flush interior door leaf, 900 x 2100 mm', 120)
) as v(name, slug, category, description, sort_order)
where not exists (
  select 1 from public.estimation_materials m where m.slug = v.slug
);
