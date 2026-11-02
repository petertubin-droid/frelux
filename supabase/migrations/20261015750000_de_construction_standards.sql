-- =========================================================
-- ENGINE 1 (Estimation & quantities / material standardization)
-- DE (GERMANY) CLOSEOUT — priority 13 of the owner's market
-- rollout order. Strict one-market-at-a-time flow.
--
-- Live state verified 2026-10-15: DE profile active/visible
-- (EUR), 8 active role mappings, 36 active EUR price rows,
-- 1 existing standard row (din-en-1451, drainage product ref).
--
-- Seeded (web-verified 2026-10-15 via DIBt, dinmedia.de,
-- Niedax/DIBt regulatory-system descriptions):
--   * Musterbauordnung (MBO, Model Building Code) — a model
--     framework issued by the Conference of Building Ministers
--     (ARBAU); legally binding law only via the 16 state
--     Landesbauordnungen (LBO) → 'medium' with the Länder
--     adoption caveat (mirrors the GB devolution treatment).
--   * DIN EN 13914-1:2016 (external rendering) with the German
--     supplementary provisions DIN 18550-2:2015-06 (internal
--     plastering) / DIN 18550-1 (external rendering) → 'high'.
-- No coverage rates seeded. Idempotent and additive.
-- =========================================================

INSERT INTO construction_standards
  (market_code, domain, ref, title, authority, evidence_type, coverage_spec, applies_to, notes, confidence, verified_date)
VALUES
  ('DE', 'building_code', 'mbo-lbo-model-building-code',
   'Musterbauordnung (MBO, Model Building Code) as implemented by the 16 Landesbauordnungen (LBO)',
   'Conference of Building Ministers (ARBAU) / federal states (Länder)', 'national_standard',
   'Model building code framework covering structural, fire and health/safety requirements; binding law comes from each Land''s LBO',
   '{"engines": ["wall_finishing", "screeding", "build_to_roof"], "scope": "residential and commercial"}',
   'GERMANY building law: the Musterbauordnung (MBO) is a model code from the Conference of Building Ministers; it is not itself federal law — the 16 federal states each enact their own Landesbauordnung (LBO) based on it. Confirm the applicable Land''s LBO edition before compliance claims. Construction products are additionally governed by the EU Construction Products Regulation (BauPVO). Not a product specification — application coverage rates are manufacturer-datasheet territory and are not asserted here.',
   'medium', '2026-10-15'),
  ('DE', 'plaster', 'din-en-13914-1-din-18550',
   'DIN EN 13914-1:2016 (external rendering) with DIN 18550-1/-2 German supplementary provisions',
   'DIN (Deutsches Institut für Normung)', 'national_standard',
   'Design, preparation and application of external rendering and internal plastering; DIN 18550-2 adds German supplementary provisions for internal plastering',
   '{"engines": ["wall_finishing", "screeding"], "scope": "renders, plasters and internal finishes"}',
   'GERMANY plastering standards: DIN EN 13914-1:2016 (European external-rendering standard, German version) is applied together with DIN 18550-2:2015-06 — design, preparation and application of external rendering and internal plastering, Part 2 (supplementary provisions for internal plastering per DIN EN 13914-2). Rendering mortars are specified per DIN EN 998-1. Verify current DIN editions before compliance claims; application coverage rates per manufacturer datasheets (Merkblätter), not this standard.',
   'high', '2026-10-15')
ON CONFLICT (market_code, domain, ref) DO NOTHING;
