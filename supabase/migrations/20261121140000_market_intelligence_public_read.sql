-- Public read of the price intelligence the tracker page now shows.
--
-- market_price_observations and market_price_alerts were written by the admin
-- console and the price scanner and read by nobody outside admin, because only
-- authenticated and service_role held SELECT. /material-prices now lists the
-- newest confirmed observations and the unacknowledged alerts for the visitor's
-- market, so anon needs a narrow read: non-test observations, and alerts that
-- have not been acknowledged. Nothing else is exposed, and no write is granted.

begin;

grant select on public.market_price_observations to anon;
grant select on public.market_price_alerts to anon;

drop policy if exists market_price_observations_public_read on public.market_price_observations;
create policy market_price_observations_public_read
  on public.market_price_observations
  for select
  to anon
  using (is_test = false);

drop policy if exists market_price_alerts_public_read on public.market_price_alerts;
create policy market_price_alerts_public_read
  on public.market_price_alerts
  for select
  to anon
  using (acknowledged_at is null);

commit;
