-- Rollback for 20261107203000_price_index_integrity_repair.sql
--
-- 1. Every row captured in price_index_repair_snapshot is restored from its
--    most recent before_state.
-- 2. Rows quarantined by the group pass that were captured only once are
--    restored the same way (the snapshot covers 88 of the 91 affected rows).
-- 3. The 3 rows without a snapshot kept min_observed = max_observed, so their
--    exact prior price is recoverable and is restored from that column.
begin;

update market_material_prices m
set unit = (s.before_state ->> 'unit'),
    median_price = (s.before_state ->> 'median_price')::numeric,
    current_price = (s.before_state ->> 'current_price')::numeric,
    frelux_price = (s.before_state ->> 'frelux_price')::numeric,
    local_estimate = (s.before_state ->> 'local_estimate')::numeric,
    avg_price = (s.before_state ->> 'avg_price')::numeric,
    verification_status = (s.before_state ->> 'verification_status'),
    updated_at = now()
from (
  select distinct on (row_id) row_id, before_state
  from price_index_repair_snapshot
  where source_table = 'market_material_prices'
  order by row_id, captured_at desc
) s
where m.id = s.row_id;

-- Rows set aside without a snapshot: recover from their observed bounds.
update market_material_prices m
set median_price = m.min_observed,
    current_price = m.min_observed,
    verification_status = 'unverified',
    updated_at = now()
where m.verification_status = 'no_data'
  and m.min_observed is not null
  and m.min_observed = m.max_observed
  and not exists (
    select 1 from price_index_repair_snapshot s
    where s.source_table = 'market_material_prices' and s.row_id = m.id
  );

-- Index labelling (step 3) is a label, not a repair: leave the labels in place
-- unless the operator wants the original nulls back.
-- update estimation_prices set verification_status = null where updated_at > '<apply timestamp>';

commit;
