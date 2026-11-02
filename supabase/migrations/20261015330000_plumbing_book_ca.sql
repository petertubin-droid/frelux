-- ============================================================
-- FRELUX: Plumbing price book CANADA (CA) — 9/9 rows, verified
-- 2026-10-14 from live homedepot.ca listings (Laval store where
-- browser-verified), scan_confidence='manual'. System per CA
-- profile: PEX-B 3/4" (CSA B137.5) barb fittings, ABS DWV 2"/3"
-- per NPC 2020 / CSA B181.1.
--   ca-elbow:  Waterline 3/4" Poly Alloy PEX Elbow, $3.98 (1001070369)
--   ca-tee:    Waterline 3/4" Poly Alloy PEX Tee, $5.22 (1001070375)
--   ca-reducer: Apollo 3/4x1/2" brass PEX-B reducing elbow, $3.97
--               (1001012354, browser-verified)
--   ca-union:  Waterline 3/4" Poly Alloy PEX Coupling, $2.91 (1001070957)
--   ca-valve:  Apollo 3/4" brass PEX-B barb ball valve, $13.94
--               (1001012669, browser-verified)
--   ca-pipe-cold/hot: Apollo 3/4" x 100 ft PEX-B white coil,
--               $64.98 = $2.13/m (1000144860)
--   ca-pipe-waste: IPEX Cell Core 2" x 12 ft ABS DWV,
--               $27.98 = $7.65/m (1000120775)
--   ca-pipe-drainage: IPEX Cell Core 3" x 12 ft ABS DWV,
--               $42.98 = $11.75/m (1000120780)
-- ============================================================

INSERT INTO estimation_materials (name, slug, category, description, effective_date, is_active, sort_order)
VALUES
  ('PEX barb elbow, 3/4" poly alloy (CA)', 'ca-elbow', 'pipe', 'Per piece. homedepot.ca Waterline 3/4 inch Poly Alloy Pex Elbow (1001070369), CAD $3.98 — live listing read 2026-10-14. Canadian practice uses PEX-B with barb/crimp fittings per CSA B137.5.', CURRENT_DATE, true, 5),
  ('PEX barb tee, 3/4" poly alloy (CA)', 'ca-tee', 'pipe', 'Per piece. homedepot.ca Waterline 3/4 inch Poly Alloy Pex Tee (1001070375), CAD $5.22 — live listing read 2026-10-14.', CURRENT_DATE, true, 5),
  ('PEX reducing elbow, 3/4 x 1/2" brass (CA)', 'ca-reducer', 'pipe', 'Per piece. homedepot.ca Apollo 3/4 in. x 1/2 in. Brass PEX-B Barb 90-Degree Reducing Elbow (1001012354), CAD $3.97 — browser-verified 2026-10-14 (Laval store). Reduces the 3/4" trunk to 1/2" fixture branches per NPC.', CURRENT_DATE, true, 5),
  ('PEX barb coupling (union), 3/4" (CA)', 'ca-union', 'pipe', 'Per piece. homedepot.ca Waterline 3/4 inch Poly Alloy Pex Coupling (1001070957), CAD $2.91 — live listing read 2026-10-14. Straight coupling serves the union role.', CURRENT_DATE, true, 5),
  ('PEX ball valve, 3/4" brass (CA)', 'ca-valve', 'pipe', 'Per piece. homedepot.ca Apollo 3/4 in. Brass PEX-B Barb Ball Valve (1001012669), CAD $13.94 — browser-verified 2026-10-14 (Laval store).', CURRENT_DATE, true, 5),
  ('PEX-B pipe, 3/4" x 100ft, per metre (CA)', 'ca-pipe-cold', 'pipe', 'Per metre. homedepot.ca Apollo 3/4-inch x 100 ft PEX-B Pipe in White (1000144860), CAD $64.98 per 30.48 m coil = CAD $2.13/m — live listing read 2026-10-14. 3/4" main trunk per NPC.', CURRENT_DATE, true, 5),
  ('PEX-B pipe, 3/4" x 100ft, per metre (CA)', 'ca-pipe-hot', 'pipe', 'Per metre. Same homedepot.ca Apollo PEX-B 3/4" x 100 ft coil, CAD $64.98 = $2.13/m. PEX serves hot + cold distribution (rated 200°F).', CURRENT_DATE, true, 5),
  ('ABS DWV pipe, 2" x 12ft, per metre (CA)', 'ca-pipe-waste', 'pipe', 'Per metre. homedepot.ca IPEX Cell Core 2 inch x 12 feet ABS DWV Pipe (1000120775), CAD $27.98 per 3.66 m = CAD $7.65/m — live listing read 2026-10-14. 2" ABS waste per CSA B181.1.', CURRENT_DATE, true, 5),
  ('ABS DWV pipe, 3" x 12ft, per metre (CA)', 'ca-pipe-drainage', 'pipe', 'Per metre. homedepot.ca IPEX Cell Core 3 inch x 12 feet ABS DWV Pipe (1000120780), CAD $42.98 per 3.66 m = CAD $11.75/m — live listing read 2026-10-14. 3"/4" ABS soil stack per NPC.', CURRENT_DATE, true, 5)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description, effective_date = EXCLUDED.effective_date, is_active = true, updated_at = now();

WITH seeded AS (
  SELECT m.id AS material_id, v.market, v.price, v.currency, v.source
  FROM (VALUES
    ('CA', 'ca-elbow',            3.98, 'CAD', 'homedepot.ca Waterline 3/4" Poly Alloy PEX Elbow CAD $3.98, live listing read 2026-10-14'),
    ('CA', 'ca-tee',              5.22, 'CAD', 'homedepot.ca Waterline 3/4" Poly Alloy PEX Tee CAD $5.22, live listing read 2026-10-14'),
    ('CA', 'ca-reducer',          3.97, 'CAD', 'homedepot.ca Apollo 3/4x1/2" brass reducing elbow CAD $3.97, browser-verified 2026-10-14'),
    ('CA', 'ca-union',            2.91, 'CAD', 'homedepot.ca Waterline 3/4" Poly Alloy PEX Coupling CAD $2.91, live listing read 2026-10-14'),
    ('CA', 'ca-valve',           13.94, 'CAD', 'homedepot.ca Apollo 3/4" brass PEX-B ball valve CAD $13.94, browser-verified 2026-10-14'),
    ('CA', 'ca-pipe-cold',        2.13, 'CAD', 'homedepot.ca Apollo PEX-B 3/4" x 100ft CAD $64.98 = $2.13/m, live listing read 2026-10-14'),
    ('CA', 'ca-pipe-hot',         2.13, 'CAD', 'Same homedepot.ca Apollo PEX-B 3/4" x 100ft coil; PEX serves hot+cold, read 2026-10-14'),
    ('CA', 'ca-pipe-waste',        7.65, 'CAD', 'homedepot.ca IPEX 2" x 12ft ABS DWV CAD $27.98 = $7.65/m, live listing read 2026-10-14'),
    ('CA', 'ca-pipe-drainage',    11.75, 'CAD', 'homedepot.ca IPEX 3" x 12ft ABS DWV CAD $42.98 = $11.75/m, live listing read 2026-10-14')
  ) AS v(market, slug, price, currency, source)
  JOIN estimation_materials m ON m.slug = v.slug
)
, deactivated AS (
  UPDATE estimation_prices p SET is_active = false, updated_at = now()
  FROM seeded s
  WHERE p.price_type = 'material' AND p.ref_id = s.material_id AND p.market = s.market AND p.is_active = true
  RETURNING 1
)
INSERT INTO estimation_prices (price_type, ref_id, price, currency, effective_date, notes, is_active, price_source, scan_confidence, market)
SELECT 'material', s.material_id, s.price, s.currency, CURRENT_DATE, s.source, true, s.source, 'manual', s.market
FROM seeded s
ON CONFLICT DO NOTHING;

SELECT m.slug, p.market, p.price, p.currency, p.scan_confidence
FROM estimation_materials m JOIN estimation_prices p ON p.ref_id = m.id
WHERE (m.slug LIKE 'ca-pipe-%' OR m.slug IN ('ca-elbow','ca-tee','ca-reducer','ca-union','ca-valve'))
  AND p.price_type = 'material' AND p.is_active = true ORDER BY m.slug;
