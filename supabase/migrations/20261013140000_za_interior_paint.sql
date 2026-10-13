-- =========================================================
-- 20261013140000_za_interior_paint.sql
--
-- Phase 4 verification batch (2026-10-13): the ZA interior-paint
-- role. The assembly za-interior-skim-paint prices its paint layer
-- per 20 L pail (conservative 40 m² finished coverage in two
-- coats; Plascon datasheet is up to ~9 m²/L per coat).
--
-- Verified 2026-10-13:
--   ZA  Plascon Polvin Super Acrylic White 20L  R1,199.00
--       Paint Expert (Plascon dealer webstore, incl. VAT)
--       Corroborated: Kings Hardware R999 promo, Elite Building
--       Supplies R1,099, Pietria R1,593.30.
--
-- SA/AE MP75, JP putty and GH putty remain UNVERIFIED — their
-- roles stay unmapped and estimates keep flagging them honestly.
-- =========================================================

INSERT INTO estimation_materials (name, slug, category, description, notes, is_active, sort_order)
VALUES
  ('Plascon Polvin Super Acrylic White 20L', 'za-plascon-polvin-super-acrylic-20l', 'paint',
   'South African interior/exterior super acrylic emulsion, 20 L; up to 9 m²/L per coat (Plascon product data). Assembly uses a conservative 40 m² per 20 L in two coats.',
   'ZA interior-paint role product. Verified via Paint Expert webstore, Oct 2026.',
   true, 105)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO market_material_roles (market, role, material_slug, display_name, unit_label, notes, sort_order)
VALUES
  ('ZA', 'interior-paint', 'za-plascon-polvin-super-acrylic-20l',
   'PVA/acrylic interior paint (20 L)', 'pail 20 L',
   'ZA interior paint: Plascon Polvin Super Acrylic; assembly coverage 40 m² per 20 L in two coats (conservative vs. ~9 m²/L datasheet).', 105)
ON CONFLICT (market, role) DO UPDATE SET
  material_slug = EXCLUDED.material_slug,
  display_name = EXCLUDED.display_name,
  unit_label = EXCLUDED.unit_label,
  notes = EXCLUDED.notes,
  sort_order = EXCLUDED.sort_order;

INSERT INTO estimation_prices
  (price_type, ref_id, price, currency, effective_date, notes, is_active, price_source, scan_source, scan_confidence, market)
SELECT 'material', m.id, 1199.00, 'ZAR', current_date,
  'Verified SA retail price R1,199.00 incl. VAT (Plascon Polvin Super Acrylic White 20L). Corroborated R999–R1,593 across SA retailers. Web survey 2026-10-13.',
  true, 'Paint Expert (Plascon dealer webstore)',
  'http://paintexpert.co.za.dedi1049.jnb3.host-h.net/product/plascon-polvin-super-acrylic-20l/',
  'medium', 'ZA'
FROM estimation_materials m
WHERE m.slug = 'za-plascon-polvin-super-acrylic-20l'
  AND NOT EXISTS (
    SELECT 1 FROM estimation_prices p
    WHERE p.price_type = 'material' AND p.ref_id = m.id AND p.market = 'ZA'
      AND p.effective_date = current_date
  );

INSERT INTO price_scan_sources (market, material_slug, retailer, label, product_url, expected_unit, currency)
SELECT 'ZA', 'za-plascon-polvin-super-acrylic-20l', 'Paint Expert',
       'Plascon Polvin Super Acrylic 20L',
       'http://paintexpert.co.za.dedi1049.jnb3.host-h.net/product/plascon-polvin-super-acrylic-20l/', 'pail 20 L', 'ZAR'
WHERE NOT EXISTS (
  SELECT 1 FROM price_scan_sources
  WHERE market = 'ZA' AND material_slug = 'za-plascon-polvin-super-acrylic-20l' AND retailer = 'Paint Expert'
);
