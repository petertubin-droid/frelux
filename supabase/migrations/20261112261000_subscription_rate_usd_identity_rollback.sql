-- Restores the original rate lookup, which had no USD identity branch.
CREATE OR REPLACE FUNCTION public.subscription_rate_for(p_currency text)
RETURNS TABLE (rate numeric, rate_source text, fetched_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT f.rate, 'fx_rates'::text, f.fetched_at
    FROM public.fx_rates f
   WHERE f.base_currency = 'USD'
     AND f.quote_currency = p_currency
   ORDER BY f.fetched_at DESC
   LIMIT 1
$$;
