-- =========================================================
-- FRELUX ENGINE #6 M1: TECHNICAL TRANSLATION DICTIONARIES
-- (2026-10-15, JP / FR / BR / SA / AE priority markets)
--
-- 1. Japanese joins the language registry (data-only change,
--    mirroring the registry design: languages are data).
-- 2. Web-verified terminology rows for ja / pt (BR) / ar
--    (Gulf) / fr: the full English dictionary record is
--    copied with a translation overlay, translation_status
--    'provisional' and verified=false. Verification is a
--    deliberate human action in the admin dictionary; the
--    construction_terms CHECK gates keep provisional rows
--    from masquerading as verified. Nothing is invented:
--    every term was verified against supplier listings,
--    official terminology lessons (OTIT) and market
--    glossaries on 2026-10-15.
-- =========================================================

INSERT INTO public.frelux_archie_languages (code, label, native_label, common_regions, active) VALUES
  ('ja', 'Japanese', '日本語', ARRAY['JP'], true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.construction_terms (
  canonical_term, category, definition, technical_definition, simple_definition,
  language, translation, alternative_terms, local_terms, synonyms, abbreviations,
  unit, measurement_type, construction_context, example_usage, related_terms,
  common_mistakes, translation_notes, country, region, source, source_date,
  confidence_score, verified, verified_by, translation_status, keep_in_english,
  explanation_required, source_details, version
)
SELECT
  en.canonical_term, en.category, en.definition, en.technical_definition, en.simple_definition,
  v.lang, v.translation, en.alternative_terms, en.local_terms, en.synonyms, en.abbreviations,
  en.unit, en.measurement_type, en.construction_context, en.example_usage, en.related_terms,
  en.common_mistakes, v.notes, v.country, v.region,
  'FRELUX Engineering (web-verified 2026-10-15)', '2026-10-15',
  v.confidence, false, NULL, 'provisional', false, false, NULL, 1
FROM public.construction_terms en
JOIN (VALUES
  ('cement', 'fr', 'ciment', 'FR', 'Europe', 0.97::numeric, 'Standard French construction term.'),
  ('concrete', 'fr', 'béton', 'FR', 'Europe', 0.97::numeric, 'Standard French construction term.'),
  ('wall', 'fr', 'mur', 'FR', 'Europe', 0.96::numeric, 'Standard French construction term.'),
  ('roof', 'fr', 'toit', 'FR', 'Europe', 0.96::numeric, 'Standard French construction term.'),
  ('tile', 'fr', 'carrelage', 'FR', 'Europe', 0.95::numeric, 'Standard French construction term.'),
  ('paint', 'fr', 'peinture', 'FR', 'Europe', 0.96::numeric, 'Standard French construction term.'),
  ('foundation', 'fr', 'fondation', 'FR', 'Europe', 0.96::numeric, 'Standard French construction term.'),
  ('beam', 'fr', 'poutre', 'FR', 'Europe', 0.95::numeric, 'Standard French construction term.'),
  ('column', 'fr', 'colonne / poteau', 'FR', 'Europe', 0.9::numeric, 'Poteau is the usual structural term for RC columns.'),
  ('cement', 'pt', 'cimento', 'BR', 'South America', 0.97::numeric, 'Standard Portuguese construction term.'),
  ('concrete', 'pt', 'betão / concreto', 'BR', 'South America', 0.94::numeric, 'Betão in Portugal, concreto in Brazil.'),
  ('roof', 'pt', 'telhado', 'BR', 'South America', 0.96::numeric, 'Standard Portuguese construction term.'),
  ('tile', 'pt', 'azulejo', 'BR', 'South America', 0.96::numeric, 'Standard Portuguese term.'),
  ('cement', 'ar', 'أسمنت', 'SA', 'Middle East', 0.95::numeric, 'Standard Arabic construction term.'),
  ('concrete', 'ar', 'خرسانة', 'SA', 'Middle East', 0.95::numeric, 'Standard Arabic construction term.'),
  ('wall', 'ar', 'جدار', 'SA', 'Middle East', 0.95::numeric, 'Standard Arabic construction term.'),
  ('foundation', 'ar', 'أساس', 'SA', 'Middle East', 0.95::numeric, 'Standard Arabic construction term.'),
  ('cement', 'ja', 'セメント', 'JP', 'East Asia', 0.97::numeric, 'Standard Japanese construction term (Taiheiyo Cement product usage).'),
  ('concrete', 'ja', 'コンクリート', 'JP', 'East Asia', 0.97::numeric, 'Standard Japanese construction term (RC terminology).'),
  ('mortar', 'ja', 'モルタル', 'JP', 'East Asia', 0.95::numeric, 'Standard Japanese construction term (Nihon Kasei left-kan materials).'),
  ('rebar', 'ja', '鉄筋', 'JP', 'East Asia', 0.95::numeric, 'Standard Japanese term; RC = 鉄筋コンクリート造 per construction glossaries.'),
  ('formwork', 'ja', '型枠', 'JP', 'East Asia', 0.95::numeric, 'Standard Japanese term per OTIT construction terminology lesson.'),
  ('blinding', 'ja', '捨てコンクリート', 'JP', 'East Asia', 0.95::numeric, 'Standard Japanese leveling-concrete term per OTIT terminology lesson.'),
  ('slab', 'ja', 'スラブ', 'JP', 'East Asia', 0.95::numeric, 'Standard Japanese term (スラブ配筋 slab rebar arrangement).'),
  ('wall', 'ja', '壁', 'JP', 'East Asia', 0.96::numeric, 'Standard Japanese construction term.'),
  ('roof', 'ja', '屋根', 'JP', 'East Asia', 0.96::numeric, 'Standard Japanese construction term.'),
  ('beam', 'ja', '梁', 'JP', 'East Asia', 0.95::numeric, 'Standard Japanese structural term.'),
  ('column', 'ja', '柱', 'JP', 'East Asia', 0.95::numeric, 'Standard Japanese structural term.'),
  ('strip foundation', 'ja', '布基礎', 'JP', 'East Asia', 0.95::numeric, 'Standard Japanese continuous-foundation term (連続基礎).'),
  ('plastering', 'ja', '左官', 'JP', 'East Asia', 0.93::numeric, 'Standard Japanese term for plastering works (左官工事).'),
  ('tiling', 'ja', 'タイル工事', 'JP', 'East Asia', 0.93::numeric, 'Standard Japanese term for tiling works (タイル工事材).'),
  ('square metre', 'ja', '平方メートル', 'JP', 'East Asia', 0.97::numeric, 'Standard Japanese metric unit.'),
  ('cubic metre', 'ja', '立方メートル', 'JP', 'East Asia', 0.97::numeric, 'Standard Japanese metric unit.'),
  ('personal protective equipment', 'ja', '保護具', 'JP', 'East Asia', 0.9::numeric, 'Standard Japanese site-safety term for protective equipment.'),
  ('mortar', 'pt', 'argamassa', 'BR', 'South America', 0.95::numeric, 'Standard Brazilian construction term.'),
  ('rebar', 'pt', 'vergalhão', 'BR', 'South America', 0.94::numeric, 'Standard Brazilian term for steel reinforcement bar.'),
  ('slab', 'pt', 'laje', 'BR', 'South America', 0.95::numeric, 'Standard Brazilian term for floor/roof slab.'),
  ('wall', 'pt', 'parede', 'BR', 'South America', 0.96::numeric, 'Standard Brazilian construction term.'),
  ('beam', 'pt', 'viga', 'BR', 'South America', 0.95::numeric, 'Standard Brazilian structural term.'),
  ('column', 'pt', 'pilar', 'BR', 'South America', 0.95::numeric, 'Brazilian usage (pilar); European Portuguese prefers coluna.'),
  ('formwork', 'pt', 'fôrma', 'BR', 'South America', 0.93::numeric, 'Standard Brazilian term (fôrmas de concretagem).'),
  ('screeding', 'pt', 'contrapiso', 'BR', 'South America', 0.93::numeric, 'Standard Brazilian term for floor screed/leveling layer.'),
  ('blinding', 'pt', 'concreto magro', 'BR', 'South America', 0.9::numeric, 'Standard Brazilian lean-concrete blinding term.'),
  ('strip foundation', 'pt', 'sapata corrida', 'BR', 'South America', 0.9::numeric, 'Standard Brazilian foundation-engineering term for strip footing.'),
  ('rendering', 'pt', 'reboco', 'BR', 'South America', 0.94::numeric, 'Standard Brazilian term for external render/plaster coat.'),
  ('tiling', 'pt', 'assentamento de revestimento cerâmico', 'BR', 'South America', 0.9::numeric, 'Standard Brazilian term for ceramic tiling works (NBR vocabulary).'),
  ('square metre', 'pt', 'metro quadrado', 'BR', 'South America', 0.97::numeric, 'Standard Brazilian metric unit.'),
  ('cubic metre', 'pt', 'metro cúbico', 'BR', 'South America', 0.97::numeric, 'Standard Brazilian metric unit.'),
  ('personal protective equipment', 'pt', 'equipamento de proteção individual (EPI)', 'BR', 'South America', 0.95::numeric, 'Standard Brazilian regulatory safety term (EPI).'),
  ('primer', 'pt', 'selador', 'BR', 'South America', 0.9::numeric, 'Standard Brazilian paint-preparation term for primer/sealer.'),
  ('mortar', 'ar', 'مونة', 'SA', 'Middle East', 0.92::numeric, 'Gulf site usage; formal term الملاط also used.'),
  ('rebar', 'ar', 'حديد التسليح', 'SA', 'Middle East', 0.95::numeric, 'Standard Arabic term for steel reinforcement.'),
  ('slab', 'ar', 'بلاطة', 'SA', 'Middle East', 0.93::numeric, 'Standard Gulf term for concrete slab.'),
  ('beam', 'ar', 'كمرة', 'SA', 'Middle East', 0.93::numeric, 'Standard Gulf term for RC beam.'),
  ('column', 'ar', 'عمود', 'SA', 'Middle East', 0.93::numeric, 'Standard Arabic structural term.'),
  ('roof', 'ar', 'سطح', 'SA', 'Middle East', 0.9::numeric, 'Gulf usage for flat roof; سقف also common.'),
  ('strip foundation', 'ar', 'قاعدة مستمرة', 'SA', 'Middle East', 0.9::numeric, 'Standard structural-engineering term for strip footing.'),
  ('formwork', 'ar', 'شدات', 'SA', 'Middle East', 0.92::numeric, 'Gulf site usage (الشدة); قوالب also used.'),
  ('rendering', 'ar', 'لياسة', 'SA', 'Middle East', 0.92::numeric, 'Standard Gulf term for render/plaster finishing.'),
  ('blinding', 'ar', 'خرسانة النظافة', 'SA', 'Middle East', 0.9::numeric, 'Standard term for blinding/lean concrete layer.'),
  ('tiling', 'ar', 'تركيب البلاط', 'SA', 'Middle East', 0.9::numeric, 'Standard term for tiling works.'),
  ('square metre', 'ar', 'متر مربع', 'SA', 'Middle East', 0.97::numeric, 'Standard Arabic metric unit.'),
  ('cubic metre', 'ar', 'متر مكعب', 'SA', 'Middle East', 0.97::numeric, 'Standard Arabic metric unit.'),
  ('personal protective equipment', 'ar', 'مهمات الوقاية الشخصية', 'SA', 'Middle East', 0.93::numeric, 'Standard Gulf HSE term for PPE.'),
  ('bill of quantities', 'ar', 'جدول الكميات', 'SA', 'Middle East', 0.92::numeric, 'Standard Gulf tendering term for BOQ.'),
  ('mortar', 'fr', 'mortier', 'FR', 'Europe', 0.97::numeric, 'Standard French construction term.'),
  ('rebar', 'fr', 'armature', 'FR', 'Europe', 0.93::numeric, 'Standard French term for reinforcement steel (barre d''armature).'),
  ('slab', 'fr', 'dalle', 'FR', 'Europe', 0.95::numeric, 'Standard French structural term.'),
  ('formwork', 'fr', 'coffrage', 'FR', 'Europe', 0.95::numeric, 'Standard French construction term.'),
  ('blinding', 'fr', 'béton de propreté', 'FR', 'Europe', 0.95::numeric, 'Standard French term for the blinding layer.'),
  ('screeding', 'fr', 'chape', 'FR', 'Europe', 0.93::numeric, 'Standard French term for floor screed.'),
  ('rendering', 'fr', 'enduit', 'FR', 'Europe', 0.95::numeric, 'Standard French term for render/plaster coat.'),
  ('tiling', 'fr', 'carrelage', 'FR', 'Europe', 0.95::numeric, 'Standard French term for tiling works.'),
  ('primer', 'fr', 'apprêt', 'FR', 'Europe', 0.94::numeric, 'Standard French paint-preparation term.'),
  ('strip foundation', 'fr', 'semelle filante', 'FR', 'Europe', 0.93::numeric, 'Standard French foundation-engineering term.'),
  ('square metre', 'fr', 'mètre carré', 'FR', 'Europe', 0.97::numeric, 'Standard French metric unit.'),
  ('cubic metre', 'fr', 'mètre cube', 'FR', 'Europe', 0.97::numeric, 'Standard French metric unit.'),
  ('personal protective equipment', 'fr', 'équipement de protection individuelle', 'FR', 'Europe', 0.95::numeric, 'Standard French regulatory safety term (EPI).'),
  ('quantity surveyor', 'fr', 'économiste de la construction', 'FR', 'Europe', 0.92::numeric, 'Official French profession title for quantity surveyor.')
) AS v (canonical_term, lang, translation, country, region, confidence, notes)
  ON en.canonical_term = v.canonical_term AND en.language = 'en'
ON CONFLICT (canonical_term, language) DO NOTHING;
