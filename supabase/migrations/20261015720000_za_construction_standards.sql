-- =========================================================
-- ENGINE 1 (Estimation & quantities / material standardization)
-- ZA (SOUTH AFRICA) CLOSEOUT — priority 10 of the owner's
-- market rollout order. Strict one-market-at-a-time flow.
--
-- Live state verified 2026-10-15: ZA profile active/visible
-- (ZAR), 10 active role mappings, 36 active ZAR price rows,
-- 3 existing standard rows (Gyproc RhinoLite + screed
-- datasheets — product refs, not jurisdiction standards).
--
-- Seeded (web-verified 2026-10-15 via gov.za, sans10400.co.za,
-- publicworks.gov.za PW 371-A, Airports Co ZA specs):
--   * National Building Regulations and Building Standards
--     Act 103 of 1977 (as amended) + SANS 10400 parts (the
--     application of the NBR). Approval/enforcement sits with
--     local authorities → 'medium' with the municipal caveat.
--   * SANS 2001-CC1:2012 Concrete works (structural) and
--     SANS 2001-CC2:2007 Concrete works (minor) — the SANS
--     2001 construction-works specification family → 'high'.
--   * SANS 10109-1 (concrete floors: bases) and SANS 10109-2
--     (finishes to concrete floors) — invoked by SANS 10400
--     and PW 371-A → 'high'; governs ZA floor-screed finishes.
-- No coverage rates seeded. Idempotent and additive.
-- =========================================================

INSERT INTO construction_standards
  (market_code, domain, ref, title, authority, evidence_type, coverage_spec, applies_to, notes, confidence, verified_date)
VALUES
  ('ZA', 'building_code', 'nbrbs-act-103-1977-sans-10400',
   'National Building Regulations and Building Standards Act 103 of 1977 + SANS 10400 (application of the NBR)',
   'South African national government / SABS Standards Division', 'national_standard',
   'Erection, alteration and demolition of buildings; SANS 10400 parts give deemed-to-satisfy rules for applying the National Building Regulations',
   '{"engines": ["wall_finishing", "screeding", "build_to_roof"], "scope": "residential and commercial"}',
   'SOUTH AFRICA building law: Act 103 of 1977 (as amended) governs all building work; the SANS 10400 series is the code of practice applying the National Building Regulations, with parts amended separately — confirm the current edition of each part before compliance claims. Plan approval and enforcement sit with local authorities (municipalities). Not a product specification: application coverage rates are manufacturer-datasheet territory and are not asserted here.',
   'medium', '2026-10-15'),
  ('ZA', 'concrete_mortar', 'sans-2001-cc-concrete-works',
   'SANS 2001-CC1:2012 Concrete works (structural) and SANS 2001-CC2:2007 Concrete works (minor)',
   'SABS Standards Division', 'national_standard',
   'Standard of materials and workmanship for structural and minor concrete works (the SANS 2001 construction-works specification family)',
   '{"engines": ["screeding", "block", "structural"], "scope": "concrete and screed work"}',
   'SOUTH AFRICA concrete workmanship: SANS 2001-CC1 (structural) and SANS 2001-CC2 (minor) specify materials and workmanship for concrete works — the specification family cited in SA public-works and tender documents (PW 371-A). Mixes and application rates per project specification and manufacturer datasheets, not these standards.',
   'high', '2026-10-15'),
  ('ZA', 'floor_finishes', 'sans-10109-concrete-floors',
   'SANS 10109-1: Concrete floors (bases) and SANS 10109-2: Finishes to concrete floors',
   'SABS Standards Division', 'national_standard',
   'General principles for concrete floor bases (part 1) and commonly used floor finishes including screeds (part 2)',
   '{"engines": ["screeding", "flooring"], "scope": "floor screeds and finishes"}',
   'SOUTH AFRICA floor standard: SANS 10109-1 (bases) and SANS 10109-2 (finishes to concrete floors) govern floor-screed design and finish quality — invoked by SANS 10400 and PW 371-A. Application coverage rates remain manufacturer-datasheet territory (see the Gyproc RhinoLite datasheet rows already in this registry) and are not asserted here.',
   'high', '2026-10-15')
ON CONFLICT (market_code, domain, ref) DO NOTHING;
