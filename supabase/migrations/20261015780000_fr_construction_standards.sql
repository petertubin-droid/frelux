-- =========================================================
-- ENGINE 1 (Estimation & quantities / material standardization)
-- FR (FRANCE) CLOSEOUT — priority 16 of the owner's market
-- rollout order. Strict one-market-at-a-time flow.
--
-- Seeded (web-verified 2026-10-15 via AFNOR/CSTB boutique,
-- Placo.fr (Saint-Gobain), Industries du Plâtre CAPEB guide):
--   * NF DTU 25.41 — Ouvrages en plaques de plâtre (plaques à
--     faces cartonnées); revised February 2022. NF DTU standards
--     have the status of French standards → 'high'.
--   * NF DTU 26.2 — Enduits traditionnels de ciment, chaux et
--     mortier de ciment (traditional rendering/plastering
--     workmanship, part of the DTU 26 plâtrerie series) →
--     'high'.
-- No coverage rates seeded. Idempotent and additive.
-- =========================================================

INSERT INTO construction_standards
  (market_code, domain, ref, title, authority, evidence_type, coverage_spec, applies_to, notes, confidence, verified_date)
VALUES
  ('FR', 'plaster', 'nf-dtu-25-41-ouvrages-plaques-platre',
   'NF DTU 25.41 — Ouvrages en plaques de plâtre (plaques à faces cartonnées)',
   'AFNOR / CSTB (NF DTU series)', 'national_standard',
   'Execution rules for interior works in gypsum plasterboard (plaques de plâtre): partitions, linings and ceilings; revised February 2022',
   '{"engines": ["wall_finishing", "pop_ceiling"], "scope": "plasterboard partitions, linings and ceilings"}',
   'FRANCE plasterboard workmanship: NF DTU 25.41 sets the technical execution rules for interior works in plasterboard with cardboard faces (cloisons, doublages, plafonds) — an NF DTU with the status of a French standard, revised February 2022. Plasterboard products follow EN 520. Verify the current AFNOR edition before compliance claims; application coverage rates per manufacturer datasheets (Placo/Saint-Gobain, Knauf), not this standard.',
   'high', '2026-10-15'),
  ('FR', 'plaster', 'nf-dtu-26-2-enduits-traditionnels',
   'NF DTU 26.2 — Enduits traditionnels de ciment, chaux et mortier de ciment',
   'AFNOR / CSTB (NF DTU series)', 'national_standard',
   'Execution rules for traditional renders and plasters in cement, lime and cement mortar (DTU 26 plâtrerie/enduits series)',
   '{"engines": ["wall_finishing", "screeding"], "scope": "traditional renders and internal plasters"}',
   'FRANCE rendering standard: NF DTU 26.2 governs the execution of traditional renders/plasters (enduits) in cement, lime and cement mortar — the reference for French enduits work alongside NF DTU 25.41 for plasterboard. Gypsum binders/mortars follow EN 998-1/EN 13279 as adopted. Verify the current AFNOR edition before compliance claims; coverage rates per manufacturer datasheets.',
   'high', '2026-10-15')
ON CONFLICT (market_code, domain, ref) DO NOTHING;
