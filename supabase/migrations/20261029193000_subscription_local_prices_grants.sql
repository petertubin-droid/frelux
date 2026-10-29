-- The public read policy needs the table privilege too, otherwise the
-- pricing page gets "permission denied" instead of the market's prices.

GRANT SELECT ON public.subscription_local_prices TO anon, authenticated;
