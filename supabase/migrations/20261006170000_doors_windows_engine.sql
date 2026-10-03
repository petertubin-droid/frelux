-- =========================================================
-- Doors & Windows Engine (Tier 2, Engine 7)
-- =========================================================
-- Deterministic doors/windows MATERIAL estimation:
--  - The user provides door counts per type (flush, panel,
--    security) and window counts per type (aluminium sliding,
--    louvre) — measured on site, never assumed.
--  - Frames follow door counts; hinges and locksets follow
--    visible admin planning rules; every derived count is
--    labelled as an allowance, not a measurement.
--  - NO prices seeded. All pricing via estimation_prices.
--  - Window sizes vary: the admin's unit price must reflect the
--    typical size; the UI tells users to confirm sizes on site.
-- =========================================================

INSERT INTO estimation_materials (name, slug, category, description, is_active, sort_order) VALUES
  ('Flush door (leaf)', 'door-flush', 'doors_windows',
   'Flush door leaves. Priced per leaf; size/finish must match what the admin prices.', true, 1),
  ('Panel door (leaf)', 'door-panel', 'doors_windows',
   'Panel door leaves. Priced per leaf; size/finish must match what the admin prices.', true, 2),
  ('Security door (leaf)', 'door-security', 'doors_windows',
   'Steel security door leaves. Priced per leaf; size/finish must match what the admin prices.', true, 3),
  ('Door frame (set)', 'door-frame', 'doors_windows',
   'Door frame sets. Priced per set.', true, 4),
  ('Door hinge', 'door-hinge', 'doors_windows',
   'Door hinges. Priced per piece.', true, 5),
  ('Door lockset', 'door-lockset', 'doors_windows',
   'Lock/handle sets. Priced per set.', true, 6),
  ('Aluminium sliding window (unit)', 'window-aluminium', 'doors_windows',
   'Aluminium sliding window units. Priced per unit — the admin price must reflect the typical sized unit; confirm sizes on site.', true, 7),
  ('Louvre window (unit)', 'window-louver', 'doors_windows',
   'Louvre window units. Priced per unit — the admin price must reflect the typical sized unit; confirm sizes on site.', true, 8)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO estimation_calc_rules (rule_key, calculator_type, rule_value, rule_status, description, is_active) VALUES
  ('hinges_per_door', 'doors_windows',
   '{"value": 3}'::jsonb, 'configurable_default',
   'PLANNING ALLOWANCE: hinges per door leaf. A visible estimate — doors with heavy use may need more; deactivate to require a site count.', true);
