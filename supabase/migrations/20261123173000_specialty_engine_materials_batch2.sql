-- =========================================================
-- SPECIALTY ENGINE MATERIALS: SECOND MARKET BATCH (2026-11-23)
--
-- Continues 20261123170000 (NG) into the other 19 markets. Only rows with a
-- live supplier listing seen 2026-11-23 are added.
--
-- Unit discipline: flooring-adhesive-bag is a 20 kg bag, so 25 kg markets
-- (DE/FR/IT retail standard) are NOT written here. A 25 kg sack under a 20 kg
-- slug would misprice every line, and the fix is a separate 25 kg slug, not a
-- quiet conversion.
-- =========================================================

INSERT INTO public.estimation_prices
  (ref_id, market, currency, price, price_type, scan_confidence, price_source, source_url, is_active, effective_date)
SELECT m.id, v.market, v.currency, v.price, 'material', 'manual', v.price_source, v.source_url, true, DATE '2026-11-23'
FROM (VALUES
  -- Gutter bracket, per piece
  ('gutter-bracket-per-piece', 'AU', 'AUD', 4.28,
   'Bunnings AU: Icon PVC Gutter Bracket, I/N 4775033, AUD 4.28 each (COLORBOND 115mm quad external bracket AUD 3.86, special order).',
   'https://www.bunnings.com.au/icon-pvc-gutter-bracket_p4775033'),
  ('gutter-bracket-per-piece', 'US', 'USD', 4.18,
   'Home Depot: Amerimax 6 in. aluminum hidden gutter hanger with screw, model 47814, USD 4.18 each.',
   'https://www.homedepot.com/p/Amerimax-Home-Products-6-in-Aluminum-Hidden-Gutter-Hanger-with-Screw-47814/202091145'),

  -- Downpipe, per piece (stock length)
  ('downpipe-per-piece', 'AU', 'AUD', 26.98,
   'Bunnings AU: Holman 90mm x 3m PVC stormwater pipe, AUD 26.98 per 3 m length.',
   'https://www.bunnings.com.au/holman-90mm-x-3m-pvc-stormwater-pipe_p4770094'),
  ('downpipe-per-piece', 'GB', 'GBP', 7.88,
   'Screwfix UK: FloPlast round downpipe black 68mm x 2.5m, item 25256, GBP 7.88 inc VAT.',
   'https://www.screwfix.com/p/floplast-round-downpipe-black-68mm-x-2-5m/25256'),

  -- Flooring adhesive, 20 kg bag
  ('flooring-adhesive-bag', 'KR', 'KRW', 19300,
   'Coupang KR: MAPEI Adesilex P8 tile adhesive 20 kg, KRW 19,300 (KCC 20 kg at KRW 25,900).',
   'https://www.coupang.com/vp/products/9637096042')
) AS v(slug, market, currency, price, price_source, source_url)
JOIN public.estimation_materials m ON m.slug = v.slug
WHERE NOT EXISTS (
  SELECT 1 FROM public.estimation_prices p
  WHERE p.ref_id = m.id AND p.market = v.market AND p.is_active AND p.price > 0
);
