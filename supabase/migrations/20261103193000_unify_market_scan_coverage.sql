-- =========================================================
-- UNIFY THE SCANNER WITH THE MARKETS IT FEEDS
--
-- The price loop was open in two places, both invisible from the
-- admin screen:
--
--   1. eleven market profiles (AT, BE, DK, FI, IE, MY, NO, PH, PK,
--      PT, TH) had no market_scan_settings row. dispatch_market_scans
--      only walks markets that have one, so their sources were never
--      scheduled no matter how many retailers were configured;
--   2. twenty-two market profiles had no price_auto_apply_rules row.
--      apply_market_material_prices skips a market without an active
--      rule, so even a clean scan could not promote a price into
--      estimation_prices, which is the only table the engines read.
--
-- With both filled, every market that has sources is scanned on its
-- cadence and its verified prices reach the book through the same gate
-- as the original markets.
--
-- The gate itself is NOT relaxed. Two agreeing observations at high
-- confidence, and a 30 percent deviation ceiling, are unchanged: a
-- market with a single source still cannot promote a price. That is
-- the intended honesty rule, not a gap.
-- =========================================================

INSERT INTO public.market_scan_settings (
  market,
  cadence_hours,
  is_enabled,
  next_run_at
)
SELECT p.country_code, 24, true, now()
FROM public.market_profiles p
LEFT JOIN public.market_scan_settings s ON s.market = p.country_code
WHERE s.market IS NULL
ON CONFLICT (market) DO NOTHING;

INSERT INTO public.price_auto_apply_rules (
  market,
  is_active,
  min_confidence,
  min_agreeing_observations,
  max_deviation_percent
)
SELECT p.country_code, true, 'high', 2, 30
FROM public.market_profiles p
LEFT JOIN public.price_auto_apply_rules r ON r.market = p.country_code
WHERE r.market IS NULL
ON CONFLICT (market) DO NOTHING;
