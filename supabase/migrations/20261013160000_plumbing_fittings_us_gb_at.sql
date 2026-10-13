-- ============================================================
-- FRELUX: Plumbing fittings + valves price books (US, GB, AT)
-- Verified batch 2026-10-13 (web-verified supplier listings;
-- scan_confidence='manual'). DE intentionally NOT seeded yet:
-- obi.de/hornbach.de listings did not yield clean per-piece
-- prices in this pass (see TODO-AGENT-HANDOFF.md section 4B).
--
-- NOT yet executed against the live DB (management token was
-- unavailable in the authoring session). Run in the Supabase
-- SQL editor or via the Management API, then verify with the
-- SELECT at the bottom.
--
-- Engine keys resolved: plumb-elbow, plumb-tee, plumb-reducer,
-- plumb-union, plumb-valve (per-piece).
-- Resolver wiring: resolveMarketPlumbing (structural-market.ts)
-- already walks PLUMBING_FITTING_KEYS; no app change needed.
--
-- Honest gaps (will show as "not covered" in the estimator,
-- never NG fallback): gb-union, at-elbow, at-union, at-valve,
-- and all DE fitting rows.
-- ============================================================

-- 1. Materials (idempotent by slug; category 'pipe' matches the
--    market price-book convention used by us-pipe-cold etc.)
INSERT INTO estimation_materials (name, slug, category, description, effective_date, is_active, sort_order)
VALUES
  -- US: brass PEX-B crimp fittings, 1/2 in (per piece)
  ('Lead-free brass crimp elbow, 1/2 in PEX (US)', 'us-elbow', 'pipe',
   'Per piece. PexUniverse: 1/2 in PEX x 1/2 in PEX elbow (lead-free) USD 0.85 each (read from live listing 2026-10-13). US practice substitutes PEX-B crimp fittings for the NG PVC fittings.',
   CURRENT_DATE, true, 5),
  ('Brass PEX crimp tee, 1/2 x 1/2 x 1/2 in (US)', 'us-tee', 'pipe',
   'Per piece. AF Supply SKU CR12T: retail USD 2.28 - 0.46 = USD 1.82 each (read from live listing 2026-10-13).',
   CURRENT_DATE, true, 5),
  ('Brass PEX-B reducing tee, 1/2 x 3/8 x 3/8 in (US)', 'us-reducer', 'pipe',
   'Per piece. Walmart XFITTING 1/2 x 3/8 x 3/8 in reducing tee, 5-pack USD 9.99 = USD 2.00 each (read from live listing 2026-10-13).',
   CURRENT_DATE, true, 5),
  ('Brass PEX coupling (splice union), 1/2 in (US)', 'us-union', 'pipe',
   'Per piece. Water Armor (The Brass Warehouse) 1/2 in brass PEX crimp coupling, 25-pack USD 25.10 = approx USD 1.00 each (read from live listing 2026-10-13; bulk pack, admin-adjustable).',
   CURRENT_DATE, true, 5),
  ('PEX crimp ball valve, 1/2 x 1/2 in (US)', 'us-valve', 'pipe',
   'Per piece. AF Supply PEX crimp ball valve 1/2 x 1/2: retail USD 14.75 - 8.33 = USD 6.42 each (read from live listing 2026-10-13).',
   CURRENT_DATE, true, 5),
  -- GB: 15mm push-fit / MSV (per piece, inc VAT)
  ('Push-fit copper elbow, 15mm (GB)', 'gb-elbow', 'pipe',
   'Per piece. Wickes Primaflow Copper Push-Fit Elbow 15mm GBP 3.00 each (read from live listing 2026-10-13).',
   CURRENT_DATE, true, 5),
  ('Push-fit equal tee, 15mm (GB)', 'gb-tee', 'pipe',
   'Per piece. Screwfix JG Speedfit Equal Tees 15mm, 5-pack GBP 15.75 inc VAT = GBP 3.15 each (read from live listing 2026-10-13).',
   CURRENT_DATE, true, 5),
  ('Push-fit reducing tee, 15 x 15 x 10mm (GB)', 'gb-reducer', 'pipe',
   'Per piece. JG Speedfit Reducing Tee 15 x 15 x 10mm GBP 7.26 inc VAT via Plumbing at Source (read from live listing 2026-10-13).',
   CURRENT_DATE, true, 5),
  ('Push-fit service (isolating) valve, 15mm (GB)', 'gb-valve', 'pipe',
   'Per piece. JG Speedfit 15SVP Service Valve 15mm GBP 8.45 at Wickes (read from live listing 2026-10-13).',
   CURRENT_DATE, true, 5),
  -- AT: PPR fusion fittings, Multitherm (per piece)
  ('PPR T-piece 90 deg, 25 x 20 x 25mm (AT)', 'at-tee', 'pipe',
   'Per piece. HORNBACH.at PPR-T-Stueck Multitherm 90 grad 25x20x25mm EUR 1.59 (read from live listing 2026-10-13). AT practice uses PPR fusion fittings.',
   CURRENT_DATE, true, 5),
  ('PPR reducer, 25 x 20mm (AT)', 'at-reducer', 'pipe',
   'Per piece. HORNBACH.at PPR-Reduktion Multitherm 25x20mm EUR 0.98 (read from live listing 2026-10-13).',
   CURRENT_DATE, true, 5)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    effective_date = EXCLUDED.effective_date,
    is_active = true,
    updated_at = now();

-- 2. Prices (deactivate any prior active market rows for these
--    refs, then insert the verified rows; resolver picks the newest
--    active effective_date)
WITH seeded AS (
  SELECT m.id AS material_id, v.market, v.price, v.currency, v.source
  FROM (VALUES
    ('US', 'us-elbow',    0.85,  'USD', 'PexUniverse 1/2in PEX x PEX elbow (lead-free) USD 0.85 each, live listing read 2026-10-13 (pexuniverse.com)'),
    ('US', 'us-tee',      1.82,  'USD', 'AF Supply SKU CR12T PEX crimp tee 1/2x1/2x1/2 USD 1.82 each, live listing read 2026-10-13 (afsupply.com)'),
    ('US', 'us-reducer',  2.00,  'USD', 'Walmart XFITTING 1/2x3/8x3/8in PEX reducing tee 5-pack USD 9.99 = USD 2.00 each, live listing read 2026-10-13 (walmart.com)'),
    ('US', 'us-union',    1.00,  'USD', 'Water Armor (The Brass Warehouse) 1/2in brass PEX coupling 25-pack USD 25.10 = approx USD 1.00 each, live listing read 2026-10-13 (waterarmorusa.com); bulk pack, admin-adjustable'),
    ('US', 'us-valve',    6.42,  'USD', 'AF Supply PEX crimp ball valve 1/2x1/2 USD 6.42 each, live listing read 2026-10-13 (afsupply.com)'),
    ('GB', 'gb-elbow',    3.00,  'GBP', 'Wickes Primaflow Copper Push-Fit Elbow 15mm GBP 3.00 each, live listing read 2026-10-13 (wickes.co.uk)'),
    ('GB', 'gb-tee',      3.15,  'GBP', 'Screwfix JG Speedfit Equal Tees 15mm 5-pack GBP 15.75 inc VAT = GBP 3.15 each, live listing read 2026-10-13 (screwfix.com)'),
    ('GB', 'gb-reducer',  7.26,  'GBP', 'JG Speedfit Reducing Tee 15x15x10mm GBP 7.26 inc VAT via Plumbing at Source, live listing read 2026-10-13 (plumbingatsource.com)'),
    ('GB', 'gb-valve',    8.45,  'GBP', 'JG Speedfit 15SVP Service Valve 15mm GBP 8.45 at Wickes, live listing read 2026-10-13 (wickes.co.uk)'),
    ('AT', 'at-tee',      1.59,  'EUR', 'HORNBACH.at PPR-T-Stueck Multitherm 90deg 25x20x25mm EUR 1.59, live listing read 2026-10-13 (hornbach.at/p/4031009)'),
    ('AT', 'at-reducer',  0.98,  'EUR', 'HORNBACH.at PPR-Reduktion Multitherm 25x20mm EUR 0.98, live listing read 2026-10-13 (hornbach.at/p/4031018)')
  ) AS v(market, slug, price, currency, source)
  JOIN estimation_materials m ON m.slug = v.slug
)
, deactivated AS (
  UPDATE estimation_prices p
  SET is_active = false, updated_at = now()
  FROM seeded s
  WHERE p.price_type = 'material'
    AND p.ref_id = s.material_id
    AND p.market = s.market
    AND p.is_active = true
  RETURNING 1
)
INSERT INTO estimation_prices (price_type, ref_id, price, currency, effective_date, notes, is_active, price_source, scan_confidence, market)
SELECT 'material', s.material_id, s.price, s.currency, CURRENT_DATE, s.source, true, s.source, 'manual', s.market
FROM seeded s
ON CONFLICT DO NOTHING;

-- 3. Verification (expect 11 rows, all scan_confidence='manual')
SELECT m.slug, m.name, p.market, p.price, p.currency, p.scan_confidence
FROM estimation_materials m
JOIN estimation_prices p ON p.ref_id = m.id
WHERE m.slug IN ('us-elbow','us-tee','us-reducer','us-union','us-valve',
                 'gb-elbow','gb-tee','gb-reducer','gb-valve',
                 'at-tee','at-reducer')
  AND p.price_type = 'material' AND p.is_active = true
ORDER BY p.market, m.slug;
