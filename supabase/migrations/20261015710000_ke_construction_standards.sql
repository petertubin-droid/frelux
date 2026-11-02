-- =========================================================
-- ENGINE 1 (Estimation & quantities / material standardization)
-- KE (KENYA) CLOSEOUT — priority 9 of the owner's market
-- rollout order. Strict one-market-at-a-time flow.
--
-- Live state verified 2026-10-15: KE profile active/visible
-- (KES), 8 active role mappings, 34 active KES price rows,
-- 2 existing standard refs (ke-putty-25kg low, ke-screed-guide
-- medium — product/guide refs, not jurisdiction standards).
--
-- Seeded (web-verified 2026-10-15):
--   * National Building Code 2024 — published as Legal Notice
--     No. 47 on 2024-03-01, replacing the 1968 Building Code;
--     introduced by the National Construction Authority (NCA).
--     Enforcement flows through Kenya's 47 county governments
--     → 'medium' with the county caveat (mirrors the GB
--     devolution treatment).
--   * KS 2647:2016 Gypsum plasterboard — Specification (KEBS
--     building-standards listing) → 'high'.
--   * KS EAS 18-1 Cement — composition, specifications and
--     conformity criteria (KEBS announcement of construction
--     material standards; East African Standard adoption) →
--     'high' with the EAS-adoption note.
-- No coverage rates seeded. Idempotent and additive.
-- =========================================================

INSERT INTO construction_standards
  (market_code, domain, ref, title, authority, evidence_type, coverage_spec, applies_to, notes, confidence, verified_date)
VALUES
  ('KE', 'building_code', 'national-building-code-2024-ln-47',
   'National Building Code 2024 (Legal Notice No. 47)',
   'National Construction Authority (NCA), Kenya', 'national_standard',
   'Building construction requirements incl. fire resistance, safety provisions and structural performance; replaced the 1968 Building Code',
   '{"engines": ["wall_finishing", "screeding", "build_to_roof"], "scope": "residential and commercial"}',
   'KENYA building code: the National Building Code 2024, published as Legal Notice No. 47 on 2024-03-01, replaced the outdated 1968 Building Code regulations and introduces stricter fire-safety and structural provisions. Enforcement flows through Kenya''s 47 county governments — confirm the applicable county approval requirements before compliance claims. It is a legal code, not a product specification — application coverage rates remain manufacturer-datasheet territory and are not asserted here.',
   'medium', '2026-10-15'),
  ('KE', 'plaster', 'ks-2647-2016-gypsum-plasterboard',
   'KS 2647:2016 Gypsum plasterboard — Specification',
   'Kenya Bureau of Standards (KEBS)', 'national_standard',
   'Specification for gypsum plasterboard products',
   '{"engines": ["wall_finishing", "pop_ceiling"], "scope": "gypsum board materials"}',
   'KENYA gypsum standard: KS 2647:2016 is the KEBS specification for gypsum plasterboard — the product family behind KE ceiling-board and drywall finishing work. Product compliance is KEBS-marked; application rates per manufacturer datasheets, not this standard.',
   'high', '2026-10-15'),
  ('KE', 'concrete_mortar', 'ks-eas-18-1-cement',
   'KS EAS 18-1: Cement — Composition, specifications and conformity criteria',
   'Kenya Bureau of Standards (KEBS)', 'national_standard',
   'Cement composition, specifications and conformity criteria (East African Standard adopted as KS)',
   '{"engines": ["screeding", "block"], "scope": "cement-bound finishing and masonry materials"}',
   'KENYA cement standard: KS EAS 18-1 (KEBS adoption of East African Standard EAS 18-1) specifies cement used in KE screeds, renders and blockwork — announced among KEBS'' construction-material standards. Verify the current KEBS webstore edition before compliance claims; application rates per manufacturer datasheets.',
   'high', '2026-10-15')
ON CONFLICT (market_code, domain, ref) DO NOTHING;
