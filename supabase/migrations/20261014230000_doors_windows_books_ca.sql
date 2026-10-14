-- ============================================================
-- FRELUX: Doors & Windows price book for Canada (CA)
--
-- Verified 2026-10-14 from live Home Depot Canada listings with
-- manual verification (scan_confidence='manual').
-- Only items with verified retail listings are seeded. Items lacking
-- direct local equivalence are intentionally left unpriced and
-- reported unresolved by the market resolver — never silently
-- substituted:
--   door-security:   solid security leaf is not the CA standard
--                    residential spec (screen/security doors are not
--                    directly equivalent to a solid security leaf)
--   window-louver:   tropical jalousie louvres are not standard
--                    residential practice under the National
--                    Building Code of Canada
--
-- CA (CAD, Home Depot Canada live listings):
--   door-flush:       $104.00 (Masonite 30x80 in. Primed Flush Hollow Core
--                     Smooth Interior Door Slab, Model DHP30, SKU #1000135663)
--   door-panel:       $97.00  (Masonite 30x80 in. Primed 6-Panel Hollow Core
--                     Textured Interior Door Pre-bored Slab, Model 306PBORE,
--                     SKU #1000711037)
--   door-frame:       $100.00 (Alexandria Moulding Primed Finger Jointed Pine
--                     Pre-machined Single Door Frame Set 1-1/4 in. x 4-9/16 in.,
--                     Model 03438-93S37CE, SKU #1000814129)
--   door-hinge:       $4.49   (Onward 3 in. Full Mortise Butt Hinge interior,
--                     2-pack $8.98, Model 2820NBB, SKU #1001602212)
--   door-lockset:     $13.98  (Defiant Round Satin Nickel Keyed Entry Door
--                     Knob, Model TFX200B, SKU #1001952640)
--   window-aluminium:  $268.00 (JELD-WEN Willmar 36x24 in. Sliding Window,
--                     White, Low-E, Model B44258, SKU #1000526625 — vinyl
--                     slider is the standard in-stock retail window form;
--                     CA window costs are materially higher than US
--                     equivalents, price reflects the live listing)
--
-- AU attempt same day (documented, NOT seeded — blocked by access):
--   Bunnings category and product pages are Cloudflare-gated for
--   automated browsing; Mitre 10 search renders empty for the same
--   bot session; Doors Plus is measure-and-quote only; Hume Doors
--   publishes no online prices. No fabricated prices. AU stays
--   unpriced and disclosed until a verifiable listing is captured.
-- ============================================================

WITH seeded AS (
  SELECT m.id AS material_id, v.market, v.price, v.currency, v.source
  FROM (VALUES
    ('CA', 'door-flush',       104.00, 'CAD', 'Home Depot Canada Masonite 30x80 in. Primed Flush Hollow Core Smooth Interior Door Slab $104.00, Model DHP30, live listing 2026-10-14'),
    ('CA', 'door-panel',        97.00, 'CAD', 'Home Depot Canada Masonite 30x80 in. Primed 6-Panel Hollow Core Textured Interior Door Pre-bored Slab $97.00, Model 306PBORE, live listing 2026-10-14'),
    ('CA', 'door-frame',       100.00, 'CAD', 'Home Depot Canada Alexandria Moulding Primed FJ Pine Pre-machined Single Door Frame Set 1-1/4 x 4-9/16 $100.00, Model 03438-93S37CE, live listing 2026-10-14'),
    ('CA', 'door-hinge',         4.49, 'CAD', 'Home Depot Canada Onward 3 in. Full Mortise Butt Hinge interior 2-pack $8.98 ($4.49/ea), Model 2820NBB, live listing 2026-10-14'),
    ('CA', 'door-lockset',      13.98, 'CAD', 'Home Depot Canada Defiant Round Satin Nickel Keyed Entry Door Knob $13.98, Model TFX200B, live listing 2026-10-14'),
    ('CA', 'window-aluminium', 268.00, 'CAD', 'Home Depot Canada JELD-WEN Willmar 36x24 in. Sliding Window White Low-E $268.00, Model B44258, live listing 2026-10-14')
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
