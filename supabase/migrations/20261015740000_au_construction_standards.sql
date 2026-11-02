-- =========================================================
-- ENGINE 1 (Estimation & quantities / material standardization)
-- AU (AUSTRALIA) CLOSEOUT — priority 12 of the owner's market
-- rollout order. Strict one-market-at-a-time flow.
--
-- Live state verified 2026-10-15: AU profile active but hidden
-- from the picker (AUD; visible=false), 5 active role mappings,
-- 33 active AUD price rows, zero standards rows.
--
-- Seeded (web-verified 2026-10-15 via ncc.abcb.gov.au, abcb.gov.au,
-- standards.org.au):
--   * National Construction Code (NCC) — Australia's primary
--     technical design/construction provisions (BCA Volumes).
--     Adoption dates are set by each state and territory
--     (NCC 2022 adopted 1 May 2023, Amdt 1 from 1 May 2025,
--     Amdt 2 from 29 July 2025; NCC 2025 published 1 May 2026
--     with staggered state adoption) → 'medium' with the
--     state/territory adoption caveat.
--   * AS/NZS 2589:2017 Gypsum linings — Application and
--     finishing (Standards Australia) → 'high'.
--   * AS/NZS 2588:1998 Gypsum plasterboard — product
--     specification for gypsum plasterboard sheets → 'high'.
-- No coverage rates seeded. Idempotent and additive.
-- =========================================================

INSERT INTO construction_standards
  (market_code, domain, ref, title, authority, evidence_type, coverage_spec, applies_to, notes, confidence, verified_date)
VALUES
  ('AU', 'building_code', 'ncc-bca-state-adopted',
   'National Construction Code (NCC) incl. Building Code of Australia volumes',
   'Australian Building Codes Board (ABCB)', 'national_standard',
   'Primary technical design and construction provisions for buildings (NCC Volumes One/Two — Building Code of Australia)',
   '{"engines": ["wall_finishing", "screeding", "build_to_roof"], "scope": "residential and commercial"}',
   'AUSTRALIA building code: the NCC (BCA volumes) is the primary technical code, but each state and territory sets its own adoption dates — NCC 2022 was adopted 1 May 2023 with Amendment 1 from 1 May 2025 and Amendment 2 from 29 July 2025; NCC 2025 (published 1 May 2026) is being adopted state-by-state. Confirm the applicable state edition and amendment before compliance claims. Not a product specification — application coverage rates are manufacturer-datasheet territory and are not asserted here.',
   'medium', '2026-10-15'),
  ('AU', 'plaster', 'as-nzs-2589-2017-gypsum-linings',
   'AS/NZS 2589:2017 Gypsum linings — Application and finishing',
   'Standards Australia / Standards New Zealand', 'national_standard',
   'Requirements for the application and finishing of gypsum linings and related design considerations',
   '{"engines": ["wall_finishing", "pop_ceiling"], "scope": "plasterboard application and finishing"}',
   'AUSTRALIA gypsum workmanship standard: AS/NZS 2589:2017 sets out application and finishing requirements for gypsum linings (Joint Technical Committee BD-011, Interior Board Lining). Product specs come from the sheet manufacturer; application coverage rates are manufacturer-datasheet territory and are not asserted here.',
   'high', '2026-10-15'),
  ('AU', 'plaster', 'as-nzs-2588-gypsum-plasterboard',
   'AS/NZS 2588:1998 Gypsum plasterboard',
   'Standards Australia / Standards New Zealand', 'national_standard',
   'Product specification for gypsum plasterboard sheets',
   '{"engines": ["wall_finishing", "pop_ceiling"], "scope": "gypsum plasterboard products"}',
   'AUSTRALIA gypsum product standard: AS/NZS 2588 specifies gypsum plasterboard sheet products used in linings work (companion to AS/NZS 2589). Confirm the current edition before compliance claims; coverage rates per manufacturer datasheets.',
   'high', '2026-10-15')
ON CONFLICT (market_code, domain, ref) DO NOTHING;
