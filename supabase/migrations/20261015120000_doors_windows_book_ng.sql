-- ============================================================
-- FRELUX: Doors & Windows price book for Nigeria (NG)
--
-- Verified 2026-10-14 from live Nigerian supplier/marketplace listings
-- (Konga, Jiji verified sellers). All prices NGN, manual verification.
--
-- MARKET STRUCTURE NOTE (verified, not an omission): in the Nigerian
-- market, door frames are NOT sold as standalone catalogued retail
-- items. All 156 listings in the Jiji "Door Frames" category are
-- door sets (leaf + frame + accessories) or unrelated hardware;
-- no standalone frame-only listing exists on Konga or Jiji. Frames
-- are bundled in door set prices or made by local carpenters/timber
-- markets without published unit prices. Per the zero-fabrication
-- rule, door-frame stays VISIBLY UNPRICED for NG and is reported
-- unresolved by the resolver — never silently substituted.
-- The door-panel row below is priced from a Konga SET listing that
-- already includes the 4-inch frame, so panel-door estimates are
-- complete without a separate frame line.
--
-- NG (NGN, live listings 2026-10-14):
--   door-flush:   NGN 85,000  (HDF flush interior door leaf, Jiji.ng Mushin "A HDF Flush Door" verified-seller listing, solid door enterprise, 2026-10-14)
--   door-panel:   NGN 65,000  (Brown America Panel Door With 4inch Frame — leaf + 4" frame + complete accessories SET, Konga product 5277134, 2026-10-14)
--   door-hinge:   NGN 3,000   (4-inch door hinge, Jiji.ng Port Harcourt "Door Hinges 4"" verified-seller listing, Boniface Ovilink, 2026-10-14)
--   door-lockset: NGN 15,500  (Mission Door Lock, Konga Doors & Fixtures category live listing, was NGN 17,000, 2026-10-14)
--   door-frame:   Unpriced    (Nigerian market sells frames bundled in door sets; no standalone retail listing verified — see note above)
--   door-security: Unpriced   (security doors are high-variability custom steel/Turkish imports, NGN 230,000-550,000+ per listing, no standard unit; manual rate entry)
--   window-aluminium: Unpriced (aluminium sliding windows custom-fabricated per opening by local fabricators; manual rate entry)
--   window-louver:  Unpriced  (louvre windows assembled per run from carriers + blades; manual rate entry)
-- ============================================================

WITH seeded AS (
  SELECT m.id AS material_id, v.market, v.price, v.currency, v.source
  FROM (VALUES
    ('NG', 'door-flush',   85000.00, 'NGN', 'HDF flush interior door leaf NGN 85,000, Jiji.ng Mushin "A HDF Flush Door" verified-seller listing (solid door enterprise), live 2026-10-14'),
    ('NG', 'door-panel',   65000.00, 'NGN', 'Brown America Panel Door With 4inch Frame NGN 65,000 SET (leaf + 4-inch frame + complete accessories), Konga product 5277134, live 2026-10-14'),
    ('NG', 'door-hinge',    3000.00, 'NGN', '4-inch door hinge NGN 3,000, Jiji.ng Port Harcourt "Door Hinges 4" verified-seller listing (Boniface Ovilink), live 2026-10-14'),
    ('NG', 'door-lockset', 15500.00, 'NGN', 'Mission Door Lock NGN 15,500 (was NGN 17,000), Konga Doors & Fixtures category live listing, 2026-10-14')
  ) AS v(market, slug, price, currency, source)
  JOIN estimation_materials m ON m.slug = v.slug AND m.is_active = true
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

-- Verification: expect NG to have 4 priced door/window slugs, all manual
SELECT p.market, count(*) AS priced_slugs, bool_and(p.scan_confidence = 'manual') AS all_manual
FROM estimation_materials m
JOIN estimation_prices p ON p.ref_id = m.id
WHERE m.slug IN ('door-flush','door-panel','door-frame','door-hinge','door-lockset','door-security','window-aluminium','window-louver')
  AND p.price_type = 'material' AND p.is_active = true AND p.market = 'NG'
GROUP BY p.market;
