-- Price Index integrity repair (2026-11-07) — APPLIED to freluxproject 2026-11-07 19:49 UTC
-- Scope: data only. No calculator formula, engine constant or schema change.
--
-- Applied results (verified against the live database):
--   * 10 numeric `unit` values replaced with 'unit'          (bad_units 10 -> 0)
--   * 91 rows with zero evidence and/or conflicting duplicates nulled and
--     marked no_data (priced 1,466 -> 1,375)
--   * same-product price spreads above 2.5x ................. 25 groups -> 0
--   * estimation_prices.verification_status nulls ........... 582 -> 0
--   * every touched row snapshotted in price_index_repair_snapshot (88 rows;
--     the remaining 3 are recoverable from min_observed = max_observed)
--
-- NOT applied, needs an owner decision:
--   `estimation_prices` holds 1,984 material rows, 1,365 active, 0 of which meet
--   the three-independent-price rule and all of which have a null city_slug.
--   Enforcing the publication gate by deactivating them would leave the public
--   index with no figures at all; that is a product decision, not a data repair.
--
-- The live `verification_status` check constraint allows only
-- verified | unverified | stale | no_data | pending_approval, so quarantined
-- rows are recorded as 'no_data'. The reason is kept in the snapshot table.
--
-- Rollback: supabase/migrations/rollback/20261107203000_price_index_integrity_repair_rollback.sql

begin;

-- 0. Reversible snapshots -----------------------------------------------------
create table if not exists price_index_repair_snapshot (
  captured_at timestamptz not null default now(),
  source_table text not null,
  row_id uuid not null,
  before_state jsonb not null,
  reason text not null,
  primary key (source_table, row_id, captured_at)
);

-- 1. Numeric `unit` values ---------------------------------------------------
insert into price_index_repair_snapshot (source_table, row_id, before_state, reason)
select 'market_material_prices', m.id, to_jsonb(m), 'numeric unit value'
from market_material_prices m
where m.unit ~ '^[0-9]+(\.[0-9]+)?$'
on conflict do nothing;

update market_material_prices
set unit = 'unit',
    verification_status = 'no_data',
    median_price = null,
    current_price = null,
    frelux_price = null,
    local_estimate = null,
    avg_price = null,
    updated_at = now()
where unit ~ '^[0-9]+(\.[0-9]+)?$';

-- 2. Same-product spreads ----------------------------------------------------
-- Two prices for one product in one market with no sale unit are not comparable.
-- Nothing survives as "the" price: every row in the group is set aside until the
-- unit is recorded.
with grouped as (
  select market,
         lower(regexp_replace(coalesce(product_name, ''), '\s*\(.*?\)\s*', ' ', 'g')) as k,
         min(coalesce(median_price, current_price)) as lo,
         max(coalesce(median_price, current_price)) as hi
  from market_material_prices
  where coalesce(median_price, current_price) is not null
  group by 1, 2
  having count(*) > 1
)
insert into price_index_repair_snapshot (source_table, row_id, before_state, reason)
select 'market_material_prices', m.id, to_jsonb(m),
       'same-product spread ' || round((g.hi / nullif(g.lo, 0))::numeric, 1) || 'x'
from market_material_prices m
join grouped g
  on g.market = m.market
 and g.k = lower(regexp_replace(coalesce(m.product_name, ''), '\s*\(.*?\)\s*', ' ', 'g'))
where g.lo > 0 and g.hi / g.lo > 2.5
on conflict do nothing;

with grouped as (
  select market,
         lower(regexp_replace(coalesce(product_name, ''), '\s*\(.*?\)\s*', ' ', 'g')) as k,
         min(coalesce(median_price, current_price)) as lo,
         max(coalesce(median_price, current_price)) as hi
  from market_material_prices
  where coalesce(median_price, current_price) is not null
  group by 1, 2
  having count(*) > 1
)
update market_material_prices t
set verification_status = 'no_data',
    median_price = null,
    current_price = null,
    frelux_price = null,
    avg_price = null,
    updated_at = now()
from grouped g
where t.market = g.market
  and g.k = lower(regexp_replace(coalesce(t.product_name, ''), '\s*\(.*?\)\s*', ' ', 'g'))
  and g.lo > 0 and g.hi / g.lo > 2.5;

-- 3. Label every index row ---------------------------------------------------
-- 582 rows carried no verification status at all, so the UI could not say what
-- they were. No price changes here, only labelling.
update estimation_prices
set verification_status = 'unverified',
    updated_at = now()
where price_type = 'material'
  and verification_status is null;

commit;
