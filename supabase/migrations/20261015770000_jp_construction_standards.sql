-- =========================================================
-- ENGINE 1 (Estimation & quantities / material standardization)
-- JP (JAPAN) CLOSEOUT — priority 15 of the owner's market
-- rollout order. Strict one-market-at-a-time flow.
--
-- Live state verified 2026-10-15: JP profile active/visible
-- (JPY), 8 active role mappings, 32 active JPY price rows,
-- 1 existing standard row (jp-gypsum-box medium, product ref).
--
-- Seeded (web-verified 2026-10-15 via japanese law translation
-- (BSL text), Building Control in Japan (iibh), JSA/JIS
-- previews, Yoshino Gypsum):
--   * Building Standards Act (Building Standard Law, Law No.
--     201 of 1950) — national law; enforced through the
--     building-confirmation and inspection system
--     (MLIT / designated local building officials) → 'medium'
--     with the confirmation-process caveat.
--   * JIS A 6901:2014 Gypsum Boards — the JIS product standard
--     integrating the former 5 gypsum-board specifications,
--     aligned with ISO 6308 → 'high'.
-- No coverage rates seeded. Idempotent and additive.
-- =========================================================

INSERT INTO construction_standards
  (market_code, domain, ref, title, authority, evidence_type, coverage_spec, applies_to, notes, confidence, verified_date)
VALUES
  ('JP', 'building_code', 'building-standards-act-1950',
   'Building Standards Act (Building Standard Law, Law No. 201 of 1950)',
   'Ministry of Land, Infrastructure, Transport and Tourism (MLIT), Japan', 'national_standard',
   'Minimum standards regarding the site, structure, facilities and use of buildings; enforced through the building-confirmation and inspection system',
   '{"engines": ["wall_finishing", "screeding", "build_to_roof"], "scope": "residential and commercial"}',
   'JAPAN building law: the Building Standards Act (建築基準法, Law No. 201 of 1950) sets minimum building standards and is enforced through the building-confirmation (kakunin) and inspection system run by local government building officials. Confirm the building-confirmation requirement and any local ordinance before compliance claims. Not a product specification — application coverage rates are manufacturer-datasheet territory and are not asserted here.',
   'medium', '2026-10-15'),
  ('JP', 'plaster', 'jis-a-6901-2014-gypsum-boards',
   'JIS A 6901:2014 Gypsum Boards',
   'Japanese Standards Association (JSA)', 'national_standard',
   'Specification for gypsum board products (GB) used as base and finishing materials mainly for walls and ceilings',
   '{"engines": ["wall_finishing", "pop_ceiling"], "scope": "gypsum board products and linings"}',
   'JAPAN gypsum standard: JIS A 6901:2014 integrates the former five gypsum-board specifications into one product standard aligned with ISO 6308, covering boards used as base and finishing materials for walls and ceilings. Verify the current JIS edition before compliance claims; application coverage rates per manufacturer datasheets (e.g. Yoshino Gypsum, Chiyoda Ute), not this standard.',
   'high', '2026-10-15')
ON CONFLICT (market_code, domain, ref) DO NOTHING;
