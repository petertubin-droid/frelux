-- =========================================================
-- 20261013130000_za_rhinolite_cashbuild.sql
--
-- Phase 4 refinement (2026-10-13): improve the provenance of the
-- ZA RhinoLite 40 kg price seeded by 20261013100000.
--
-- The web survey that seeded R394.99 (BSH Mica Build) later found
-- the same product on Cashbuild's national e-commerce store at
-- R399.95 — a stronger source (national chain webstore, multiple
-- store listings corroborating R398.95-R459.95). This raises the
-- price confidence to 'high' and registers Cashbuild in the scan
-- source registry for the Phase 5 pipeline.
--
-- Guarded: only touches the row created by 20261013100000 (same
-- material, market, effective date and source). Production keeps
-- any price it already has — the guard's price_source match means
-- an admin-edited price is never overwritten.
-- =========================================================

UPDATE estimation_prices
SET
  price = 399.95,
  price_source = 'Cashbuild (national chain webstore)',
  scan_source = 'https://www.cashbuild.co.za/598-ceiling',
  scan_confidence = 'high',
  notes = 'Verified SA retail price R399.95 at Cashbuild webstore (RhinoLite Multipurpose 40kg; corroborated by store listings R398.95–R459.95 and BSH Mica Build R394.99). Web survey 2026-10-13.'
WHERE price_type = 'material'
  AND ref_id = (SELECT id FROM estimation_materials WHERE slug = 'za-gyproc-rhinolite-40kg')
  AND market = 'ZA'
  AND effective_date = current_date
  AND price_source = 'BSH Mica Build (SA hardware retailer)';

-- Register Cashbuild as a scan source for the RhinoLite product
INSERT INTO price_scan_sources (market, material_slug, retailer, label, product_url, expected_unit, currency)
SELECT 'ZA', 'za-gyproc-rhinolite-40kg', 'Cashbuild',
       'RhinoLite Multipurpose Plaster 40kg',
       'https://www.cashbuild.co.za/598-ceiling', 'bag 40 kg', 'ZAR'
WHERE NOT EXISTS (
  SELECT 1 FROM price_scan_sources
  WHERE market = 'ZA' AND material_slug = 'za-gyproc-rhinolite-40kg' AND retailer = 'Cashbuild'
);
