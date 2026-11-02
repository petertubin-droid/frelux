-- =========================================================
-- 20261013150000_role_mappings_native_markets.sql
--
-- Phase 4 (2026-10-13): role mappings for the native expansion
-- markets (JP SA AE GH KE BR ZA FR). Runs AFTER the production
-- catalog sync (20261013120000), so this file is the final word
-- on which product backs each role in these markets.
--
-- Two safety properties:
-- 1. Dimension-aware cost conversion (effectivePackSize in
--    src/lib/wallfinishing/prices.ts, added with this commit)
--    prices pack-unit layers per purchase pack. Every mapping
--    below therefore pairs a product of the SAME pack size as
--    the assembly layer (JP 16 kg cans, SA 3,6 L / 4 L pails,
--    GH/KE 4 L pails, ZA 5 L pail, BR latas). Assembly layers
--    were aligned to these retail packs in the same commit.
-- 2. Rows are only written when the material exists in
--    estimation_materials; absent materials are reported via
--    NOTICE and skipped, never guessed.
--
-- Deliberate gaps (honest, admin-visible):
--   SA/AE gypsum-plaster (MP75)          — no verified price yet
--   JP joint putty: MAPPED (16 kg box)   — book verified Oct 2026
--
-- Name/slug pack contradictions in the production book, resolved
-- towards the NAME (what the price corresponds to) and flagged
-- for admin review in the notes:
--   sa-primer-4l        "3.6L" name  vs 4l slug
--   ae-emulsion-4l      "18L" name  vs 4l slug  (price fits 4 L band)
--   gh-emulsion-4l      "20L" name  vs 4l slug  (295 GHS fits 20 L)
--   ke-emulsion-4l      "20L" name  vs 4l slug  (KSh 13,150 fits 20 L)
--   br-areia-25kg       "20 kg" name vs 25kg slug
--   fr-enduit-5kg       "15 kg" name vs 5kg slug
--   fr-hydrofuge-5l     "10L" name  vs 5l slug
--   za-sand-25kg        "40 kg" name vs 25kg slug
--   fr-sable-25kg       "35 kg" name vs 25kg slug
-- =========================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    -- JP (JPY) ------------------------------------------------
    ('JP','joint-filler','jp-pate-16kg','パテ gypsum joint putty (16 kg box)','box 16 kg',
     'Verified JP book (Oct 2026). Layer coverage 53.3 m2 per box (linear from the 15 kg datasheet rate).',110),
    ('JP','primer','jp-primer-16kg','下塗り PVA primer (16 kg can)','can 16 kg',
     'Verified JP book (Oct 2026).',111),
    ('JP','interior-paint','jp-emulsion-16kg','エマルジョンペイント interior emulsion (16 kg can)','can 16 kg',
     'Verified JP book (Oct 2026).',112),
    ('JP','exterior-paint','jp-exterior-16kg','外部用塗料 exterior paint (16 kg can)','can 16 kg',
     'Verified JP book (Oct 2026).',113),
    ('JP','waterproofer','jp-waterproof-16kg','防水塗料 waterproof coating (16 kg can)','can 16 kg',
     'Verified JP book (Oct 2026).',114),
    ('JP','concrete-mix','jp-cement-25kg','Tokuyama ordinary Portland cement (25 kg bag)','bag 25 kg',
     'Verified JP book (Oct 2026).',115),
    ('JP','sand','jp-suna-25kg','砂 washed sand (25 kg bag)','bag 25 kg',
     'Verified JP book (Oct 2026).',116),
    ('JP','sandpaper','gen-sandpaper-sheet','Sandpaper sheets (fine)','sheet',
     'Generic catalogue item, priced per sheet in every market book.',117),

    -- SA (SAR) ------------------------------------------------
    ('SA','primer','sa-primer-4l','National PVA primer for masonry (3,6 L)','pail 3,6 L',
     'Verified SA book (Oct 2026). NOTE: slug says 4l but the product name and price are the 3,6 L pack — layer aligned to 3,6 L. Admin review pending.',120),
    ('SA','interior-paint','sa-emulsion-4l','Interior emulsion (4 L)','pail 4 L',
     'Verified SA book (Oct 2026).',121),
    ('SA','exterior-paint','sa-exterior-4l','Exterior weather paint (4 L)','pail 4 L',
     'Verified SA book (Oct 2026).',122),
    ('SA','waterproofer','sa-waterproof-20l','Waterproofing (20 L)','pail 20 L',
     'Verified SA book (Oct 2026).',123),
    ('SA','concrete-mix','sa-cement-50kg','Cement (50 kg bag)','bag 50 kg',
     'Verified SA book (Oct 2026).',124),
    ('SA','sand','sa-sand-25kg','Sand (25 kg bag)','bag 25 kg',
     'Verified SA book (Oct 2026).',125),
    ('SA','sandpaper','gen-sandpaper-sheet','Sandpaper sheets (fine)','sheet',
     'Generic catalogue item, priced per sheet in every market book.',126),

    -- AE (AED) ------------------------------------------------
    ('AE','primer','ae-primer-4l','Jotun PVA primer (4 L)','pail 4 L',
     'Verified AE book (Oct 2026).',130),
    ('AE','interior-paint','ae-emulsion-4l','National Paints water-based wall emulsion (4 L)','pail 4 L',
     'Verified AE book (Oct 2026). NOTE: slug says 4l, product name mentions 18L; the 76 AED price fits the 4 L premium band — mapped per slug. Admin review pending.',131),
    ('AE','exterior-paint','ae-exterior-4l','Exterior paint (4 L)','pail 4 L',
     'Verified AE book (Oct 2026).',132),
    ('AE','waterproofer','ae-waterproof-20l','Waterproofing (20 L)','pail 20 L',
     'Verified AE book (Oct 2026).',133),
    ('AE','concrete-mix','ae-cement-50kg','Emirates cement (50 kg bag)','bag 50 kg',
     'Verified AE book (Oct 2026).',134),
    ('AE','sand','ae-sand-25kg','Sand (25 kg bag)','bag 25 kg',
     'Verified AE book (Oct 2026).',135),
    ('AE','sandpaper','gen-sandpaper-sheet','Sandpaper sheets (fine)','sheet',
     'Generic catalogue item, priced per sheet in every market book.',136),

    -- GH (GHS) ------------------------------------------------
    ('GH','skim-plaster','gh-putty-20kg','Wall putty (20 kg bag)','bag 20 kg',
     'Verified GH book (Oct 2026). Layer coverage 14.4 m2 per bag (linear from the 25 kg planning rate).',140),
    ('GH','primer','gh-primer-4l','Primer (4 L)','pail 4 L',
     'Verified GH book (Oct 2026).',141),
    ('GH','interior-paint','gh-emulsion-4l','Homecharm emulsion paint (20 L)','pail 20 L',
     'Verified GH book (Oct 2026). NOTE: slug says 4l but the product name and the 295 GHS price are the 20 L bucket — layer stays 20 L. Admin review pending.',142),
    ('GH','exterior-paint','gh-exterior-4l','Exterior paint (4 L)','pail 4 L',
     'Verified GH book (Oct 2026).',143),
    ('GH','waterproofer','gh-waterproof-20l','Waterproofing (20 L)','pail 20 L',
     'Verified GH book (Oct 2026).',144),
    ('GH','concrete-mix','gh-cement-50kg','Cement (50 kg bag)','bag 50 kg',
     'Verified GH book (Oct 2026).',145),
    ('GH','sand','gh-sand-50kg','Sand (50 kg bag)','bag 50 kg',
     'Verified GH book (Oct 2026).',146),
    ('GH','sandpaper','gen-sandpaper-sheet','Sandpaper sheets (fine)','sheet',
     'Generic catalogue item, priced per sheet in every market book.',147),

    -- KE (KES) ------------------------------------------------
    ('KE','skim-plaster','ke-gypsum-wall-filler-25kg','Gypsum wall filler (25 kg bag)','bag 25 kg',
     'Verified KE book (Oct 2026): ~18 m2 per 25 kg bag in two coats.',150),
    ('KE','primer','ke-primer-4l','Primer (4 L)','pail 4 L',
     'Verified KE book (Oct 2026).',151),
    ('KE','interior-paint','ke-emulsion-4l','Crown Vinyl Matt Luxury Emulsion (20 L)','pail 20 L',
     'Verified KE book (Oct 2026). NOTE: slug says 4l but the product name and the KSh 13,150 price are the 20 L bucket — layer stays 20 L. Admin review pending.',152),
    ('KE','exterior-paint','ke-exterior-4l','Exterior paint (4 L)','pail 4 L',
     'Verified KE book (Oct 2026).',153),
    ('KE','waterproofer','ke-waterproof-20l','Waterproofing (20 L)','pail 20 L',
     'Verified KE book (Oct 2026).',154),
    ('KE','concrete-mix','ke-cement-50kg','Cement (50 kg bag)','bag 50 kg',
     'Verified KE book (Oct 2026).',155),
    ('KE','sand','ke-sand-50kg','Sand (50 kg bag)','bag 50 kg',
     'Verified KE book (Oct 2026).',156),
    ('KE','sandpaper','gen-sandpaper-sheet','Sandpaper sheets (fine)','sheet',
     'Generic catalogue item, priced per sheet in every market book.',157),

    -- BR (BRL) ------------------------------------------------
    ('BR','skim-plaster','br-suvinil-massa-acrilica-18l','Massa corrida acrílica Suvinil (18 L lata)','lata 18 L',
     'Suvinil ficha (2026-10): up to 75 m2 per lata.',160),
    ('BR','primer','br-selador-18l','Selador Acrílico Suvinil (18 L lata)','lata 18 L',
     'Verified BR book (Oct 2026). Layer coverage 500 m2 per lata (linear from the 3,6 L galão rate).',161),
    ('BR','interior-paint','br-suvinil-premium-toque-fosco-18l','Tinta Suvinil Premium Toque Fosco (18 L lata)','lata 18 L',
     'Suvinil guide (2026-10): 115-120 m2 two coats.',162),
    ('BR','interior-paint-premium','br-acrilica-18l','Tinta acrílica premium linha construtor (18 L lata)','lata 18 L',
     'Verified BR book (Oct 2026).',163),
    ('BR','exterior-paint','br-externa-18l','Tinta acrílica Sempre Nova Suvinil (18 L lata)','lata 18 L',
     'Verified BR book (Oct 2026).',164),
    ('BR','waterproofer','br-imperm-18l','Aditivo Impermeabilizante Vedacit (18 L lata)','lata 18 L',
     'Verified BR book (Oct 2026).',165),
    ('BR','concrete-mix','br-cimento-50kg','Cimento Votoran CP II F 32 (50 kg bag)','bag 50 kg',
     'Verified BR book (Oct 2026).',166),
    ('BR','sand','br-areia-25kg','Areia média lavada (20 kg bag)','bag 20 kg',
     'Verified BR book (Oct 2026). NOTE: slug says 25kg, product name says 20 kg — labelled per name. Admin review pending.',167),
    ('BR','sandpaper','gen-sandpaper-sheet','Sandpaper sheets (fine)','sheet',
     'Generic catalogue item, priced per sheet in every market book.',168),

    -- ZA (ZAR) ------------------------------------------------
    ('ZA','skim-plaster','za-gyproc-rhinolite-40kg','Gyproc RhinoLite skim (40 kg bag)','bag 40 kg',
     'Gyproc datasheet: 2.5 kg/m2 at 2.5 mm → 16 m2 per 40 kg bag. Cashbuild price (Oct 2026).',170),
    ('ZA','primer','za-plascon-primer-5l','Plascon Gypsum & Plaster Primer (5 L)','pail 5 L',
     'Verified ZA book (Oct 2026). Layer coverage 11.25 m2 per pail (linear from the 20 L planning rate).',171),
    ('ZA','interior-paint','za-plascon-polvin-super-acrylic-20l','Plascon Polvin Super Acrylic White (20 L)','pail 20 L',
     'Verified via Paint Expert webstore (Oct 2026): R1,199 incl. VAT.',172),
    ('ZA','interior-paint-premium','za-dulux-maxicover-5l','Dulux Maxicover Soft Touch (5 L)','pail 5 L',
     'Verified ZA book (Oct 2026).',173),
    ('ZA','exterior-paint','za-dulux-weatherguard-20l','Dulux Weatherguard (20 L)','pail 20 L',
     'Verified ZA book (Oct 2026).',174),
    ('ZA','waterproofer','za-dampproof-5l','Plascon Dampseal Waterproof Sealer (5 L)','pail 5 L',
     'Verified ZA book (Oct 2026).',175),
    ('ZA','fine-filler','za-rhinolite-20kg','RhinoLite finishing plaster (20 kg bag)','bag 20 kg',
     'Verified ZA book (Oct 2026).',176),
    ('ZA','concrete-mix','za-cement-50kg','PPC Surebuild 42.5N cement (50 kg bag)','bag 50 kg',
     'Verified ZA book (Oct 2026).',177),
    ('ZA','sand','za-sand-25kg','Builders river sand (40 kg bag)','bag 40 kg',
     'Verified ZA book (Oct 2026). NOTE: slug says 25kg, product name says 40 kg — labelled per name. Admin review pending.',178),
    ('ZA','sandpaper','gen-sandpaper-sheet','Sandpaper sheets (fine)','sheet',
     'Generic catalogue item, priced per sheet in every market book.',179),

    -- FR (EUR) ------------------------------------------------
    -- skim re-asserted AFTER the production sync restored
    -- production fr-enduit-5kg (a 15 kg product against the
    -- 5 kg sac layer) — Prestonett matches the layer pack.
    ('FR','skim-plaster','fr-prestonett-m-enduit-poudre-5kg','Enduit de lissage Prestonett (sac de 5 kg)','sac 5 kg',
     'Prestonett powder documentation: ~1 kg/m2 per coat. Re-asserted after the production catalog sync (Oct 2026).',180),
    ('FR','fine-filler','fr-enduit-5kg','Enduit de lissage en pâte AXTON (15 kg)','pot 15 kg',
     'Verified FR book (Oct 2026). NOTE: slug says 5kg, product name says 15 kg — labelled per name. Admin review pending.',181),
    ('FR','exterior-paint','fr-facade-10l','Peinture façade Universelle LUXENS (10 L)','pot 10 L',
     'Verified FR book (Oct 2026).',182),
    ('FR','waterproofer','fr-hydrofuge-5l','Peinture hydrofuge acrylique façade (10 L)','pot 10 L',
     'Verified FR book (Oct 2026). NOTE: slug says 5l, product name says 10L — labelled per name. Admin review pending.',183),
    ('FR','concrete-mix','fr-cem-25kg','Ciment CEM II B-L 32,5N gris (25 kg)','bag 25 kg',
     'Verified FR book (Oct 2026).',184),
    ('FR','sand','fr-sable-25kg','Sable à maçonner 0/4 (35 kg)','sac 35 kg',
     'Verified FR book (Oct 2026). NOTE: slug says 25kg, product name says 35 kg — labelled per name. Admin review pending.',185),
    ('FR','sandpaper','gen-sandpaper-sheet','Sandpaper sheets (fine)','feuille',
     'Generic catalogue item, priced per sheet in every market book.',186)
  ) AS t(market, role, slug, disp, label, notes, sort)
  LOOP
    IF EXISTS (SELECT 1 FROM estimation_materials m WHERE m.slug = r.slug) THEN
      INSERT INTO market_material_roles
        (market, role, material_slug, display_name, unit_label, notes, is_active, sort_order)
      VALUES
        (r.market, r.role, r.slug, r.disp, r.label, r.notes, true, r.sort)
      ON CONFLICT (market, role) DO UPDATE SET
        material_slug = EXCLUDED.material_slug,
        display_name  = EXCLUDED.display_name,
        unit_label    = EXCLUDED.unit_label,
        notes         = EXCLUDED.notes,
        is_active     = true,
        sort_order    = EXCLUDED.sort_order,
        updated_at    = now();
    ELSE
      RAISE NOTICE 'role mapping skipped (material absent): % % -> %', r.market, r.role, r.slug;
    END IF;
  END LOOP;
END $$;
