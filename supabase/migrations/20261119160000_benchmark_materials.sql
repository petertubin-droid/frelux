-- Generic benchmark materials the retailer feeds can actually answer.
--
-- The price scan matches a shop's own product line against a material in the
-- book. It found almost nothing because book materials are brand plus
-- specification SKUs ("CEMEX Cemento Extra Gris 25 kg") while a shop lists
-- "Cemento Impercem 25 kg". A benchmark is the generic product both sides mean:
-- a 50 kg cement bag, a 20 L can of emulsion, a 50 mm EPS board.
--
-- Benchmarks carry no price on purpose. The scan captures the first real price
-- from a retailer feed and files it against the benchmark for that market, so
-- the number always has a source page behind it. A benchmark is a discovery
-- target, not a rate anybody quotes.
--
-- Rollback: rollback/20261119160000_benchmark_materials_rollback.sql

INSERT INTO public.estimation_materials
  (name, slug, category, description, notes, effective_date, is_active, sort_order, last_updated_via)
VALUES
  ('Cement 50 kg', 'bench-cement-50kg', 'cement',
   'General purpose Portland cement in a 50 kg bag.',
   'Benchmark material for price discovery. No price is seeded; the scan files the first retailer price it can match.', '2026-11-19', true, 300, 'manual'),
  ('Building sand 1 tonne', 'bench-sand-tonne', 'aggregate',
   'Washed building sand supplied in a one tonne bulk bag.',
   'Benchmark material for price discovery. No price is seeded.', '2026-11-19', true, 301, 'manual'),
  ('EPS board 50 mm', 'bench-eps-board-50mm', 'insulation',
   'Expanded polystyrene insulation board, 50 mm thick, sold by the square metre or per sheet.',
   'Benchmark material for price discovery. No price is seeded.', '2026-11-19', true, 302, 'manual'),
  ('Emulsion paint 20 L', 'bench-emulsion-20l', 'paint',
   'Water-based interior emulsion paint in a 20 L can.',
   'Benchmark material for price discovery. No price is seeded.', '2026-11-19', true, 303, 'manual'),
  ('Rebar 12 mm x 6 m', 'bench-rebar-12mm-6m', 'rebar',
   'Deformed reinforcement bar, 12 mm diameter, 6 m length.',
   'Benchmark material for price discovery. No price is seeded.', '2026-11-19', true, 304, 'manual'),
  ('Ready mixed concrete', 'bench-ready-mix-concrete', 'concrete',
   'Ready mixed concrete delivered by the cubic metre.',
   'Benchmark material for price discovery. No price is seeded.', '2026-11-19', true, 305, 'manual'),
  ('ICF block', 'bench-icf-block', 'formwork',
   'Insulated concrete form block, standard face, sold by the square metre of wall face.',
   'Benchmark material for price discovery. No price is seeded.', '2026-11-19', true, 306, 'manual'),
  ('Adhesive 25 kg', 'bench-adhesive-25kg', 'adhesive',
   'Cementitious tile and insulation board adhesive in a 25 kg bag.',
   'Benchmark material for price discovery. No price is seeded.', '2026-11-19', true, 307, 'manual'),
  ('Basecoat 25 kg', 'bench-eifs-basecoat-25kg', 'plaster',
   'Polymer modified cementitious base coat for bedding reinforcing mesh, 25 kg bag.',
   'Benchmark material for price discovery. No price is seeded.', '2026-11-19', true, 308, 'manual'),
  ('Fibreglass mesh 1 m x 50 m', 'bench-eifs-mesh-50m', 'insulation',
   'Alkali resistant reinforcing mesh for render and EIFS base coat, one metre by fifty metre roll.',
   'Benchmark material for price discovery. No price is seeded.', '2026-11-19', true, 309, 'manual'),
  ('Texture finish 25 kg', 'bench-eifs-finish-25kg', 'plaster',
   'Acrylic textured coating for the finished surface of a thin coat render or EIFS system, 25 kg.',
   'Benchmark material for price discovery. No price is seeded.', '2026-11-19', true, 310, 'manual'),
  ('Primer 20 kg', 'bench-eifs-primer-20kg', 'primer',
   'Acrylic primer applied under the textured finish of a thin coat render or EIFS system, 20 kg.',
   'Benchmark material for price discovery. No price is seeded.', '2026-11-19', true, 311, 'manual')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  notes = EXCLUDED.notes,
  is_active = true,
  updated_at = now();
