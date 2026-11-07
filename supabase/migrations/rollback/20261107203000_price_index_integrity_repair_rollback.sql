-- Rollback for 20261107203000_price_index_integrity_repair.sql
-- Restores every touched row from price_index_repair_snapshot, newest snapshot per row.
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

update estimation_prices ep
set is_active = (s.before_state ->> 'is_active')::boolean,
    supporting_submissions = (s.before_state ->> 'supporting_submissions')::int,
    updated_at = now()
from (
  select distinct on (row_id) row_id, before_state
  from price_index_repair_snapshot
  where source_table = 'estimation_prices'
  order by row_id, captured_at desc
) s
where ep.id = s.row_id;

-- Keep the snapshot table: it is the audit trail for this repair.
commit;
