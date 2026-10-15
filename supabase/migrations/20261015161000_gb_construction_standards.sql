-- =========================================================
-- ENGINE 1 (Estimation & quantities / material standardization)
-- GB CLOSEOUT — priority 2 of the owner's market rollout order.
--
-- GB had only one standards row (BS EN 1401-1 drainage pipe,
-- seeded 2026-10-14). This migration seeds the wall-finishing /
-- plastering / building-code standards the GB calculators rest
-- on:
--   * UK Building Regulations are devolved: the Approved
--     Document cited here is the ENGLAND version; Wales,
--     Scotland and Northern Ireland maintain their own
--     equivalents → 'medium' with the devolution caveat.
--   * BS / BS EN product and workmanship standards are national
--     standards with certain naming → 'high'.
-- No coverage rates are seeded (manufacturer datasheets govern
-- application coverage; none were verifiable here).
-- Idempotent and additive: ON CONFLICT DO NOTHING.
-- =========================================================

INSERT INTO construction_standards
  (market_code, domain, ref, title, authority, evidence_type, coverage_spec, applies_to, notes, confidence, verified_date)
VALUES
  ('GB', 'building_code', 'building-regs-2010-ad-a',
   'Building Regulations 2010 (England) — Approved Document A: Structure',
   'MHCLG (UK Ministry of Housing, Communities and Local Government)', 'national_standard',
   'Structural requirements for buildings: loading, ground movement, demolition',
   '{"engines": ["structural", "build_to_roof"], "scope": "residential and commercial"}',
   'UK structural standard: Approved Document A gives practical guidance on the structural Requirements of the Building Regulations 2010 for ENGLAND. Building regulations are devolved: Wales, Scotland and Northern Ireland maintain their own equivalents — confirm the applicable national document before compliance claims.',
   'medium', '2026-10-15'),
  ('GB', 'rendering', 'bs-en-13914-1',
   'BS EN 13914-1: Design and preparation of external rendering',
   'BSI (British Standards Institution)', 'national_standard',
   'Design principles and preparation of external cement-based rendering incl. substrate suitability and build-up',
   '{"engines": ["wall_finishing", "screeding"]}',
   'UK external render standard: BS EN 13914-1 governs design and preparation of external rendering — the basis of GB exterior render-and-paint assemblies. Product coverage rates remain manufacturer-datasheet territory and are not asserted here.',
   'high', '2026-10-15'),
  ('GB', 'rendering', 'bs-en-998-1',
   'BS EN 998-1: Specification for rendering mortars',
   'BSI (British Standards Institution)', 'national_standard',
   'Product specification for factory-made rendering mortars (compressive strength categories)',
   '{"engines": ["wall_finishing", "screeding"]}',
   'UK render mortar product standard: BS EN 998-1 specifies factory-made rendering mortars used in GB wall-finishing assemblies; category selection drives performance, application rates per manufacturer datasheet.',
   'high', '2026-10-15'),
  ('GB', 'plaster', 'bs-en-13279',
   'BS EN 13279: Gypsum binders and gypsum plasters',
   'BSI (British Standards Institution)', 'national_standard',
   'Product specification for gypsum binders and gypsum plasters (skim coats, undercoat plasters)',
   '{"engines": ["wall_finishing", "screeding"]}',
   'UK gypsum plaster standard: BS EN 13279 governs gypsum binders and plasters — the product family of GB skim-coat finishing (e.g. Thistle-type multifinish). Application coverage rates come from manufacturer datasheets, not this standard.',
   'high', '2026-10-15'),
  ('GB', 'workmanship', 'bs-8000-10',
   'BS 8000-10: Workmanship on building sites — plastering and rendering',
   'BSI (British Standards Institution)', 'national_standard',
   'Code of practice for workmanship in plastering and rendering',
   '{"engines": ["wall_finishing", "screeding"]}',
   'UK workmanship standard: BS 8000-10 is the code of practice for plastering/rendering workmanship on building sites — the accepted reference for GB finish quality expectations.',
   'high', '2026-10-15')
ON CONFLICT (market_code, domain, ref) DO NOTHING;
