-- =========================================================
-- ENGINE 1 (Estimation & quantities / material standardization)
-- IN (INDIA) CLOSEOUT — priority 14 of the owner's market
-- rollout order. Strict one-market-at-a-time flow.
--
-- Live state verified 2026-10-15: IN profile active/visible
-- (INR), 9 active role mappings, 37 active INR price rows,
-- zero standards rows.
--
-- Seeded (web-verified 2026-10-15 via bis.gov.in, NBC-2026
-- coverage, BIS QCO announcements):
--   * National Building Code of India 2026 (SP 7:2026) — the
--     current edition; BIS has WITHDRAWN NBC 2016, though state
--     building byelaws referencing NBC 2016 remain valid until
--     amended. The NBC is voluntary/non-binding at the national
--     level (Cabinet Secretariat clarification June 2025) and
--     applies through state/UT byelaws → 'medium' with the
--     state-byelaw caveat.
--   * IS 2095-1 Gypsum Plaster Boards, Part 1 (plain gypsum
--     plaster boards) — subject of a mandatory BIS QCO
--     (certification compulsory for sale) → 'high'.
-- No coverage rates seeded. Idempotent and additive.
-- =========================================================

INSERT INTO construction_standards
  (market_code, domain, ref, title, authority, evidence_type, coverage_spec, applies_to, notes, confidence, verified_date)
VALUES
  ('IN', 'building_code', 'nbc-2026-sp7-state-byelaws',
   'National Building Code of India 2026 (SP 7:2026), applied via state/UT building byelaws',
   'Bureau of Indian Standards (BIS)', 'national_standard',
   'Comprehensive building code covering structural, fire safety, health/safety and services provisions; NBC 2016 has been withdrawn and replaced by NBC 2026',
   '{"engines": ["wall_finishing", "screeding", "build_to_roof"], "scope": "residential and commercial"}',
   'INDIA building code: the National Building Code (SP 7:2026) is the current edition — BIS has withdrawn NBC 2016, but state building byelaws referencing NBC 2016 remain valid until the state amends them, and the NBC itself is voluntary/non-binding at the national level. Confirm the applicable state/UT byelaw and the NBC edition it references before compliance claims. Not a product specification — application coverage rates are manufacturer-datasheet territory and are not asserted here.',
   'medium', '2026-10-15'),
  ('IN', 'plaster', 'is-2095-1-gypsum-plaster-boards',
   'IS 2095 (Part 1): Gypsum Plaster Boards — Plain Gypsum Plaster Boards',
   'Bureau of Indian Standards (BIS)', 'national_standard',
   'Specification for plain gypsum plaster boards used for dry lining finishes to masonry walls, ceilings, framed partitions and steel claddings',
   '{"engines": ["wall_finishing", "pop_ceiling"], "scope": "gypsum plasterboard and drywall lining"}',
   'INDIA gypsum standard: IS 2095-1 specifies plain gypsum plaster boards (with IS 2095-2 moisture-resistant and IS 2095-3 reinforced/ceiling-tile parts); a BIS Quality Control Order makes ISI certification for plain gypsum plaster boards mandatory for sale. Verify the current part and edition before compliance claims; application coverage rates per manufacturer datasheets.',
   'high', '2026-10-15')
ON CONFLICT (market_code, domain, ref) DO NOTHING;
