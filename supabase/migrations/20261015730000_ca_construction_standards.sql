-- =========================================================
-- ENGINE 1 (Estimation & quantities / material standardization)
-- CA (CANADA) CLOSEOUT — priority 11 of the owner's market
-- rollout order. Strict one-market-at-a-time flow.
--
-- Live state verified 2026-10-15: CA profile active but hidden
-- from the picker (CAD; visible=false, consistent with the
-- audit's availability decision), 8 active role mappings,
-- 32 active CAD price rows, zero standards rows.
--
-- Seeded (web-verified 2026-10-15 via NRC/publications.gc.ca,
-- CSA Group store, SCC standards db, BC Building Code Part 5):
--   * National Building Code of Canada 2020 — a MODEL code by
--     the National Research Council; it has no legal status
--     until adopted (with or without modification) by each
--     province/territory → 'medium' with the provincial
--     adoption caveat (mirrors the GB devolution treatment).
--   * CAN/CSA-A82.31-M91 Gypsum Board Application — minimum
--     requirements for application and finishing of gypsum
--     board in wall/ceiling construction (CSA) → 'high'.
--   * CSA A82.30-M Interior Furring, Lathing and Gypsum
--     Plastering — referenced by the BC Building Code Part 5
--     standards list → 'high'.
-- No coverage rates seeded. Idempotent and additive.
-- =========================================================

INSERT INTO construction_standards
  (market_code, domain, ref, title, authority, evidence_type, coverage_spec, applies_to, notes, confidence, verified_date)
VALUES
  ('CA', 'building_code', 'nbc-2020-model-code',
   'National Building Code of Canada, 2020 (model code)',
   'National Research Council of Canada (NRC)', 'national_standard',
   'Model building code covering structural, fire and health/safety provisions for buildings',
   '{"engines": ["wall_finishing", "screeding", "build_to_roof"], "scope": "residential and commercial"}',
   'CANADA model code: the NBC 2020 is published by the NRC as a MODEL code with no legal status until adopted — with or without modifications — by the individual province or territory (e.g. the Ontario Building Code, the BC Building Code, the Quebec Construction Code). Confirm the applicable provincial code edition before compliance claims. Not a product specification — application coverage rates are manufacturer-datasheet territory and are not asserted here.',
   'medium', '2026-10-15'),
  ('CA', 'plaster', 'can-csa-a82-31-gypsum-board-application',
   'CAN/CSA-A82.31-M91: Gypsum Board Application',
   'CSA Group', 'national_standard',
   'Minimum requirements for the application and finishing of gypsum board used in wall and ceiling construction',
   '{"engines": ["wall_finishing", "pop_ceiling"], "scope": "drywall application and finishing"}',
   'CANADA gypsum workmanship standard: CAN/CSA-A82.31-M91 specifies minimum requirements for gypsum board application and finishing in wall and ceiling construction (companion to ASTM C840 practice). Product specs come from the board manufacturer; application coverage rates are manufacturer-datasheet territory and are not asserted here.',
   'high', '2026-10-15'),
  ('CA', 'plaster', 'csa-a82-30-lathing-plastering',
   'CSA A82.30-M: Interior Furring, Lathing and Gypsum Plastering',
   'CSA Group', 'national_standard',
   'Requirements for interior furring, lathing and gypsum plastering work',
   '{"engines": ["wall_finishing", "screeding"], "scope": "plaster application systems"}',
   'CANADA plastering standard: CSA A82.30-M governs interior furring, lathing and gypsum plastering — referenced in the BC Building Code Part 5 compliance standards list and companion to A82.31. Confirm the current CSA edition before compliance claims; coverage rates per manufacturer datasheets.',
   'high', '2026-10-15')
ON CONFLICT (market_code, domain, ref) DO NOTHING;
