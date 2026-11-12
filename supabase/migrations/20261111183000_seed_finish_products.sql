-- =========================================================
-- Seed: first priced / measured products for the two finish engines
-- =========================================================
-- Routes /stucco-calculator and /mineral-stone-calculator were mounted with
-- no product rows, so both engines opened in an empty state. This migration
-- seeds one product per category from manufacturer-published data.
--
-- Product data (coverage, pack size) comes from the maker's own page.
-- The retail price comes from a Nigerian retailer listing in NGN.
-- Nothing here is estimated: where a figure was not published, the column
-- stays NULL and the engine reports the gap instead of guessing.
--
-- 1. Stucco: Revano Stucco, 12 kg
--    Coverage source: revanoclassicpaints.com/product/revano-stucco/
--      "COVERAGE: 35sqm" per 12 kg bucket on a double coating,
--      and "A kilogram of Revano Stucco covers 3-5 m2 on a double coating".
--    Price source: konga.com product 6826215, 12 kg, NGN 50,000, in stock.
--    Note: Konga also sells a 4 kg bucket; the 12 kg bucket is the one priced.
--
-- 2. Mineral stone: Double Design Petra, 20 kg small drum
--    Coverage source: doubledesignpaints.com Product-Guide.pdf, page 40
--      "Petra - The Art of Stone", coverage 0.5 - 1 m2/kg,
--      pack sizes small drum 20 kg and gallon 5 kg.
--    Price: NOT published by the manufacturer or any retailer reachable
--    online (Double Design sells through dealers with no public price list),
--    so no price row is inserted. The engine still returns area, material
--    and package count and states that cost is unavailable.
--
-- Coverage units: the engine works in m2 per purchasable package per coat.
--   Revano: 35 m2 per 12 kg bucket over two coats = 70 m2 per bucket per coat,
--           default_coats = 2, which returns 35 m2 of finished wall per bucket.
--   Petra:  0.5 to 1 m2/kg x 20 kg = 10 to 20 m2 per drum, single pass,
--           default_coats = 1.
-- The 10% waste allowance is a FRELUX configuration choice, not product data,
-- and is admin editable in estimation_product_quality.
-- =========================================================

-- ------------------------------------------------------------------
-- 1. Products
-- ------------------------------------------------------------------
INSERT INTO estimation_products (
  name, slug, category, brand, standard_pack_size, pack_unit_id,
  product_notes, technical_spec, is_active, sort_order
)
SELECT
  'Revano Stucco 12 kg',
  'revano-stucco-12kg',
  'stucco',
  'Revano Classic Paints',
  12,
  (SELECT id FROM estimation_units WHERE lower(symbol) = 'kg' ORDER BY id LIMIT 1),
  'High gloss decorative finish applied with a stainless trowel over a smooth base coat laid 24 hours earlier. The maker specifies working from start to finish on one wall without stopping so the pattern blends, and states the finish can take three coats with only the last coat finished. Sold in 12 kg and 4 kg buckets; the price below is the 12 kg bucket.',
  'Coverage: 35 m2 per 12 kg bucket on a double coating, and 3 to 5 m2 per kg on a double coating (Revano Classic Paints, product page revano-stucco). Pack sizes: 12 kg and 4 kg. Retail price checked against Konga, 12 kg bucket, NGN 50,000, in stock, 11 Nov 2026.',
  true,
  30
WHERE NOT EXISTS (
  SELECT 1 FROM estimation_products WHERE slug = 'revano-stucco-12kg'
);

INSERT INTO estimation_products (
  name, slug, category, brand, standard_pack_size, pack_unit_id,
  product_notes, technical_spec, is_active, sort_order
)
SELECT
  'Double Design Petra 20 kg',
  'double-design-petra-20kg',
  'mineral_stone',
  'Double Design Paints',
  20,
  (SELECT id FROM estimation_units WHERE lower(symbol) = 'kg' ORDER BY id LIMIT 1),
  'Elastic decorative putty for a stone-like finish, laid in all directions with an inox trowel and pressed or dragged back until the stone effect forms. The maker recommends it for hotel, restaurant, boutique and reception walls. Sold as a 20 kg small drum and a 5 kg gallon; this row is the 20 kg drum.',
  'Coverage: 0.5 to 1 m2 per kg (Double Design Paints Product Guide, page 40, "Petra - The Art of Stone"), so 10 to 20 m2 per 20 kg small drum. Pack sizes: 20 kg small drum and 5 kg gallon. No retail price is published by the maker or by any online retailer, so cost is not configured on this product.',
  true,
  31
WHERE NOT EXISTS (
  SELECT 1 FROM estimation_products WHERE slug = 'double-design-petra-20kg'
);

-- ------------------------------------------------------------------
-- 2. Application profiles (the engine will not calculate without one)
-- ------------------------------------------------------------------
INSERT INTO estimation_product_quality (
  product_id, name, slug, description, calculation_model,
  coverage_min, coverage_max, coverage_unit,
  default_coats, waste_percentage, is_active, sort_order
)
SELECT
  p.id,
  'Double coating, trowel applied',
  'double-coating-trowel',
  'Coverage as published by the maker for a double coating on sealed surfaces: 35 m2 per 12 kg bucket.',
  'coverage_based',
  70,   -- 35 m2 over two coats, expressed per coat
  70,
  'm2_per_package',
  2,
  10,
  true,
  1
FROM estimation_products p
WHERE p.slug = 'revano-stucco-12kg'
  AND NOT EXISTS (
    SELECT 1 FROM estimation_product_quality q
    WHERE q.product_id = p.id AND q.slug = 'double-coating-trowel'
  );

INSERT INTO estimation_product_quality (
  product_id, name, slug, description, calculation_model,
  coverage_min, coverage_max, coverage_unit,
  default_coats, waste_percentage, is_active, sort_order
)
SELECT
  p.id,
  'Stone effect, single pass',
  'stone-effect-single-pass',
  'Coverage as published by the maker: 0.5 to 1 m2 per kg, so 10 to 20 m2 per 20 kg drum. The thin end of the range is a light trowel pass, the heavy end a full stone build up.',
  'coverage_based',
  10,
  20,
  'm2_per_package',
  1,
  10,
  true,
  1
FROM estimation_products p
WHERE p.slug = 'double-design-petra-20kg'
  AND NOT EXISTS (
    SELECT 1 FROM estimation_product_quality q
    WHERE q.product_id = p.id AND q.slug = 'stone-effect-single-pass'
  );

-- ------------------------------------------------------------------
-- 3. Retail price (stucco only, it is the one product with a published price)
-- ------------------------------------------------------------------
INSERT INTO estimation_prices (
  price_type, ref_id, price, currency, effective_date, notes, is_active,
  price_source, market, origin, price_kind, supplier_name, source_url,
  verification_status, verified_at
)
SELECT
  'product',
  p.id,
  50000,
  'NGN',
  DATE '2026-11-11',
  'Revano Stucco, 12 kg bucket, Konga listing price.',
  true,
  'Konga Nigeria product listing',
  'NG',
  'manual',
  'retail',
  'Konga',
  'https://www.konga.com/product/revano-premium-decorative-stucco-wall-coating-12kg-blue-6826215',
  'verified',
  now()
FROM estimation_products p
WHERE p.slug = 'revano-stucco-12kg'
  AND NOT EXISTS (
    SELECT 1 FROM estimation_prices pr
    WHERE pr.price_type = 'product'
      AND pr.ref_id = p.id
      AND pr.is_active = true
  );
