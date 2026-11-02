-- =========================================================
-- Counter-Vision Engine (Future Engine 2) — Gemini-powered
-- =========================================================
-- Photo-based counting: an artisan photographs a stack of
-- tiles, cement bags, blocks or paint buckets and the engine
-- counts what is visible, honestly — a count it cannot stand
-- behind comes back as "unclear", never as a guess.
--
-- The counting itself runs in the count-vision Supabase Edge
-- Function calling Google Gemini with the admin-configured key
-- (site_settings.gemini_api_key; ai_enabled gates the whole
-- feature). This migration adds the server-side records:
--
--  * count_vision_log — every count request and its verdict.
--    Anonymous insert (the public page logs what was counted
--    without an account); authenticated users read their own
--    requests; admins read everything and curate spam.
--    The PHOTO IS NEVER STORED — only what was asked and what
--    was answered. Counting is a query, not surveillance.
--  * Behaviour rules in estimation_calc_rules (calculator_type
--    'count_vision'): image size limit, count clamping bounds,
--    the confidence floor below which a count is reported as
--    "unclear" — admin-configurable like every other engine.
-- =========================================================

-- ─────────────────────────────────────────────
-- 1. count_vision_log
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS count_vision_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by    uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  item_hint     text NOT NULL DEFAULT '',       -- what the visitor said they photographed
  verdict       text NOT NULL CHECK (verdict IN (
                  'counted', 'unclear', 'not_found', 'error')),
  item_count    integer,                        -- NULL unless verdict = 'counted'
  unit_label    text,                           -- e.g. 'bags', 'tiles' — as answered
  confidence    numeric CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  reason        text,                           -- what the engine said, in its words
  image_bytes   integer,                        -- size of the photo sent for counting
  image_mime    text,
  latency_ms    integer,                        -- how long the Gemini call took
  requested_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS count_vision_log_owner_idx
  ON count_vision_log (created_by, requested_at DESC);
CREATE INDEX IF NOT EXISTS count_vision_log_verdict_idx
  ON count_vision_log (verdict, requested_at DESC);

ALTER TABLE count_vision_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE count_vision_log FORCE ROW LEVEL SECURITY;

-- Public visitors may count without an account
-- (same anonymous-insert model as conversational_parse_log).
DROP POLICY IF EXISTS "count_vision_public_insert" ON count_vision_log;
CREATE POLICY "count_vision_public_insert" ON count_vision_log
  FOR INSERT TO public WITH CHECK (true);

-- An authenticated user reads their own count requests.
DROP POLICY IF EXISTS "count_vision_owner_read" ON count_vision_log;
CREATE POLICY "count_vision_owner_read" ON count_vision_log
  FOR SELECT TO authenticated USING (created_by = auth.uid());

-- Admins see every count request (site-wide usage).
DROP POLICY IF EXISTS "count_vision_admin_read" ON count_vision_log;
CREATE POLICY "count_vision_admin_read" ON count_vision_log
  FOR SELECT TO authenticated USING (public.is_admin());

-- Count requests are append-only: no update, no delete except
-- admins curating spam/mistakes.
DROP POLICY IF EXISTS "count_vision_admin_delete" ON count_vision_log;
CREATE POLICY "count_vision_admin_delete" ON count_vision_log
  FOR DELETE TO authenticated USING (public.is_admin());

COMMENT ON TABLE count_vision_log IS 'Every Counter-Vision count request: what was asked (item hint), the honest verdict (counted/unclear/not_found/error), the count and confidence when counted, and diagnostics. Photos are NEVER stored — only the request metadata and the answer. Anonymous insert; users read their own; admin-only delete.';

-- ─────────────────────────────────────────────
-- 2. Behaviour rules — admin-configurable
-- ─────────────────────────────────────────────
INSERT INTO estimation_calc_rules (rule_key, calculator_type, rule_value, rule_status, description, is_active)
VALUES
  ('max_image_mb', 'count_vision',
   '{"value": 8}'::jsonb, 'verified_frelux',
   'Maximum accepted photo size in MB. Larger uploads are refused with the limit stated, never silently downscaled.', true),
  ('max_count', 'count_vision',
   '{"value": 5000}'::jsonb, 'verified_frelux',
   'Upper clamp on any returned count. A count above this is treated as unreliable and reported as unclear — an honest refusal beats an invented figure.', true),
  ('min_confidence', 'count_vision',
   '{"value": 0.6}'::jsonb, 'verified_frelux',
   'Confidence floor (0-1). A Gemini count below this confidence is reported as "unclear" with the reason, not as a number.', true)
ON CONFLICT (rule_key, calculator_type) DO NOTHING;
