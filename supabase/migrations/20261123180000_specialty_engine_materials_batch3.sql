-- =========================================================
-- SPECIALTY ENGINE MATERIALS: THIRD MARKET BATCH (2026-11-23)
--
-- Gutter bracket in the markets where a listing could be anchored. Pack prices
-- are converted to a per-piece figure and the pack is named in price_source,
-- so the number is never a guess about what a single bracket costs.
--
-- Still unpriced for this slug: JP, CN, ID, MX, KE, GH. DE/FR/IT tile
-- adhesive stays out: retail there is a 25 kg sack while
-- adhesive_coverage_m2_per_bag (5 m2/bag) is a single global calc rule with no
-- market column, so a 25 kg price would be divided by 20 kg coverage and
-- overstate the bag count. That needs a market-scoped coverage rule first.
-- =========================================================

INSERT INTO public.estimation_prices
  (ref_id, market, currency, price, price_type, scan_confidence, price_source, source_url, is_active, effective_date)
SELECT m.id, v.market, v.currency, v.price, 'material', 'manual', v.price_source, v.source_url, true, DATE '2026-11-23'
FROM (VALUES
  ('gutter-bracket-per-piece', 'IN', 'INR', 77.00,
   'IndiaMART: PVC clamp/bracket for rainwater gutter, INR 77 per piece.',
   'https://m.indiamart.com/impcat/roof-gutter.html'),
  ('gutter-bracket-per-piece', 'ZA', 'ZAR', 12.90,
   'Buildit: gutter bracket square 100 x 75 mm, ZAR 12.90 each (Builders MacNeil D-shape ZAR 7.00 out of stock; Southern Profiles ZAR 13.35 in a 150-unit pack).',
   'https://builditdtm.co.za/product/gutter-bracket-sqr-100-x-75mm/'),
  ('gutter-bracket-per-piece', 'AE', 'AED', 4.33,
   'Amazon.ae: HIMIRICH gutter hangers 20-pack AED 86.54, which is AED 4.33 per bracket.',
   'https://www.amazon.ae/HIMIRICH-Gutter-Hangers-20-Pack/dp/B0D9Y6GFBV'),
  ('gutter-bracket-per-piece', 'SA', 'SAR', 10.84,
   'Amazon.sa: heavy duty hidden gutter bracket hook hangers 50-pack SAR 542.12, which is SAR 10.84 per bracket.',
   'https://www.amazon.sa/-/en/Hidden-Gutter-Bracket-Hangers-Strong/dp/B071R1K5SL'),
  ('gutter-bracket-per-piece', 'BR', 'BRL', 13.90,
   'Leroy Merlin Brasil: suporte para calha em PVC Classic, BRL 13.90 each on promotion (BRL 23.90 list).',
   'https://www.leroymerlin.com.br/promocao-calhas-e-rufos')
) AS v(slug, market, currency, price, price_source, source_url)
JOIN public.estimation_materials m ON m.slug = v.slug
WHERE NOT EXISTS (
  SELECT 1 FROM public.estimation_prices p
  WHERE p.ref_id = m.id AND p.market = v.market AND p.is_active AND p.price > 0
);
