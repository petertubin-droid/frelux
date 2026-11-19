-- AU: map the three roles whose prices are queued for discovery.
--
-- 20261119170000 registered au-eifs-adhesive, au-eifs-finish and au-eifs-primer
-- as search sources, but left them unmapped, so an approved scan candidate would
-- have written a price the engine could never reach. Mapping them now closes
-- that loop: system-boq-pricing puts a mapped role with no price into
-- unpricedRoles and skips the line, so the BOQ keeps saying "unpriced" today and
-- starts pricing the day an admin approves a candidate.
--
-- au-icf-form-block and au-icf-concrete stay unmapped on purpose: no Australian
-- retail listing exists for either, so there is no source to discover them from
-- and no honest figure to seed.
--
-- Rollback: rollback/20261119190000_au_queued_role_mappings_rollback.sql

INSERT INTO public.market_material_roles
  (market, role, material_slug, display_name, unit_label, notes, is_active, sort_order)
VALUES
  ('AU', 'eifs-adhesive', 'au-eifs-adhesive', 'EIFS adhesive', 'kg',
   'Mapped ahead of its price: registered as a Bunnings search source on 2026-11-19, so the scanner stages candidates and this role prices once one is approved.',
   true, 230),
  ('AU', 'eifs-finish', 'au-eifs-finish', 'EIFS finish coat', 'kg',
   'Mapped ahead of its price: registered as a Bunnings search source on 2026-11-19, so the scanner stages candidates and this role prices once one is approved.',
   true, 231),
  ('AU', 'eifs-primer', 'au-eifs-primer', 'EIFS primer', 'kg',
   'Mapped ahead of its price: registered as a Bunnings search source on 2026-11-19, so the scanner stages candidates and this role prices once one is approved.',
   true, 232)
ON CONFLICT (market, role) DO UPDATE SET
  material_slug = EXCLUDED.material_slug,
  display_name = EXCLUDED.display_name,
  unit_label = EXCLUDED.unit_label,
  notes = EXCLUDED.notes,
  is_active = true,
  updated_at = now();
