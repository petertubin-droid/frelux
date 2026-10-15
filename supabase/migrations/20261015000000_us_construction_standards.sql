-- =========================================================
-- ENGINE 1 (Estimation & quantities / material standardization)
-- US CLOSEOUT — priority 1 of the owner's market rollout order.
--
-- The US audit (handoff §1B) found: "No national/local code
-- review or source-backed package rules were verified." This
-- migration seeds the US jurisdiction standards registry with
-- real, publicly verifiable national standards only. No invented
-- coverage rates, no adoption claims beyond what is disclosed:
--
--   * IRC/IBC/NEC are MODEL CODES — they are only law where a
--     state/municipality has adopted them, often with local
--     amendments. That caveat is in every row's notes, and the
--     confidence is 'medium' exactly because naming the code
--     is certain but local adoption varies.
--   * ASTM C1396 is the national product specification for
--     gypsum board; naming and scope are certain → 'high'.
--
-- Idempotent and additive: ON CONFLICT DO NOTHING never
-- overwrites admin-edited rows.
-- =========================================================

INSERT INTO construction_standards
  (market_code, domain, ref, title, authority, evidence_type, coverage_spec, applies_to, notes, confidence, verified_date)
VALUES
  ('US', 'building_code', 'icc-irc-2021',
   'International Residential Code (IRC), 2021 edition',
   'International Code Council (ICC)', 'national_standard',
   'Prescriptive construction requirements for one- and two-family dwellings and townhouses: structural, energy, habitability',
   '{"engines": ["build_to_roof", "structural", "wall_finishing"], "scope": "residential"}',
   'US residential construction standard: IRC 2021 is the ICC model code for dwellings and townhouses; most US states adopt it (or a state code based on it) with local amendments. A model code is only law where adopted — verify the state/municipality code edition and local amendments before treating any calculation as code-compliant.',
   'medium', '2026-10-15'),
  ('US', 'building_code', 'icc-ibc-2021',
   'International Building Code (IBC), 2021 edition',
   'International Code Council (ICC)', 'national_standard',
   'Prescriptive requirements for commercial, industrial and multi-family buildings: types of construction, egress, fire safety',
   '{"engines": ["structural", "build_to_roof"], "scope": "commercial"}',
   'US commercial construction standard: IBC 2021 is the ICC model code adopted (usually with amendments) by most US jurisdictions for buildings other than dwellings. Adoption and amendments vary by state, county and city — confirm the governing local edition before compliance claims.',
   'medium', '2026-10-15'),
  ('US', 'electrical', 'nfpa-70-2023',
   'National Electrical Code (NEC), NFPA 70, 2023 edition',
   'National Fire Protection Association (NFPA)', 'national_standard',
   'Electrical installation rules incl. wiring methods (NEC Art. 334 covers NM cable used by the electrical estimator)',
   '{"engines": ["electrical"]}',
   'US electrical standard: NFPA 70 (NEC) 2023 is the model electrical code; adoption varies by state and many jurisdictions still enforce the 2017/2020 editions. The US electrical profile (NM-B cable, 120/240 V split-phase) aligns with NEC practice; local edition and amendments must be confirmed per jurisdiction.',
   'medium', '2026-10-15'),
  ('US', 'gypsum', 'astm-c1396',
   'ASTM C1396/C1396M, Standard Specification for Gypsum Board',
   'ASTM International', 'national_standard',
   'Product specification for gypsum board types, thicknesses and tolerances used in drywall assemblies',
   '{"engines": ["wall_finishing", "screeding"]}',
   'US drywall/skim-coat standard: ASTM C1396 is the national product specification for gypsum board; US wall-finishing practice (drywall + joint compound skim coat, Sheetrock 4.5 gal pail seeded in screeding_system_config) is built on ASTM-specified board. Manufacturer datasheets govern application coverage rates.',
   'high', '2026-10-15')
ON CONFLICT (market_code, domain, ref) DO NOTHING;
