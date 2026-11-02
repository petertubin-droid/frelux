-- =========================================================
-- Granular waterproofing roles for the waterproofing engine.
-- The engine prices five distinct materials (DPC strip, DPM
-- sheet, cementitious coating, bituminous membrane roll,
-- waterproofing tape); each now resolves by role per market.
-- NG maps to its own catalog; the US maps cementitious coating
-- to Drylok Extreme (masonry waterproofer, priced) — other roles
-- stay unmapped in the US until verified products are added
-- (the resolver returns null, never a guess).
-- =========================================================
INSERT INTO market_material_roles (market, role, material_slug, display_name, unit_label, notes, sort_order) VALUES
  ('NG', 'dpc',                  'dpc-per-meter',                    'DPC Strip',              'meter',  'Damp-proof course strip per meter.', 21),
  ('NG', 'dpm',                  'dpm-per-m2',                       'DPM Sheet',              'm2',     'Damp-proof membrane per square meter.', 22),
  ('NG', 'cementitious-coating', 'waterproofing-cementitious-coating','Cementitious Coating',    'unit',   'Cementitious waterproof coating.', 23),
  ('NG', 'bituminous-membrane',  'bituminous-membrane-roll',         'Bituminous Membrane',    'roll',   'Torched bituminous membrane roll.', 24),
  ('NG', 'waterproofing-tape',  'waterproofing-tape',               'Waterproofing Tape',     'roll',   'Sealing tape for joints and corners.', 25),
  ('US', 'cementitious-coating', 'us-drylok-extreme',                'Drylok Extreme Waterproofer', 'gallon', 'US masonry waterproofer (cementitious equivalent) for damp block/concrete walls.', 23)
ON CONFLICT (market, role) DO UPDATE SET
  material_slug = EXCLUDED.material_slug,
  display_name = EXCLUDED.display_name,
  unit_label = EXCLUDED.unit_label,
  notes = EXCLUDED.notes,
  sort_order = EXCLUDED.sort_order,
  is_active = true,
  updated_at = now();
