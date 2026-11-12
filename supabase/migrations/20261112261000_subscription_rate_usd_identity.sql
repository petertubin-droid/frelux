-- USD is the base of every recorded rate, so a dollar market needs no
-- conversion leg. Without this, the United States showed as "no rate to
-- check" even though its price is the catalog itself.
--
-- Rollback: 20261112261000_subscription_rate_usd_identity_rollback.sql

CREATE OR REPLACE FUNCTION public.subscription_rate_for(p_currency text)
RETURNS TABLE (rate numeric, rate_source text, fetched_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH candidates AS (
    SELECT 1::numeric AS rate, 'identity'::text AS rate_source,
           now() AS fetched_at, 0 AS priority
     WHERE upper(p_currency) = 'USD'
    UNION ALL
    SELECT f.rate, 'fx_rates'::text, f.fetched_at, 1
      FROM public.fx_rates f
     WHERE upper(p_currency) <> 'USD'
       AND f.base_currency = 'USD'
       AND f.quote_currency = upper(p_currency)
  )
  SELECT c.rate, c.rate_source, c.fetched_at
    FROM candidates c
   ORDER BY c.priority, c.fetched_at DESC
   LIMIT 1
$$;

COMMENT ON FUNCTION public.subscription_rate_for(text) IS
  'Latest recorded USD rate for a currency. USD resolves to 1 by identity, so the dollar market is never reported as unverifiable.';
