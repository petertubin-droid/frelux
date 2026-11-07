-- Price Index integrity repair (2026-11-07)
-- Scope: data only. No schema change to any calculator or engine.
-- Findings this repairs (live audit, 1,466 rows / 41 markets / 2,000+ index rows):
--   1. 10 rows carry a numeric price inside the `unit` column.
--   2. 25 market/product pairs hold two prices >2.5x apart with no sale_unit,
--      so any median mixes incompatible quantities (worst: 420x on timber ZAR).
--   3. supporting_submissions is 0 on every estimation_prices row while the
--      index copy promises "three independent prices before publication".
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

-- 1. Quarantine numeric `unit` values (market_material_prices) ---------------
insert into price_index_repair_snapshot (source_table, row_id, before_state, reason)
select 'market_material_prices', m.id, to_jsonb(m), 'numeric unit value'
from market_material_prices m
where m.unit ~ '^[0-9]+(\.[0-9]+)?$';

update market_material_prices m
set unit = 'unit',
    verification_status = 'quarantined',
    median_price = null,
    current_price = null,
    frelux_price = null,
    local_estimate = null,
    avg_price = null,
    updated_at = now()
where m.unit ~ '^[0-9]+(\.[0-9]+)?$';

-- 2. Quarantine impossible same-product spreads ------------------------------
-- Keeps the best-evidenced row (most observations, then newest verification),
-- quarantines the rest so they cannot enter a median.
with ranked as (
  select m.id,
         row_number() over (
           partition by m.market, lower(regexp_replace(coalesce(m.product_name, ''), '\s*\(.*?\)\s*', ' ', 'g'))
           order by coalesce(m.observations_count, 0) desc, m.last_verified_at desc nulls last, m.updated_at desc
         ) as rn,
         coalesce(m.median_price, m.current_price) as p,
         min(coalesce(m.median_price, m.current_price)) over (
           partition by m.market, lower(regexp_replace(coalesce(m.product_name, ''), '\s*\(.*?\)\s*', ' ', 'g'))
         ) as lo,
         max(coalesce(m.median_price, m.current_price)) over (
           partition by m.market, lower(regexp_replace(coalesce(m.product_name, ''), '\s*\(.*?\)\s*', ' ', 'g'))
         ) as hi
  from market_material_prices m
  where m.verification_status <> 'quarantined'
)
insert into price_index_repair_snapshot (source_table, row_id, before_state, reason)
select 'market_material_prices', r.id, to_jsonb(mt), 'same-product spread ' || round((r.hi / nullif(r.lo, 0))::numeric, 1) || 'x'
from ranked r
join market_material_prices mt on mt.id = r.id
where r.rn > 1 and r.lo > 0 and r.hi / r.lo > 2.5;

update market_material_prices mt
set verification_status = 'quarantined',
    median_price = null,
    current_price = null,
    frelux_price = null,
    avg_price = null,
    updated_at = now()
where mt.id in (
  select (before_state ->> 'id')::uuid
  from price_index_repair_snapshot
  where source_table = 'market_material_prices'
    and reason like 'same-product spread%'
    and captured_at >= now() - interval '1 minute'
);

-- 3. Recount evidence behind index prices ------------------------------------
-- Only approved submissions count. No-op when the submissions table is absent.
do $$
begin
  if to_regclass('public.price_submissions') is not null then
    update estimation_prices ep
    set supporting_submissions = sub.n,
        updated_at = now()
    from (
      select ref_id, count(*)::int as n
      from price_submissions
      where status = 'approved'
      group by ref_id
    ) sub
    where ep.ref_id = sub.ref_id
      and ep.supporting_submissions is distinct from sub.n;
  end if;
end $$;

-- 4. Stop unsupported index rows from being served ---------------------------
-- Below three independent prices a row is listed as unpriced, not estimated.
insert into price_index_repair_snapshot (source_table, row_id, before_state, reason)
select 'estimation_prices', ep.id, to_jsonb(ep), 'below publication gate'
from estimation_prices ep
where coalesce(ep.supporting_submissions, 0) < 3
  and ep.verification_status is distinct from 'verified';

update estimation_prices ep
set is_active = false,
    updated_at = now()
where coalesce(ep.supporting_submissions, 0) < 3
  and ep.verification_status is distinct from 'verified';

commit;
