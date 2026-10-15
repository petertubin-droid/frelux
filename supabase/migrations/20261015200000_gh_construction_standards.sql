-- =========================================================
-- ENGINE 1 (Estimation & quantities / material standardization)
-- GH (GHANA) CLOSEOUT — priority 8 of the owner's market
-- rollout order. Strict one-market-at-a-time flow.
--
-- Live state verified 2026-10-15: GH profile active/visible
-- (GHS), 8 active role mappings, 33 active GHS price rows, 1
-- low-confidence product ref (gh-putty-25kg). No jurisdiction
-- construction standards existed.
--
-- Seeded (web-verified 2026-10-15):
--   * National Building Regulations, 1996 (L.I. 1630) — Ghana's
--     primary building regulation, enacted by Parliament
--     1996-09-27 (Ministry of Works and Housing). Enforcement
--     sits with Metropolitan/Municipal/District Assemblies
--     (MMDAs) — documented enforcement gaps in KNUST research
--     → 'medium' confidence with the MMDA caveat.
--   * Ghana Standards Authority Act, 2010 (Act 1078) —
--     establishes the GSA, standards development and the GSA
--     certification mark scheme for products (incl. gypsum
--     plaster/POP). Verified via FAOLEX text of the Act →
--     'high'.
-- No GS product-specification numbers are asserted: the GSA
-- catalogue is paywalled and no specific GS gypsum/rendering
-- standard number was verifiable. No coverage rates seeded.
-- Idempotent and additive: ON CONFLICT DO NOTHING.
-- =========================================================

INSERT INTO construction_standards
  (market_code, domain, ref, title, authority, evidence_type, coverage_spec, applies_to, notes, confidence, verified_date)
VALUES
  ('GH', 'building_code', 'national-building-regulations-1996-li-1630',
   'National Building Regulations, 1996 (L.I. 1630)',
   'Ministry of Works and Housing (Ghana)', 'national_standard',
   'Erection, alteration and maintenance of buildings; fire resistance of materials and structural elements',
   '{"engines": ["wall_finishing", "screeding", "build_to_roof"], "scope": "residential and commercial"}',
   'GHANA building regulation: L.I. 1630 (enacted 1996-09-27) is Ghana''s primary building regulation covering building erection, alteration, materials and fire resistance. Enforcement sits with Metropolitan/Municipal/District Assemblies (MMDAs) and is uneven — documented enforcement barriers (KNUST studies) mean compliance is not uniform; confirm the applicable district requirements before compliance claims. It is a legal regulation, not a technical materials specification — no application coverage rates are asserted here.',
   'medium', '2026-10-15'),
  ('GH', 'product_certification', 'gsa-act-1078',
   'Ghana Standards Authority Act, 2010 (Act 1078)',
   'Ghana Standards Authority (GSA)', 'national_standard',
   'Establishes the GSA, development of Ghana Standards, and the GSA certification mark scheme for products',
   '{"engines": ["wall_finishing", "screeding", "pop_ceiling"], "scope": "gypsum plaster / POP and finishing materials"}',
   'GHANA product certification: Act 1078 establishes the GSA and its certification mark scheme; gypsum plaster / plaster-of-paris products sold in Ghana are GSA-certified under licence (GSA certified-product lists). Specific GS specification numbers for gypsum/rendering products are catalogued by the GSA and were not freely verifiable — cite the current GSA catalogue for exact product specs rather than this row.',
   'high', '2026-10-15')
ON CONFLICT (market_code, domain, ref) DO NOTHING;
