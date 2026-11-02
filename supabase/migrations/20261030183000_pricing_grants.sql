-- The scanner runs as the service role, and the new pricing tables were created
-- without grants, so every write returned "permission denied" while the caller
-- carried on as if it had stored data. Grants are part of the schema.
grant usage on schema public to service_role, authenticated, anon;
grant select, insert, update, delete on
  public.market_index_series, public.material_categories, public.fx_rates,
  public.market_scan_runs, public.market_scan_settings, public.market_price_alerts,
  public.market_material_prices, public.market_price_observations,
  public.price_scan_sources, public.price_scan_candidates, public.price_scan_runs,
  public.estimation_materials, public.estimation_prices, public.estimation_price_history
to service_role, authenticated;
grant select on public.country_coverage_seven, public.market_category_coverage
  to service_role, authenticated, anon;
grant select on all tables in schema public to service_role;
