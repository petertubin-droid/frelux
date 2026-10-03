-- =========================================================
-- Price Tracker: shared material records for the reference catalog
-- =========================================================
-- The price tracker (Admin → Price Updater) manages CONFIGURED
-- reference prices for Nigerian construction materials and
-- applies them to the shared estimation_prices table, where every
-- FRELUX engine prices from.
--
-- These rows create one shared material record per catalog entry
-- so the tracker (and the Tier 2 foundation/steel engines that
-- consume cement, sand, granite, rebar) resolve one stable slug.
-- NO prices are seeded here — the tracker's catalog values are
-- REFERENCE data the admin verifies before applying.
-- =========================================================

INSERT INTO estimation_materials (name, slug, category, description, is_active, sort_order) VALUES
  ('Cement (50 kg bag)', 'cement-per-bag', 'cement',
   'Ordinary Portland cement, 50 kg bag. Priced per bag via the price tracker.', true, 1),
  ('Block (9-inch)', 'block-per-piece', 'masonry',
   '9-inch sandcrete block. Priced per piece via the price tracker.', true, 2),
  ('Sharp Sand', 'sand-per-m3', 'aggregate',
   'Sharp sand measured per cubic metre. Priced via the price tracker.', true, 3),
  ('Sharp Sand (5-tonne tipper)', 'sand-per-trip', 'aggregate',
   'Sharp sand delivered per 5-tonne tipper trip. Priced via the price tracker.', true, 4),
  ('Granite (3/4 inch)', 'granite-per-m3', 'aggregate',
   'Granite chippings measured per cubic metre. Priced via the price tracker.', true, 5),
  ('Granite (5-tonne tipper)', 'granite-per-trip', 'aggregate',
   'Granite delivered per 5-tonne tipper trip. Priced via the price tracker.', true, 6),
  ('Hardcore / Laterite', 'hardcore-per-m3', 'aggregate',
   'Hardcore / laterite fill measured per cubic metre. Priced via the price tracker.', true, 7),
  ('Reinforcement (bulk, per tonne)', 'reinforcement-per-tonne', 'steel',
   'Reinforcement steel priced per tonne via the price tracker.', true, 8),
  ('12mm Rebar (12 m length)', 'rebar-12mm-per-length', 'steel',
   'High-yield 12 mm reinforcement bar, 12 m length. Priced via the price tracker.', true, 9),
  ('16mm Rebar (12 m length)', 'rebar-16mm-per-length', 'steel',
   'High-yield 16 mm reinforcement bar, 12 m length. Priced via the price tracker.', true, 10),
  ('20mm Rebar (12 m length)', 'rebar-20mm-per-length', 'steel',
   'High-yield 20 mm reinforcement bar, 12 m length. Priced via the price tracker.', true, 11),
  ('25mm Rebar (12 m length)', 'rebar-25mm-per-length', 'steel',
   'High-yield 25 mm reinforcement bar, 12 m length. Priced via the price tracker.', true, 12),
  ('Binding Wire', 'binding-wire-per-kg', 'steel',
   'Binding wire for reinforcement, per kg. Priced via the price tracker.', true, 13),
  ('Timber (2 x 4)', 'timber-per-m', 'timber',
   'Timber 2 x 4, per linear metre. Priced via the price tracker.', true, 14),
  ('Roofing Sheet', 'roofing-sheet-per-piece', 'roofing',
   'Roofing sheet, per piece. Priced via the price tracker.', true, 15),
  ('Ridge Cap', 'ridge-cap-per-meter', 'roofing',
   'Ridge cap, per linear metre. Priced via the price tracker.', true, 16),
  ('Roofing Screw', 'roofing-screws-per-piece', 'roofing',
   'Roofing screw with washer, per piece. Priced via the price tracker.', true, 17),
  ('Fascia Board', 'fascia-per-meter', 'roofing',
   'Fascia board, per linear metre. Priced via the price tracker.', true, 18),
  ('DPC Roll', 'dpc-per-meter', 'waterproofing',
   'Damp-proof course roll, per linear metre. Priced via the price tracker.', true, 19),
  ('DPM Membrane', 'dpm-per-m2', 'waterproofing',
   'Damp-proof membrane, per m². Priced via the price tracker.', true, 20),
  ('Formwork (plywood + nails)', 'formwork-per-m2', 'formwork',
   'Formwork cost basis (plywood + nails), per m². Priced via the price tracker.', true, 21)
ON CONFLICT (slug) DO NOTHING;
