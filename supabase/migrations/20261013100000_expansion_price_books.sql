-- =========================================================
-- 20261013100000_expansion_price_books.sql
--
-- Phase 4 of the 2026-10-13 expansion: verified material/price
-- book infrastructure for the eight new finish markets.
--
-- Rules honoured (per mandate):
-- - Every price row is a real web-verified retail price with the
--   retailer recorded in price_source and the survey date in the
--   note. No guessed or cross-currency figures.
-- - Products without a verified price are NOT priced: roles stay
--   unpriced and estimates flag them "not priced in this market"
--   (existing honest fallback), never zero.
-- - Everything additive and idempotent (IF NOT EXISTS / ON
--   CONFLICT DO NOTHING|UPDATE). No destructive changes.
--
-- Verified 2026-10-13 (web survey):
--   BR  Suvinil Massa Acrílica 18L/25kg    R$ 209.00  Tintas 3 de Maio
--   BR  Suvinil Premium Toque Fosco 18L    R$ 693.50  Casatoni
--   FR  Prestonett M poudre 4-en-1 5kg     € 15.90    Dooitch
--   ZA  Gyproc RhinoLite 40kg              R 394.99   BSH Mica Build
--   KE  Gypsum wall filler 25kg            KSh 690    Nairobi retail listing
-- =========================================================

-- ---------------------------------------------------------
-- 1. POP / TILE material tables become market-aware in the
--    repository. Production already carries this column (added
--    out-of-band with the 7-market POP systems on 2026-10-05);
--    this makes fresh preview databases consistent with the
--    market-first fetchers in src/lib/queries.ts, which already
--    filter on `market`. Existing rows default to 'NG'.
-- ---------------------------------------------------------
ALTER TABLE pop_materials
  ADD COLUMN IF NOT EXISTS market text NOT NULL DEFAULT 'NG';
CREATE INDEX IF NOT EXISTS idx_pop_materials_market
  ON pop_materials(market) WHERE is_active;

ALTER TABLE tile_materials
  ADD COLUMN IF NOT EXISTS market text NOT NULL DEFAULT 'NG';
CREATE INDEX IF NOT EXISTS idx_tile_materials_market
  ON tile_materials(market) WHERE is_active;

-- ---------------------------------------------------------
-- 2. ZA screeding config correction (2026-10-13 verification):
--    RhinoLite retails in 40 kg bags in South Africa (Cashbuild,
--    Builders, independent hardware), not 25 kg. At the official
--    Gyproc datasheet yield of 2.5 kg/m² a 40 kg bag covers 16 m².
--    Updates only the ZA putty row added by 20261013010000.
-- ---------------------------------------------------------
UPDATE screeding_system_config
SET
  putty_name = 'Gyproc RhinoLite skim plaster (40 kg bag)',
  coverage_area_m2 = '16',
  description = 'South African surface prep: RhinoLite gypsum skim over plastered brick — 2.5 kg/m² at 2.5 mm; 16 m² per 40 kg bag (official Gyproc datasheet; 40 kg is the SA retail bag).'
WHERE market = 'ZA' AND system_type = 'putty';

-- ---------------------------------------------------------
-- 3. Estimation materials — the verified products themselves.
--    Slugs are stable; coverage/packaging documented in notes.
-- ---------------------------------------------------------
INSERT INTO estimation_materials (name, slug, category, description, notes, is_active, sort_order)
VALUES
  ('Suvinil Massa Acrílica 18L (25 kg)', 'br-suvinil-massa-acrilica-18l', 'putty',
   'Brazilian acrylic skim coat (massa corrida) for interior walls; up to 75 m² per 18 L (25 kg) package in 2-3 crossed coats (Suvinil product ficha, 2026-10).',
   'BR skim-plaster role product. Verified: Suvinil ficha de produto, Oct 2026.',
   true, 100),
  ('Suvinil Premium Toque Fosco Completo 18L', 'br-suvinil-premium-toque-fosco-18l', 'paint',
   'Suvinil premium matte interior acrylic paint, 18 L; 115-120 m² finished coverage in two coats (official Suvinil guide, 2026-10).',
   'BR interior-paint role product. Verified: Suvinil official guide, Oct 2026.',
   true, 101),
  ('Prestonett M enduit multifonction en poudre 5 kg', 'fr-prestonett-m-enduit-poudre-5kg', 'putty',
   'French multi-use smoothing powder (rebouchage, égalisation, lissage, bandes à joint); ~1 kg/m² for lissage per Prestonett powder documentation.',
   'FR skim-plaster role product. Priced via Dooitch retail listing, Oct 2026.',
   true, 102),
  ('Gyproc RhinoLite skim plaster 40 kg', 'za-gyproc-rhinolite-40kg', 'putty',
   'South African gypsum skim plaster for plastered brick and RhinoBoard; 2.5 kg/m² at 2.5 mm, 16 m² per 40 kg retail bag (official Gyproc datasheet).',
   'ZA skim-plaster role product. Verified: Gyproc datasheet + SA retail listings, Oct 2026.',
   true, 103),
  ('Gypsum wall filler 25 kg (Kenya)', 'ke-gypsum-wall-filler-25kg', 'putty',
   'Kenyan gypsum wall filler / skim for interior walls and ceilings, 25 kg bag; planning coverage ~18 m² per bag in two coats (admin verification pending).',
   'KE skim-plaster role product. Retail listing price verified Oct 2026; coverage is a planning default.',
   true, 104)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------
-- 4. Market role mappings. A mapping without a market price is
--    inert: the resolver keeps walking the inheritance chain and
--    reports the inherited resolution, never guessing.
-- ---------------------------------------------------------
INSERT INTO market_material_roles (market, role, material_slug, display_name, unit_label, notes, sort_order)
VALUES
  ('BR', 'skim-plaster', 'br-suvinil-massa-acrilica-18l',
   'Massa corrida acrílica Suvinil (18 L / 25 kg)', 'lata 18 L',
   'BR surface prep: massa corrida skim, up to 75 m² per lata (Suvinil ficha, 2026-10).', 100),
  ('BR', 'interior-paint', 'br-suvinil-premium-toque-fosco-18l',
   'Tinta Suvinil Premium Toque Fosco Completo (18 L)', 'lata 18 L',
   'BR premium matte interior paint, 115-120 m² two coats (Suvinil guide, 2026-10).', 101),
  ('FR', 'skim-plaster', 'fr-prestonett-m-enduit-poudre-5kg',
   'Enduit de lissage Prestonett (sac de 5 kg)', 'sac 5 kg',
   'FR lissage: ~1 kg/m² per coat per Prestonett powder documentation.', 102),
  ('ZA', 'skim-plaster', 'za-gyproc-rhinolite-40kg',
   'Gyproc RhinoLite skim (40 kg bag)', 'bag 40 kg',
   'ZA skim: 2.5 kg/m² at 2.5 mm; 16 m² per 40 kg bag (official datasheet).', 103),
  ('KE', 'skim-plaster', 'ke-gypsum-wall-filler-25kg',
   'Gypsum wall filler (25 kg bag)', 'bag 25 kg',
   'KE skim: planning coverage ~18 m² per 25 kg bag in two coats (admin verification pending).', 104)
ON CONFLICT (market, role) DO UPDATE SET
  material_slug = EXCLUDED.material_slug,
  display_name = EXCLUDED.display_name,
  unit_label = EXCLUDED.unit_label,
  notes = EXCLUDED.notes,
  sort_order = EXCLUDED.sort_order;

-- ---------------------------------------------------------
-- 5. Verified prices (web survey 2026-10-13). Every row cites its
--    retailer; confidence reflects the source type.
-- ---------------------------------------------------------
INSERT INTO estimation_prices
  (price_type, ref_id, price, currency, effective_date, notes, is_active, price_source, scan_source, scan_confidence, market)
SELECT 'material', m.id, v.price, v.currency, current_date, v.notes, true, v.src, v.url, v.conf, v.market
FROM (VALUES
  ('br-suvinil-massa-acrilica-18l', 209.00, 'BRL',
   'Tintas 3 de Maio', 'https://www.tintas3demaio.com.br/massa-acrilica-18-litros-suvinil-p148',
   'Verified BR retail price R$ 209.00 (Suvinil Massa Acrílica 18L/25kg; corroborated Shopee R$233.39). Web survey 2026-10-13.',
   'high', 'BR'),
  ('br-suvinil-premium-toque-fosco-18l', 693.50, 'BRL',
   'Casatoni', 'https://www.casatoni.com.br/suvinil-tinta-acrilica-premium-toque-fosco-completo-18l-algodao-egipcio/p',
   'Verified BR retail price R$ 693.50 (Suvinil Premium Toque Fosco Completo 18L; corroborated MercadoLivre R$708.33). Web survey 2026-10-13.',
   'high', 'BR'),
  ('fr-prestonett-m-enduit-poudre-5kg', 15.90, 'EUR',
   'Dooitch', 'https://app.dooitch.com/products/enduit-multifonction-en-poudre-4-en-1-prestonett-blanc-5-kg',
   'Verified FR retail price €15.90 (Prestonett M enduit multifonction en poudre 4-en-1, 5 kg). Web survey 2026-10-13.',
   'medium', 'FR'),
  ('za-gyproc-rhinolite-40kg', 394.99, 'ZAR',
   'BSH Mica Build (SA hardware retailer)', 'https://www.facebook.com/BSHMicaBuild/posts/1308414587961924/',
   'Verified SA retail price R394.99 (Gyproc RhinoLite 40 kg; corroborated Cashbuild R527.95 for RhinoLite-family 40 kg, Edenvale marketplace R397). Web survey 2026-10-13.',
   'medium', 'ZA'),
  ('ke-gypsum-wall-filler-25kg', 690.00, 'KES',
   'Nairobi retail listing (LetsBusinessKenya)', 'https://www.facebook.com/LetsBusinessKenya/posts/3039520902770194/',
   'Nairobi retail listing price KSh 690 per 25 kg bag (gypsum wall filler; marketplace post). Admin verification recommended. Web survey 2026-10-13.',
   'medium', 'KE')
) AS v(slug, price, currency, src, url, notes, conf, market)
JOIN estimation_materials m ON m.slug = v.slug
WHERE NOT EXISTS (
  SELECT 1 FROM estimation_prices p
  WHERE p.price_type = 'material' AND p.ref_id = m.id AND p.market = v.market
    AND p.effective_date = current_date
);

-- ---------------------------------------------------------
-- 6. Price scan sources — register the surveyed retailers in the
--    source registry so the Phase 5 pipeline and the admin source
--    manager can re-verify these prices going forward.
-- ---------------------------------------------------------
INSERT INTO price_scan_sources (market, material_slug, retailer, label, product_url, expected_unit, currency)
SELECT v.market, v.slug, v.retailer, v.label, v.url, v.unit, v.currency
FROM (VALUES
  ('BR', 'br-suvinil-massa-acrilica-18l', 'Tintas 3 de Maio',
   'Suvinil Massa Acrílica 18L/25kg',
   'https://www.tintas3demaio.com.br/massa-acrilica-18-litros-suvinil-p148', 'lata 18 L', 'BRL'),
  ('BR', 'br-suvinil-premium-toque-fosco-18l', 'Casatoni',
   'Suvinil Premium Toque Fosco Completo 18L',
   'https://www.casatoni.com.br/suvinil-tinta-acrilica-premium-toque-fosco-completo-18l-algodao-egipcio/p', 'lata 18 L', 'BRL'),
  ('FR', 'fr-prestonett-m-enduit-poudre-5kg', 'Dooitch',
   'Prestonett M enduit en poudre 5kg',
   'https://app.dooitch.com/products/enduit-multifonction-en-poudre-4-en-1-prestonett-blanc-5-kg', 'sac 5 kg', 'EUR'),
  ('ZA', 'za-gyproc-rhinolite-40kg', 'BSH Mica Build',
   'Gyproc RhinoLite skim plaster 40kg',
   'https://www.facebook.com/BSHMicaBuild/posts/1308414587961924/', 'bag 40 kg', 'ZAR'),
  ('KE', 'ke-gypsum-wall-filler-25kg', 'Nairobi retail listing',
   'Gypsum wall filler 25kg (Nairobi)',
   'https://www.facebook.com/LetsBusinessKenya/posts/3039520902770194/', 'bag 25 kg', 'KES')
) AS v(market, slug, retailer, label, url, unit, currency)
WHERE NOT EXISTS (
  SELECT 1 FROM price_scan_sources s
  WHERE s.market = v.market AND s.material_slug = v.slug AND s.retailer = v.retailer
);
