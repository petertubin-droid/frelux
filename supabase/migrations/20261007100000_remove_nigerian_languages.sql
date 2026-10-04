-- =========================================================
-- 20261007100000_remove_nigerian_languages.sql
--
-- FRELUX went worldwide: the Nigerian language set (Nigerian
-- Pidgin, Yoruba, Igbo, Hausa) is retired from the language
-- registries, dictionaries and conversational packs, and the
-- worldwide set (Spanish, French, German, Portuguese, Russian,
-- Indonesian, Swahili, Arabic, Hindi, Chinese) is completed in
-- the Archie language registry.
--
-- Idempotent: safe to re-run.
-- =========================================================

-- ---------------------------------------------------------
-- 1. Archie language registry: drop Nigerian, add worldwide
-- ---------------------------------------------------------
DELETE FROM public.frelux_archie_languages
WHERE code IN ('pcm', 'yo', 'ha', 'ig');

INSERT INTO public.frelux_archie_languages (code, label, native_label, common_regions, active) VALUES
  ('de', 'German', 'Deutsch', ARRAY['DE','AT','CH'], true),
  ('ru', 'Russian', 'Русский', ARRAY['RU'], true),
  ('id', 'Indonesian', 'Bahasa Indonesia', ARRAY['ID'], true)
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------
-- 2. Multilingual terminology: remove Nigerian-language rows
-- ---------------------------------------------------------
DELETE FROM public.frelux_archie_terminology
WHERE language_code IN ('pcm', 'yo', 'ha', 'ig');

-- ---------------------------------------------------------
-- 3. Construction dictionary: remove Nigerian-language terms
--    (versions cascade via FK ON DELETE CASCADE)
-- ---------------------------------------------------------
DELETE FROM public.construction_terms
WHERE language IN ('pcm', 'yo', 'ha', 'ig');

-- ---------------------------------------------------------
-- 4. Lexicon engine: remove Nigerian-language word rows
--    (senses cascade via FK ON DELETE CASCADE)
-- ---------------------------------------------------------
DELETE FROM public.lexicon_words
WHERE language IN ('pcm', 'yo', 'ha', 'ig');

DELETE FROM public.semantic_graph_nodes
WHERE language IN ('pcm', 'yo', 'ha', 'ig');

-- ---------------------------------------------------------
-- 5. Conversational estimator: English-only packs
--    The engine is now English-only; the DB packs follow.
-- ---------------------------------------------------------
DELETE FROM conversational_language_packs
WHERE language_code IN ('pcm', 'yo', 'ha');

ALTER TABLE conversational_language_packs
  DROP CONSTRAINT IF EXISTS conversational_language_packs_language_code_check;

ALTER TABLE conversational_language_packs
  ADD CONSTRAINT conversational_language_packs_language_code_check
  CHECK (language_code IN ('en'));

-- Parse log rows keep their history: detected_language is a
-- historical record of what visitors actually typed and stays.
