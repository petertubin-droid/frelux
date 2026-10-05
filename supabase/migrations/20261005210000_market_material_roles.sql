-- =========================================================
-- Market material roles + real US retail price book
--
-- FRELUX went worldwide: engines now resolve materials by ROLE
-- (bonding agent, masonry waterproofer, mold treatment...), and
-- each market maps roles to the materials its builders actually
-- use. Nigerian acrylic bond, water seal and anti-fungal stay
-- the NG mapping; the US gets its own real products (Quikrete,
-- USG Sheetrock, Drylok, RMR-86, Behr, Zinsser...) with retail
-- prices verified 2026-10-05 and their retailers recorded in
-- price_source.
--
-- The 5 generic USD reference rows seeded by 20261007120000 are
-- deactivated: they mapped NG products to invented USD prices.
-- Real US product rows replace them. History is kept (rows are
-- deactivated, not deleted).
--
-- Idempotent: safe to re-run.
-- =========================================================

-- ---------------------------------------------------------
-- 1. market_material_roles: role -> local material per market
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS market_material_roles (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market        text NOT NULL,              -- ISO 3166-1 alpha-2
  role          text NOT NULL,              -- engine-level concept (bonding-agent, ...)
  material_slug text NOT NULL,              -- estimation_materials.slug in this market
  display_name  text NOT NULL, DEFAULT '',
  unit_label    text NOT NULL DEFAULT 'unit',
  notes         text,
  is_active     boolean NOT NULL DEFAULT true,
  sort_order    integer NOT NULL DEFAULT 100,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (market, role)
);

CREATE INDEX IF NOT EXISTS market_material_roles_market_idx
  ON market_material_roles (market) WHERE is_active;

COMMENT ON TABLE market_material_roles IS
  'Engine-level material roles resolved per market: a role (bonding-agent, masonry-waterproofer, ...) maps to the material local builders actually use. Engines price through this mapping, never through hard-coded material names.';

ALTER TABLE market_material_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_material_roles FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mmr_public_read" ON market_material_roles;
CREATE POLICY "mmr_public_read" ON market_material_roles FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "mmr_admin_write" ON market_material_roles;
CREATE POLICY "mmr_admin_write" ON market_material_roles FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "mmr_admin_update" ON market_material_roles;
CREATE POLICY "mmr_admin_update" ON market_material_roles FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "mmr_admin_delete" ON market_material_roles;
CREATE POLICY "mmr_admin_delete" ON market_material_roles FOR DELETE
  TO authenticated USING (public.is_admin());

GRANT SELECT ON TABLE public.market_material_roles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.market_material_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.market_material_roles TO service_role;

-- ---------------------------------------------------------
-- 2. US materials: the real products US painters/builders use
--    (no prices seeded here — prices live in estimation_prices)
-- ---------------------------------------------------------
INSERT INTO estimation_materials (name, slug, category, description, is_active, sort_order) VALUES
  ('Quikrete 80 lb Concrete Mix', 'us-quikrete-concrete-80lb', 'concrete',
   '80 lb bag of all-purpose concrete mix. US equivalent of bagged cement for small pours and screed bases.', true, 40),
  ('All-Purpose Sand (50 lb)', 'us-sand-50lb', 'aggregate',
   'All-purpose / play sand, 50 lb bag. US equivalent of sharp sand for screeding mixes.', true, 41),
  ('Quikrete Concrete Bonding Adhesive', 'us-quikrete-bonding-adhesive', 'bonding',
   'Liquid bonding adhesive for existing-to-new concrete and plaster. US equivalent of acrylic bond.', true, 42),
  ('USG Sheetrock All-Purpose Joint Compound', 'us-joint-compound-45gal', 'filler',
   'Ready-mixed joint compound, 4.5 gal pail. The US standard wall filler (no POP tradition).', true, 43),
  ('Drylok Extreme Masonry Waterproofer', 'us-drylok-extreme', 'waterproofing',
   'Latex masonry waterproofer for interior/exterior walls, 1 gal. US equivalent of water seal on block walls.', true, 44),
  ('Thompson''s WaterSeal Multi-Surface Waterproofer', 'us-thompsons-waterseal', 'waterproofing',
   'Clear multi-surface waterproofer, 1 gal. Wood, concrete and masonry sealing.', true, 45),
  ('RMR-86 Pro Mold Stain Remover', 'us-rmr-86', 'mold-treatment',
   'Contractor-grade instant mold and mildew stain remover, 1 gal. US equivalent of anti-fungal wash.', true, 46),
  ('Concrobium Mold Control', 'us-concrobium-mold-control', 'mold-treatment',
   'Mold cleaner and preventive, 1 gal. Encapsulating (non-bleach) treatment.', true, 47),
  ('DAP AMP Advanced Hybrid Caulk', 'us-dap-amp-caulk', 'caulk',
   'Paintable hybrid polymer caulk/sealant, 9 oz tube. Gap filling before painting.', true, 48),
  ('Behr Premium Plus Interior Paint & Primer', 'us-behr-premium-plus-interior', 'paint',
   'Water-based interior satin enamel with primer, 1 gal. Standard US interior emulsion.', true, 49),
  ('Behr Marquee Interior Paint', 'us-behr-marquee-interior', 'paint',
   'Premium one-coat interior paint, 1 gal. Top-tier US interior emulsion.', true, 50),
  ('Behr Premium Plus Exterior Paint & Primer', 'us-behr-premium-plus-exterior', 'paint',
   'Satin enamel exterior house paint with primer, 1 gal. Standard US exterior emulsion.', true, 51),
  ('Zinsser Bulls Eye 1-2-3 Primer', 'us-zinsser-bulls-eye-123', 'primer',
   'Water-based all-surface primer-sealer, 1 qt. The US standard bonding/stain-blocking primer.', true, 52),
  ('KILZ 2 All-Purpose Primer', 'us-kilz-2-primer', 'primer',
   'Water-based interior/exterior multi-surface primer, 1 gal.', true, 53)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------
-- 3. Deactivate the generic USD reference rows from 20261007120000.
--    They priced NG products in USD; real US products replace them.
-- ---------------------------------------------------------
UPDATE estimation_prices
SET is_active = false,
    notes = coalesce(notes, '') || ' [Deactivated: generic USD reference replaced by real US product rows — 2026-10-05]',
    updated_at = now()
WHERE market = 'US'
  AND is_active
  AND price_type = 'material'
  AND ref_id IN (
    SELECT id FROM estimation_materials
    WHERE slug IN ('cement', 'sand', 'acrylic-bond', 'water-seal', 'anti-fungal')
  );

-- ---------------------------------------------------------
-- 4. Real US retail prices (verified 2026-10-05).
--    price_source records the retailer; effective_date is the
--    verification date. NOT EXISTS-guarded per material+market.
-- ---------------------------------------------------------
INSERT INTO estimation_prices (price_type, ref_id, price, currency, market, effective_date, price_source, notes)
SELECT
  'material',
  m.id,
  seed.price,
  'USD',
  'US',
  '2026-10-05'::date,
  seed.retailer,
  seed.note
FROM estimation_materials m
JOIN (VALUES
  ('us-quikrete-concrete-80lb',       7.97::numeric, 'Home Depot',        '80 lb bag. Home Depot SKU 100450, verified 2026-10-05.'),
  ('us-quikrete-bonding-adhesive',   16.99::numeric, 'True Value',        '1 gal bottle. Quikrete No. 9902-86, verified 2026-10-05.'),
  ('us-joint-compound-45gal',        24.09::numeric, 'Home Depot',        '4.5 gal pail, USG Sheetrock All-Purpose. Verified 2026-10-05.'),
  ('us-drylok-extreme',              23.99::numeric, 'List price 2026-06', '1 gal, Drylok Extreme masonry waterproofer. List price $23.99.'),
  ('us-thompsons-waterseal',         17.97::numeric, 'Walmart',           '1 gal, clear multi-surface waterproofer. Verified 2026-10-05.'),
  ('us-rmr-86',                      32.99::numeric, 'US retail',         '1 gal, RMR-86 Pro contractor grade. Verified 2026-10-05.'),
  ('us-behr-premium-plus-interior',  39.20::numeric, 'Home Depot',        'Per gallon (5 gal pail $196). Verified 2026-10-05.'),
  ('us-behr-marquee-interior',       43.00::numeric, 'Home Depot',        'Per gallon, one-coat premium line. Verified 2026-10-05.'),
  ('us-behr-premium-plus-exterior',  39.20::numeric, 'Home Depot',        'Per gallon (5 gal pail $196). Verified 2026-10-05.'),
  ('us-zinsser-bulls-eye-123',       16.97::numeric, 'Walmart',           '1 QUART (not gallon). Bulls Eye 1-2-3 water-based, verified 2026-10-05.')
) AS seed(slug, price, retailer, note) ON seed.slug = m.slug
WHERE m.is_active
  AND NOT EXISTS (
    SELECT 1 FROM estimation_prices p
    WHERE p.ref_id = m.id AND p.market = 'US' AND p.is_active
  );

-- Sand (us-sand-50lb), Concrobium, KILZ 2 and DAP AMP get material
-- records but no seeded price: the admin enters the verified price
-- through the Price Updater (the no-guess rule).

-- ---------------------------------------------------------
-- 5. Role mappings. NG keeps its existing materials; US maps the
--    same roles to its real products.
-- ---------------------------------------------------------
INSERT INTO market_material_roles (market, role, material_slug, display_name, unit_label, notes, sort_order) VALUES
  -- Nigeria (reference market)
  ('NG', 'concrete-mix',         'cement',              'Cement',                    'bag',    'Bagged cement as the NG concrete/screed base.', 1),
  ('NG', 'sand',                 'sand',                'Sand',                       'unit',   'Sharp sand for screed mixes.', 2),
  ('NG', 'bonding-agent',        'acrylic-bond',        'Acrylic Bond',               'unit',   'Bonding agent for screed-to-substrate.', 3),
  ('NG', 'waterproofer',         'water-seal',         'Water Seal',                 'unit',   'Waterproofing compound for damp walls.', 4),
  ('NG', 'mold-treatment',       'anti-fungal',         'Anti-fungal',                'unit',   'Fungicidal wash before repainting.', 5),
  -- United States
  ('US', 'concrete-mix',         'us-quikrete-concrete-80lb',     'Quikrete 80 lb Concrete Mix', 'bag',     'US bagged concrete for pours and screed bases.', 1),
  ('US', 'sand',                 'us-sand-50lb',                  'All-Purpose Sand (50 lb)',   'bag',     'Bagged sand replaces sharp sand in screed mixes.', 2),
  ('US', 'bonding-agent',        'us-quikrete-bonding-adhesive',  'Quikrete Bonding Adhesive',   'gallon',  'Liquid bonding adhesive (acrylic bond equivalent).', 3),
  ('US', 'joint-filler',         'us-joint-compound-45gal',       'Sheetrock Joint Compound',   'pail',    'US wall filler standard (no POP tradition in the US).', 4),
  ('US', 'waterproofer',         'us-drylok-extreme',             'Drylok Extreme Waterproofer', 'gallon',  'Masonry waterproofer for damp block/concrete walls.', 5),
  ('US', 'waterproofer-clear',   'us-thompsons-waterseal',        'Thompson''s WaterSeal',        'gallon',  'Clear multi-surface sealer for wood and masonry.', 6),
  ('US', 'mold-treatment',       'us-rmr-86',                     'RMR-86 Pro',                  'gallon',  'Instant mold stain remover before repainting.', 7),
  ('US', 'caulk',                'us-dap-amp-caulk',              'DAP AMP Hybrid Caulk',        'tube',    'Paintable caulk for gaps and cracks.', 8),
  ('US', 'interior-paint',       'us-behr-premium-plus-interior', 'Behr Premium Plus Interior',  'gallon',  'Standard interior emulsion with primer.', 9),
  ('US', 'interior-paint-premium','us-behr-marquee-interior',     'Behr Marquee Interior',       'gallon',  'Premium one-coat interior line.', 10),
  ('US', 'exterior-paint',       'us-behr-premium-plus-exterior', 'Behr Premium Plus Exterior',  'gallon',  'Exterior house paint with primer.', 11),
  ('US', 'primer',              'us-zinsser-bulls-eye-123',      'Zinsser Bulls Eye 1-2-3',      'quart',   'All-surface bonding primer. Priced per QUART — convert per gallon at use.', 12)
ON CONFLICT (market, role) DO UPDATE SET
  material_slug = EXCLUDED.material_slug,
  display_name = EXCLUDED.display_name,
  unit_label = EXCLUDED.unit_label,
  notes = EXCLUDED.notes,
  sort_order = EXCLUDED.sort_order,
  is_active = true,
  updated_at = now();
