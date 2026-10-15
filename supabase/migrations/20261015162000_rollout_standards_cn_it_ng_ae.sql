-- =========================================================
-- ENGINE 1 (Estimation & quantities / material standardization)
-- ROLLOUT CLOSEOUTS: CN (p3), IT (p4), NG (p5), AE (p7)
-- Owner rollout order, one market at a time. Live registry and
-- price book were read 2026-10-15 before writing anything:
--   CN: active market, 24 CNY prices (plumbing/electrical/doors)
--       but ZERO wall-finishing materials/prices → standards are
--       seeded; finishing prices stay an honest BLOCKER (never
--       invented), so CN priced-finishing stays visibly partial.
--   IT: active market, 34 EUR prices INCLUDING real finishing
--       materials (paint, exterior quartz paint, acrylic primer,
--       stucco, sand, cement, waterproofer) → standards seeded
--       AND role mappings wired so the finishing engine can
--       actually resolve priced IT materials.
--   NG: active default market, 16 roles + 49 NGN prices → only
--       its jurisdiction standards were missing. Seeded.
--   AE: active market (hidden from picker), 7 roles + 32 AED
--       prices, 1 standard (Knauf MP75 datasheet) → emirate code
--       rows added.
--
-- Standards honesty: real, publicly named standards only.
--   * 'medium' = code/model-code where adoption/enforcement
--     varies (China enforcement practice, Italian seismic zones,
--     Nigerian state-level enforcement, UAE emirate-level).
--   * 'high' = national product standards with certain naming.
-- No coverage rates are seeded here.
-- Role mappings: derived 1:1 from materials the IT price book
-- already carries (slug + EUR price verified live). Existence-
-- guarded, idempotent, additive only.
-- =========================================================

INSERT INTO construction_standards
  (market_code, domain, ref, title, authority, evidence_type, coverage_spec, applies_to, notes, confidence, verified_date)
VALUES
  -- CN: national structural + decoration-acceptance codes, gypsum product standard
  ('CN', 'building_code', 'gb-50009',
   'GB 50009: Load code for the design of building structures',
   'MOHURD (Ministry of Housing and Urban-Rural Development, PRC)', 'national_standard',
   'Structural loading basis for building design (dead, live, wind, snow loads)',
   '{"engines": ["structural", "build_to_roof"], "scope": "national"}',
   'China structural loading standard: GB 50009 is the PRC national load code referenced by structural design. A national code is centrally published, but local implementation review and seismic detail requirements vary by province and city — confirm with the local design institute before compliance claims.',
   'medium', '2026-10-15'),
  ('CN', 'decoration', 'gb-50210',
   'GB 50210: Code for acceptance of construction quality of building decoration',
   'MOHURD (Ministry of Housing and Urban-Rural Development, PRC)', 'national_standard',
   'Acceptance criteria for finishing works incl. plastering, painting, suspended ceilings',
   '{"engines": ["wall_finishing", "screeding"]}',
   'China finishing-acceptance standard: GB 50210 governs quality acceptance of building decoration works — the reference for CN wall-finishing quality. Enforcement detail is set in local quality-supervision practice — verify with the local building authority.',
   'medium', '2026-10-15'),
  ('CN', 'gypsum', 'gb-t-9775',
   'GB/T 9775: Paper-faced gypsum board',
   'SAC (Standardization Administration of China)', 'national_standard',
   'Product specification for paper-faced gypsum board (types, dimensions, requirements)',
   '{"engines": ["wall_finishing", "screeding"]}',
   'China gypsum board product standard: GB/T 9775 is the national specification for paper-faced gypsum board used in drywall assemblies. Application coverage rates come from manufacturer datasheets, not this standard.',
   'high', '2026-10-15'),
  -- IT: national technical code + UNI product standards
  ('IT', 'building_code', 'ntc-2018',
   'NTC 2018 — Norme Tecniche per le Costruzioni (D.M. 17 gennaio 2018)',
   'MIT (Ministero delle Infrastrutture e dei Trasporti, Italy)', 'national_standard',
   'National technical construction rules: actions, materials, seismic design, verification methods',
   '{"engines": ["structural", "build_to_roof"], "scope": "national"}',
   'Italian structural standard: the NTC 2018 ministerial decree is the national technical code for construction. Seismic zone parameters (ag) are set per municipality — confirm the site municipality and category before seismic design claims.',
   'medium', '2026-10-15'),
  ('IT', 'rendering', 'uni-en-998-1',
   'UNI EN 998-1: Specification for rendering mortars',
   'UNI (Ente Italiano di Normazione)', 'national_standard',
   'Product specification for factory-made rendering mortars (CS categories I–IV)',
   '{"engines": ["wall_finishing", "screeding"]}',
   'Italian render mortar standard: UNI EN 998-1 (Italian adoption of EN 998-1) specifies rendering mortars used in traditional Italian intonaco assemblies. Application rates remain manufacturer-datasheet territory.',
   'high', '2026-10-15'),
  ('IT', 'plaster', 'uni-en-13279',
   'UNI EN 13279: Gypsum binders and gypsum plasters',
   'UNI (Ente Italiano di Normazione)', 'national_standard',
   'Product specification for gypsum binders and gypsum plasters (skim coats, premixed plasters)',
   '{"engines": ["wall_finishing", "screeding"]}',
   'Italian gypsum plaster standard: UNI EN 13279 governs gypsum binders/plasters — the product family behind Italian premixed skim and stucco finishes. Coverage rates come from manufacturer datasheets.',
   'high', '2026-10-15'),
  -- NG: national building code + Lagos state regulations
  ('NG', 'building_code', 'national-building-code-2006',
   'National Building Code of Nigeria (first edition, 2006)',
   'Federal Government of Nigeria (National Council on Housing)', 'national_standard',
   'National minimum standards for building design, materials and workmanship',
   '{"engines": ["structural", "build_to_roof", "wall_finishing"], "scope": "national"}',
   'Nigerian structural/building standard: the National Building Code (2006) sets the federal minimum for construction practice. Enforcement is state-level and uneven — confirm the applicable state regulations and local authority approvals before compliance claims.',
   'medium', '2026-10-15'),
  ('NG', 'planning', 'lagos-state-planning-regulations',
   'Lagos State Physical Planning and Development Regulations',
   'Lagos State Government (Ministry of Physical Planning and Urban Development)', 'national_standard',
   'Building approval, setbacks, height zones and construction standards within Lagos State',
   '{"engines": ["build_to_roof"], "scope": "Lagos State"}',
   'Nigeria primary-market state regulation: Lagos State planning regulations govern approvals and construction standards for projects in Lagos (FRELUX NG projects are commonly Lagos-based). LAGOS-ONLY — every other Nigerian state maintains its own regulations; never apply Lagos rules elsewhere.',
   'medium', '2026-10-15'),
  -- AE: emirate-level fire code + Abu Dhabi I-code adoption
  ('AE', 'building_code', 'uae-fire-life-safety-code',
   'UAE Fire and Life Safety Code of Practice',
   'Dubai Civil Defence', 'national_standard',
   'Fire safety and life protection requirements incl. cladding and finishing material classes',
   '{"engines": ["wall_finishing", "build_to_roof"], "scope": "Dubai emirate"}',
   'UAE fire safety standard: the Fire and Life Safety Code of Practice is enforced by Dubai Civil Defence in DUBAI. Other emirates enforce their own civil-defence requirements — confirm the emirate before compliance claims. Finishing material fire classes must follow this code for facade work.',
   'medium', '2026-10-15'),
  ('AE', 'building_code', 'abu-dhabi-international-building-codes',
   'Abu Dhabi International Building Codes (ICC-based)',
   'Department of Municipalities and Transport, Abu Dhabi', 'national_standard',
   'Building code family adopted in Abu Dhabi, based on ICC International Codes (IBC/IRC/IECC line)',
   '{"engines": ["structural", "build_to_roof"], "scope": "Abu Dhabi emirate"}',
   'UAE structural standard: Abu Dhabi emirate enforces building codes based on the ICC I-code family. ABU DHABI-ONLY — Dubai and other emirates use their own codes; confirm the emirate and current edition before compliance claims.',
   'medium', '2026-10-15')
ON CONFLICT (market_code, domain, ref) DO NOTHING;

-- =========================================================
-- IT role mappings: wire the existing IT price book (verified
-- live 2026-10-15: EUR prices on all slugs below) into the
-- finishing engine. Existence-guarded — never duplicates.
-- =========================================================
INSERT INTO market_material_roles
  (market, role, material_slug, display_name, unit_label, notes, is_active, sort_order)
SELECT 'IT', v.role, v.slug, v.dn, v.ul, v.notes, true, v.so
FROM (VALUES
  ('interior-paint', 'it-pittura-14l', 'Pittura Lavabile Interno (14 L)', '14L',
   'Italian washable interior paint (Home Paint 14 L pail) — priced EUR 59.90.', 10),
  ('exterior-paint', 'it-esterna-14l', 'Pittura al Quarzo Esterna (14 L)', '14L',
   'Italian quartz exterior masonry paint (Casabianca Brixo 14 L) — priced EUR 68.90.', 11),
  ('primer', 'it-fissativo-5l', 'Fissativo Acrilico (5 L)', '5L',
   'Italian acrylic primer/fissativante (IS15 5 L) — priced EUR 35.44.', 12),
  ('joint-filler', 'it-stucco-5kg', 'Stucco Bianco (5 kg)', '5kg',
   'Italian white filler/stucco (BRIXO 5 kg tub) — priced EUR 15.99.', 13),
  ('sand', 'it-sabbia-25kg', 'Sabbia (25 kg)', 'bag',
   'Italian washed sand, 25 kg bag — priced EUR 3.50.', 14),
  ('concrete-mix', 'it-cemento-25kg', 'Cemento II/B-LL (25 kg)', 'bag',
   'Italian Portland-composite cement, 25 kg bag — priced EUR 5.45.', 15),
  ('waterproofer', 'it-idro-5l', 'SikaCem Idrorepellente Malta (5 L)', '5L',
   'Italian waterproofing/render additive (SikaCem 5 L) — priced EUR 59.04.', 16),
  ('sandpaper', 'gen-sandpaper-sheet', 'Sandpaper Sheets (Fine, pack)', 'pack',
   'Fine sandpaper sheets — shared catalog slug priced EUR 0.60 for IT.', 17)
) AS v(role, slug, dn, ul, notes, so)
WHERE NOT EXISTS (
  SELECT 1 FROM market_material_roles m
  WHERE m.market = 'IT' AND m.role = v.role
);
