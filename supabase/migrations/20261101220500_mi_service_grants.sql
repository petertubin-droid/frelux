-- The Market Intelligence tables are written by the market-stocks edge
-- function under the service role. The service role bypasses row level
-- security, but it still needs the table privileges, and the candle table's
-- bigserial needs its sequence.
begin;

grant select, insert, update, delete
  on public.mi_companies,
     public.mi_stock_quotes,
     public.mi_stock_candles,
     public.mi_market_news,
     public.mi_provider_config,
     public.mi_investor_access,
     public.mi_investor_documents
  to service_role;

grant usage, select
  on sequence public.mi_stock_candles_id_seq
  to service_role;

commit;
