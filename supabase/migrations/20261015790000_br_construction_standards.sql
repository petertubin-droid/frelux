-- =========================================================
-- ENGINE 1 (Estimation & quantities / material standardization)
-- BR (BRAZIL) CLOSEOUT — priority 17 of the owner's market
-- rollout order. Strict one-market-at-a-time flow.
--
-- Live state verified 2026-10-15: BR profile active/visible
-- (BRL), 9 active role mappings, 35 active BRL price rows,
-- 3 existing standard rows (suvinil-massa-corrida-ficha,
-- suvinil-lata-2coats, argalit-acii — untouched).
--
-- Seeded (web-verified 2026-10-15 via normas.com.br, Knauf
-- BR, ABNT/Sienge/CBIC NBR references):
--   * ABNT NBR 14715-1:2021 — Chapas de gesso para drywall,
--     Parte 1: Requisitos (drywall gypsum board requirements;
--     replaced NBR 14715:2001) → 'high'.
--   * ABNT NBR 15575 — Edificações habitacionais — Desempenho
--     (building performance standard; Part 1 general
--     requirements, 15575-1:2024 current) → 'medium' with the
--     voluntary/municipal-adoption caveat.
-- No coverage rates seeded. Idempotent and additive.
-- =========================================================

INSERT INTO construction_standards
  (market_code, domain, ref, title, authority, evidence_type, coverage_spec, applies_to, notes, confidence, verified_date)
VALUES
  ('BR', 'plaster', 'abnt-nbr-14715-1-2021-chapas-gesso-drywall',
   'ABNT NBR 14715-1:2021 — Chapas de gesso para drywall, Parte 1: Requisitos',
   'ABNT (Associação Brasileira de Normas Técnicas)', 'national_standard',
   'Requirements for drywall gypsum boards (chapas de gesso acartonado) used in walls, ceilings and linings; Part 2 covers test methods',
   '{"engines": ["wall_finishing", "pop_ceiling"], "scope": "drywall gypsum board products"}',
   'BRAZIL drywall standard: ABNT NBR 14715-1:2021 establishes the requirements for drywall gypsum boards (replacing NBR 14715:2001), with NBR 14715-2:2021 covering the test methods. Boards must carry the ABNT conformity criteria for sale as drywall chapas. Verify the current ABNT edition before compliance claims; application coverage rates per manufacturer datasheets (Knauf, Placo/Votorantim), not this standard.',
   'high', '2026-10-15'),
  ('BR', 'building_code', 'abnt-nbr-15575-desempenho',
   'ABNT NBR 15575 — Edificações habitacionais — Desempenho (building performance standard)',
   'ABNT (Associação Brasileira de Normas Técnicas)', 'national_standard',
   'Performance requirements and criteria for housing buildings as an integrated whole (structure, floors, walls, coverings); NBR 15575-1 general requirements, 15575-1:2024 current',
   '{"engines": ["wall_finishing", "screeding", "build_to_roof"], "scope": "residential performance including internal wall systems"}',
   'BRAZIL performance standard: ABNT NBR 15575 (Edificações Habitacionais — Desempenho, in force since July 2013, Part 1 revised 2024) sets performance requirements for housing buildings, including internal/external vertical wall systems. It is an ABNT norm applied through municipal building codes and financing programs (Caixa) rather than a single federal act — confirm the applicable municipal code (e.g. Código de Obras) before compliance claims. Not a product specification — coverage rates are manufacturer-datasheet territory and are not asserted here.',
   'medium', '2026-10-15')
ON CONFLICT (market_code, domain, ref) DO NOTHING;
