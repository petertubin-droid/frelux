-- =========================================================
-- SPECIALTY ENGINE MATERIALS: THE SLUGS THE ENGINES ASKED FOR (2026-11-23)
--
-- The gutter/soffit, steel beam and flooring engines request material slugs
-- that were never created in estimation_materials, so those lines could never
-- be priced in any market, and three more slugs existed with no price row
-- anywhere. This creates the missing materials and adds the first NG prices
-- that could be verified against a supplier listing on 2026-11-23.
--
-- Unpriced on purpose (no verified listing found, and an invented price is
-- worse than an honest gap):
--   steel-section-per-tonne   NG steel retail is quoted per tonne by supplier,
--                             and no UC/UB section listing exists to anchor it
--   glazing-per-m2            made-to-measure in NG
--   weep-hole-pipe-per-piece  no retail listing
--   flooring-skirting-m, flooring-underlay-roll, gen-battery, gen-cable-per-m
--                             materials exist, still no verified price
-- =========================================================

INSERT INTO public.estimation_materials (name, slug, category, description, is_active, sort_order, base_price, last_updated_via)
VALUES
  ('Gutter Bracket (per piece)', 'gutter-bracket-per-piece', 'roofing',
   'Bracket or clip fixing a rainwater gutter to the fascia. Priced per piece via the price tracker.', true, 210, 0, 'manual'),
  ('Rainwater Gutter (per metre)', 'gutter-per-meter', 'roofing',
   'Aluminium rainwater gutter, material component per linear metre. Priced via the price tracker.', true, 211, 0, 'manual'),
  ('Downpipe (per piece)', 'downpipe-per-piece', 'roofing',
   'PVC rainwater downpipe section, 4 inch / 8.6 ft length. Priced per piece via the price tracker.', true, 212, 0, 'manual'),
  ('Flooring Adhesive (20 kg bag)', 'flooring-adhesive-bag', 'flooring',
   'Cement-based tile and flooring adhesive, 20 kg bag. Priced per bag via the price tracker.', true, 213, 0, 'manual'),
  ('Generator ATS 100 A', 'gen-ats', 'electrical',
   'Automatic transfer switch, 100 A, single phase, generator to mains changeover. Priced per unit via the price tracker.', true, 214, 0, 'manual')
ON CONFLICT (slug) DO NOTHING;

-- NG prices, each from a live supplier listing seen 2026-11-23.
INSERT INTO public.estimation_prices
  (ref_id, market, currency, price, price_type, scan_confidence, price_source, source_url, is_active, effective_date)
SELECT m.id, v.market, v.currency, v.price, 'material', 'manual', v.price_source, v.source_url, true, DATE '2026-11-23'
FROM (VALUES
  ('gutter-bracket-per-piece', 'NG', 'NGN', 400.00,
   'Jiji NG gutter listings: "Clip Gutter / PVC Gutter Pipe Locator Clip Wall Bracket" at NGN 400 per piece.',
   'https://jiji.ng/296-gutters/very'),
  ('gutter-per-meter', 'NG', 'NGN', 8269.00,
   'Buildocrat rate build-up (Abuja, 24 Oct 2026) for aluminium gutter with brackets: NGN 9,169 per m net, of which NGN 8,269 is materials. Material component used here, labour excluded.',
   'https://rates.buildocrat.store/rates/d09-aluminium-gutter-with-brackets/'),
  ('downpipe-per-piece', 'NG', 'NGN', 7500.00,
   'Jiji NG: Lombardy 4-inch PVC drainage conduit, 8.6 ft length, NGN 7,500 per piece (Orile listing).',
   'https://jiji.ng/orile/plumbing-and-water-supply/lombardy-4-inch-pvc-drainage-conduit-pipes-8-6ft-length-certified-zrBYBfrqtF6tz2QnH3JEcre5.html'),
  ('flooring-adhesive-bag', 'NG', 'NGN', 5000.00,
   'Jiji NG tile adhesives: standard 20 kg bag at NGN 5,000; branded Royal 20 kg at NGN 8,500. Standard bag used.',
   'https://jiji.ng/165-tile-adhesives'),
  ('gen-ats', 'NG', 'NGN', 51926.00,
   'Jumia NG: 100 A automatic transfer switch, NGN 51,926 (125 A at NGN 68,900).',
   'https://www.jumia.com.ng/slp/adjustable-switch')
) AS v(slug, market, currency, price, price_source, source_url)
JOIN public.estimation_materials m ON m.slug = v.slug
WHERE NOT EXISTS (
  SELECT 1 FROM public.estimation_prices p
  WHERE p.ref_id = m.id AND p.market = v.market AND p.is_active AND p.price > 0
);
