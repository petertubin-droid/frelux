-- ICF and EIFS/ETICS calculator templates.
--
-- 1. The calculator_type CHECK predates build_to_roof, icf and eifs, so it
--    is widened to the full set the app supports (src/types/database.ts).
-- 2. Four curated public templates are seeded: two ICF walls and two EIFS
--    assemblies, so the estimators open pre-filled from /templates.

alter table calculator_templates drop constraint if exists calculator_templates_calculator_type_check;

alter table calculator_templates
  add constraint calculator_templates_calculator_type_check
  check (calculator_type = any (array['paint','tile','pop','screeding','build_to_roof','icf','eifs']::text[]));

insert into calculator_templates
  (name, description, calculator_type, input_data, schema_version, visibility,
   is_featured, is_published, display_order, slug, seo_title, seo_description, category)
values
  ('150 mm ICF Residential Wall',
   'Standard 150 mm core ICF wall: 40 m perimeter, 3.0 m high, flat form, EPS faces, two windows and one door.',
   'icf',
   '{"wallLengthM":40,"wallHeightM":3.0,"coreThicknessMm":150,"foamType":"standard_eps","formSystem":"flat","blockFaceLengthMm":1219,"blockFaceHeightMm":406,"verticalRebarSpacingMm":400,"isBasement":false,"wasteFactorPercent":4}'::jsonb,
   1, 'public', true, true, 130, 'icf-150mm-residential-wall',
   'ICF Wall Calculator Template: 150 mm Residential Wall | FRELUX',
   'Estimate ICF blocks, concrete, rebar and bracing for a 150 mm core residential wall.',
   'walls'),
  ('200 mm ICF Basement Wall',
   '200 mm core retaining basement wall: 30 m perimeter, 2.7 m high, below-grade waterproofing included.',
   'icf',
   '{"wallLengthM":30,"wallHeightM":2.7,"coreThicknessMm":200,"foamType":"graphite_neopor","formSystem":"flat","blockFaceLengthMm":1219,"blockFaceHeightMm":406,"verticalRebarSpacingMm":400,"isBasement":true,"wasteFactorPercent":5}'::jsonb,
   1, 'public', false, true, 131, 'icf-200mm-basement-wall',
   'ICF Wall Calculator Template: 200 mm Basement Wall | FRELUX',
   'Estimate a 200 mm ICF basement wall with below-grade waterproofing and drainage.',
   'walls'),
  ('100 mm ETICS on Masonry',
   'External wall insulation on blockwork: 50 m facade, 3.0 m high, 100 mm EPS, medium swirl finish.',
   'eifs',
   '{"wallLengthM":50,"wallHeightM":3.0,"substrateType":"cmu_masonry","insulationType":"standard_eps","insulationThicknessMm":100,"systemType":"barrier_eifs","finishTexture":"medium_swirl","impactMeshHeightM":2.0,"wasteFactorPercent":6}'::jsonb,
   1, 'public', true, true, 132, 'eifs-100mm-masonry-etics',
   'EIFS Calculator Template: 100 mm ETICS on Masonry | FRELUX',
   'Estimate insulation boards, adhesive, mesh, base coat and finish for 100 mm ETICS on masonry.',
   'walls'),
  ('50 mm Drainable EIFS on Framing',
   'Drainable EIFS over framed sheathing: 40 m facade, 2.8 m high, 50 mm EPS with drainage plane.',
   'eifs',
   '{"wallLengthM":40,"wallHeightM":2.8,"substrateType":"exterior_sheathing","insulationType":"standard_eps","insulationThicknessMm":50,"systemType":"drainable_eifs","finishTexture":"fine_sand","impactMeshHeightM":2.0,"wasteFactorPercent":6}'::jsonb,
   1, 'public', false, true, 133, 'eifs-50mm-drainable-framing',
   'EIFS Calculator Template: 50 mm Drainable EIFS on Framing | FRELUX',
   'Estimate a drainable EIFS assembly over framed sheathing with a 50 mm EPS board.',
   'walls')
on conflict (slug) do nothing;
