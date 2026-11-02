-- =========================================================
-- Conversational Estimator Engine (Engine 3 — WhatsApp-native)
-- =========================================================
-- Turns a WhatsApp chat thread / voice-note transcript in
-- English, Nigerian Pidgin, Yoruba or Hausa into a full paint
-- estimate, or an honest follow-up question when the customer
-- has not given the size yet.
--
-- Two tables, same philosophy as every Frelux engine:
--  * conversational_language_packs — the keyword packs the
--    detector and extractor run on. Admin-configurable with a
--    mandatory source reference; the engine falls back to its
--    built-in defaults only where a category is unconfigured.
--  * conversational_parse_log — every parse the public page
--    runs, with what was extracted and what was missing, so
--    admins can see what customers actually ask for and which
--    language packs need more coverage. Anonymous insert,
--    admin-only read.
-- =========================================================

-- ─────────────────────────────────────────────
-- 1. conversational_language_packs
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversational_language_packs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  language_code    text NOT NULL CHECK (language_code IN ('en', 'pcm', 'yo', 'ha')),
  category         text NOT NULL CHECK (category IN (
                     'greeting', 'surface_paint', 'surface_screed', 'surface_pop',
                     'surface_tile', 'dimension_word', 'unit_meter', 'unit_feet',
                     'region_hint', 'coats_word')),
  keywords         text[] NOT NULL CHECK (array_length(keywords, 1) > 0),
  weight           integer NOT NULL CHECK (weight > 0),
  description      text,
  source_reference text NOT NULL,             -- phrase book / verified chat sample
  is_active        boolean NOT NULL DEFAULT true,
  sort_order       integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS conversational_packs_lookup_idx
  ON conversational_language_packs (language_code, category, is_active);

ALTER TABLE conversational_language_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversational_language_packs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversational_packs_public_read" ON conversational_language_packs;
CREATE POLICY "conversational_packs_public_read" ON conversational_language_packs
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "conversational_packs_admin_write" ON conversational_language_packs;
CREATE POLICY "conversational_packs_admin_write" ON conversational_language_packs
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS "conversational_packs_set_updated_at" ON conversational_language_packs;
CREATE TRIGGER "conversational_packs_set_updated_at"
  BEFORE UPDATE ON conversational_language_packs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE conversational_language_packs IS 'Keyword packs powering language detection and parameter extraction for the WhatsApp-native conversational estimator. Native-language entries (yo/ha) carry a higher weight than shared loanwords so a Yoruba or Hausa message is never misread as Pidgin.';

-- ─────────────────────────────────────────────
-- 2. conversational_parse_log
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversational_parse_log (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_thread        text NOT NULL,
  detected_language text NOT NULL,
  intent            text NOT NULL,
  extracted_params  jsonb NOT NULL,
  had_estimate      boolean NOT NULL,
  language_override boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  created_by        uuid
);

CREATE INDEX IF NOT EXISTS conversational_parse_log_recent_idx
  ON conversational_parse_log (created_at DESC);

ALTER TABLE conversational_parse_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversational_parse_log FORCE ROW LEVEL SECURITY;

-- Public visitors may log their parse (product telemetry); only
-- admins can read the log. No update/delete for the public.
DROP POLICY IF EXISTS "conversational_log_public_insert" ON conversational_parse_log;
CREATE POLICY "conversational_log_public_insert" ON conversational_parse_log
  FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "conversational_log_admin_read" ON conversational_parse_log;
CREATE POLICY "conversational_log_admin_read" ON conversational_parse_log
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "conversational_log_admin_delete" ON conversational_parse_log;
CREATE POLICY "conversational_log_admin_delete" ON conversational_parse_log
  FOR DELETE TO authenticated USING (public.is_admin());

COMMENT ON TABLE conversational_parse_log IS 'Every conversational-estimator parse: the thread, detected language, intent and extracted facts. Admin-only read; anonymous insert so the public page can log what customers ask for without an account.';

-- ─────────────────────────────────────────────
-- 3. Seed: the built-in defaults become the configured truth
-- ─────────────────────────────────────────────
INSERT INTO conversational_language_packs
  (language_code, category, keywords, weight, description, source_reference, sort_order)
VALUES
  ('en', 'greeting', ARRAY['hello', 'hi', 'good morning', 'good afternoon', 'please', 'thank you'], 1,
   'English greetings and politeness markers.', 'FRELUX conversational seed v1 (engine defaults)', 10),
  ('en', 'surface_paint', ARRAY['paint', 'painting', 'painted', 'painter'], 2,
   'English paint-intent keywords.', 'FRELUX conversational seed v1 (engine defaults)', 20),
  ('en', 'surface_screed', ARRAY['screeding', 'screed', 'skim coat'], 2,
   'English screeding-intent keywords.', 'FRELUX conversational seed v1 (engine defaults)', 30),
  ('en', 'surface_pop', ARRAY['pop ceiling', 'pop board', 'plaster of paris'], 2,
   'English POP-intent keywords.', 'FRELUX conversational seed v1 (engine defaults)', 40),
  ('en', 'surface_tile', ARRAY['tile', 'tiling', 'tiles'], 2,
   'English tile-intent keywords.', 'FRELUX conversational seed v1 (engine defaults)', 50),
  ('en', 'dimension_word', ARRAY['by', 'how much', 'meters', 'feet'], 1,
   'English dimension phrasing.', 'FRELUX conversational seed v1 (engine defaults)', 60),
  ('pcm', 'greeting', ARRAY['abeg', 'oga', 'madam', 'bros', 'how far', 'wetin', 'na me', 'sabi'], 2,
   'Nigerian Pidgin greetings and markers.', 'FRELUX conversational seed v1 (engine defaults)', 110),
  ('pcm', 'surface_paint', ARRAY['paint', 'painty', 'fonfon'], 2,
   'Pidgin paint-intent keywords (loanwords Nigerians type).', 'FRELUX conversational seed v1 (engine defaults)', 120),
  ('pcm', 'surface_screed', ARRAY['screed', 'skrinn', 'smoothen'], 2,
   'Pidgin screeding-intent keywords.', 'FRELUX conversational seed v1 (engine defaults)', 130),
  ('pcm', 'surface_pop', ARRAY['pop', 'pop ceiling'], 2,
   'Pidgin POP-intent keywords.', 'FRELUX conversational seed v1 (engine defaults)', 140),
  ('pcm', 'surface_tile', ARRAY['tile', 'taya'], 2,
   'Pidgin tile-intent keywords.', 'FRELUX conversational seed v1 (engine defaults)', 150),
  ('pcm', 'dimension_word', ARRAY['how much be', 'how much na', 'na'], 1,
   'Pidgin dimension phrasing.', 'FRELUX conversational seed v1 (engine defaults)', 160),
  ('yo', 'greeting', ARRAY['pẹlẹ', 'pele o', 'ẹ káàbọ̀', 'e kaabo', 'jọ̀wọ́', 'jowo', 'o ṣé', 'o se', 'mo fe', 'mo fẹ́'], 3,
   'Yoruba greetings and intent phrases. Native markers weigh 3: they never appear in Pidgin or English chat.', 'FRELUX conversational seed v1 (engine defaults)', 210),
  ('yo', 'surface_paint', ARRAY['ẹ̀fú', 'efu', 'ẹfu', 'paint'], 2,
   'Yoruba paint-intent keywords plus the loanword everyone types.', 'FRELUX conversational seed v1 (engine defaults)', 220),
  ('yo', 'surface_screed', ARRAY['screed', 'sikriin'], 2,
   'Yoruba screeding-intent loanwords.', 'FRELUX conversational seed v1 (engine defaults)', 230),
  ('yo', 'surface_pop', ARRAY['pop', 'orí ilé', 'ori ile'], 2,
   'Yoruba POP/ceiling keywords.', 'FRELUX conversational seed v1 (engine defaults)', 240),
  ('yo', 'surface_tile', ARRAY['tile', 'táyììlì'], 2,
   'Yoruba tile-intent loanwords.', 'FRELUX conversational seed v1 (engine defaults)', 250),
  ('yo', 'dimension_word', ARRAY['iwọn', 'ìwọ̀n', 'melò', 'melo', 'e lo owo'], 2,
   'Yoruba dimension phrasing.', 'FRELUX conversational seed v1 (engine defaults)', 260),
  ('yo', 'unit_feet', ARRAY['ẹsẹ̀', 'ese', 'feet'], 1,
   'Yoruba feet markers.', 'FRELUX conversational seed v1 (engine defaults)', 270),
  ('ha', 'greeting', ARRAY['sannu', 'barka', 'da zuwa', 'na gode', 'don Allah', 'don allah', 'ina son', 'na son', 'zan'], 3,
   'Hausa greetings and intent phrases. Native markers weigh 3: they never appear in Pidgin or English chat.', 'FRELUX conversational seed v1 (engine defaults)', 310),
  ('ha', 'surface_paint', ARRAY['fenti', 'fenti-fenti', 'paint'], 2,
   'Hausa paint-intent keywords plus the loanword everyone types.', 'FRELUX conversational seed v1 (engine defaults)', 320),
  ('ha', 'surface_screed', ARRAY['screed', 'sikrid'], 2,
   'Hausa screeding-intent loanwords.', 'FRELUX conversational seed v1 (engine defaults)', 330),
  ('ha', 'surface_pop', ARRAY['pop', 'gini'], 2,
   'Hausa POP/ceiling keywords.', 'FRELUX conversational seed v1 (engine defaults)', 340),
  ('ha', 'surface_tile', ARRAY['tile', 'tiloli'], 2,
   'Hausa tile-intent loanwords.', 'FRELUX conversational seed v1 (engine defaults)', 350),
  ('ha', 'dimension_word', ARRAY['gwaznon', 'girmansa', 'nawa', 'kudi nawa'], 2,
   'Hausa dimension phrasing.', 'FRELUX conversational seed v1 (engine defaults)', 360),
  ('ha', 'unit_feet', ARRAY['ƙafa', 'kafa', 'feet'], 1,
   'Hausa feet markers.', 'FRELUX conversational seed v1 (engine defaults)', 370)
ON CONFLICT DO NOTHING;
