-- First verified Tanzanian price row: cement, from the Tanzania Trade
-- Development Authority's published domestic price schedule.
--
-- TANTRADE publishes a construction-materials price list with a high and a low
-- quotation per item. The 50 kg bag of 32.5 cement is quoted at TZS 15,000 high
-- and TZS 14,500 low; the high quotation is stored because an estimate that
-- under-quotes cement is worse than one that over-quotes it, and the range is
-- recorded in price_source so the figure is never read as a single observation.
--
-- Captured 2026-11-13 from the published schedule (PDF, parsed directly):
--   Saruji 32.5  50kg  high 15,000  low 14,500
--   Saruji 42.5  50kg  high 15,500  low 15,000
--
-- Scope: this row exists for the market pages and the price book. It is not
-- mapped to an engine role, so no calculator output changes.

begin;

insert into estimation_materials (name, slug, category, is_active, sort_order, last_updated_via, regional_multiplier, base_price)
values
  ('Cement 32.5, 50 kg bag (TZ)', 'tz-cement-32.5-50kg', 'cement', true, 0, 'manual', 1, 0)
on conflict (slug) do nothing;

with capture(slug, price, url, note) as (values
  ('tz-cement-32.5-50kg', 15000::numeric,
   'https://www.tantrade.go.tz/public/uploads/business_information/1694105665.pdf',
   'TANTRADE (Tanzania Trade Development Authority) domestic price schedule: Saruji 32.5, 50 kg bag, TZS 15,000 high / 14,500 low; high quotation stored (captured 2026-11-13)')
)
insert into estimation_prices
  (price_type, ref_id, price, currency, price_source, origin, verification_status,
   scan_confidence, source_url, verified_at, price_kind, market, effective_date, is_active)
select 'material', m.id, capture.price, 'TZS', capture.note, 'manual', 'reported',
       'medium', capture.url, timestamptz '2026-11-13 08:30:00+00', 'retail', 'TZ', date '2026-11-13', true
from capture
join estimation_materials m on m.slug = capture.slug
where not exists (
  select 1 from estimation_prices p
  where p.ref_id = m.id and p.price_type = 'material' and p.market = 'TZ' and p.is_active
);

commit;

-- Rollback:
--   begin;
--   delete from estimation_prices
--    where price_type = 'material' and market = 'TZ'
--      and ref_id in (select id from estimation_materials where slug = 'tz-cement-32.5-50kg');
--   delete from estimation_materials where slug = 'tz-cement-32.5-50kg';
--   commit;
