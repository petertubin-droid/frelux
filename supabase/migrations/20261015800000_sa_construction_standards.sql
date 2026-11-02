-- =========================================================
-- ENGINE 1 (Estimation & quantities / material standardization)
-- SA (SAUDI ARABIA) CLOSEOUT — final market of the owner's
-- 15-market rollout order. Strict one-market-at-a-time flow.
--
-- Live state verified 2026-10-15: SA profile active/visible
-- (SAR), 7 active role mappings, 31 active SAR price rows,
-- 1 existing standard row (knauf-mp75-datasheet — untouched).
--
-- Seeded (web-verified 2026-10-15 via sbc.gov.sa, uptocode/ICC
-- references, saso.gov.sa):
--   * Saudi Building Code (SBC) — the mandatory national
--     building code; 2024 edition in force nationwide from
--     30 June 2025 (first major revision since SBC 2018;
--     sections based on international model codes, e.g.
--     SBC 301 structural loads) → 'medium' with the
--     edition/enforcement caveat.
--   * SASO "Standard Specification for Application and
--     Finishing of gypsum board" (official SASO standards
--     library page, 1444H) → 'high'.
-- No coverage rates seeded. Idempotent and additive.
-- =========================================================

INSERT INTO construction_standards
  (market_code, domain, ref, title, authority, evidence_type, coverage_spec, applies_to, notes, confidence, verified_date)
VALUES
  ('SA', 'building_code', 'saudi-building-code-2024',
   'Saudi Building Code (SBC) — 2024 edition',
   'Saudi Building Code (SBC) National Committee', 'national_standard',
   'Mandatory national building code covering structural, fire and safety provisions; 2024 edition in force nationwide from 30 June 2025',
   '{"engines": ["wall_finishing", "screeding", "build_to_roof"], "scope": "residential and commercial"}',
   'SAUDI ARABIA building law: the Saudi Building Code (SBC) is the mandatory national building code — the 2024 edition has been in force nationwide since 30 June 2025, the first major revision since SBC 2018 (e.g. SBC 301 structural loads and forces is based on ASCE standards). Confirm the applicable SBC section and edition before compliance claims. Not a product specification — application coverage rates are manufacturer-datasheet territory and are not asserted here.',
   'medium', '2026-10-15'),
  ('SA', 'plaster', 'saso-gypsum-board-application-finishing',
   'SASO Standard Specification for Application and Finishing of Gypsum Board',
   'Saudi Standards, Metrology and Quality Organization (SASO)', 'national_standard',
   'Minimum requirements for the methods of application and finishing of gypsum board, including related items and accessories',
   '{"engines": ["wall_finishing", "pop_ceiling"], "scope": "gypsum board application and finishing"}',
   'SAUDI ARABIA gypsum workmanship standard: the SASO standard specification for application and finishing of gypsum board (published in the SASO standards library, 1444H) covers minimum application and finishing requirements including accessories. Gypsum board products additionally follow SASO-adopted ISO 6308 / EN 520 based specs. Verify the current SASO edition before compliance claims; application coverage rates per manufacturer datasheets (e.g. Knauf MP75), not this standard.',
   'high', '2026-10-15')
ON CONFLICT (market_code, domain, ref) DO NOTHING;
