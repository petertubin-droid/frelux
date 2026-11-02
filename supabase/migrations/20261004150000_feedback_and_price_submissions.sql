-- =========================================================
-- Community feedback + price submission pipeline
-- =========================================================
-- feedback_suggestions: public "suggest a development / send
--   feedback" funnel (tiny banner on calculator pages + homepage,
--   /feedback page). Anyone (including anonymous visitors) may
--   submit; only admins can read and manage entries.
--
-- price_submissions: community price reporting. Users report what
--   they actually pay locally, in any market (NG/GH/KE/ZA). Every
--   entry starts PENDING and only enters the authoritative
--   estimation_prices book through explicit admin promotion.
--   Consensus (>= 3 independent agreeing entries) flips entries to
--   community_verified via trigger so they surface to the admin —
--   it never writes to the price book directly. The deterministic
--   engines keep reading only estimation_prices.
-- =========================================================

CREATE TABLE IF NOT EXISTS feedback_suggestions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  kind          text NOT NULL CHECK (kind IN ('feedback', 'feature_request', 'bug_report')),
  category      text NOT NULL DEFAULT 'general',
  message       text NOT NULL CHECK (char_length(trim(message)) > 0),
  page_url      text,
  contact_email text,
  status        text NOT NULL DEFAULT 'new'
                CHECK (status IN ('new', 'reviewed', 'planned', 'shipped', 'declined')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS feedback_suggestions_status_created_idx
  ON feedback_suggestions (status, created_at DESC);

ALTER TABLE feedback_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_suggestions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feedback_public_insert" ON feedback_suggestions;
CREATE POLICY "feedback_public_insert" ON feedback_suggestions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "feedback_admin_read" ON feedback_suggestions;
CREATE POLICY "feedback_admin_read" ON feedback_suggestions FOR SELECT
  TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "feedback_admin_update" ON feedback_suggestions;
CREATE POLICY "feedback_admin_update" ON feedback_suggestions FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "feedback_admin_delete" ON feedback_suggestions;
CREATE POLICY "feedback_admin_delete" ON feedback_suggestions FOR DELETE
  TO authenticated USING (public.is_admin());

CREATE TABLE IF NOT EXISTS price_submissions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  market       text NOT NULL DEFAULT 'NG', -- ISO country code; global scope, no fixed list
  region       text NOT NULL,
  item_name    text NOT NULL,
  unit         text NOT NULL DEFAULT 'unit',
  price        numeric NOT NULL CHECK (price > 0),
  currency     text NOT NULL DEFAULT 'NGN', -- local currency (ISO 4217); global scope
  vendor       text,
  notes        text,
  status       text NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'community_verified', 'approved', 'rejected')),
  match_group  text NOT NULL DEFAULT '',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS price_submissions_group_status_idx
  ON price_submissions (match_group, status);
CREATE INDEX IF NOT EXISTS price_submissions_submitted_by_idx
  ON price_submissions (submitted_by, created_at DESC);

ALTER TABLE price_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_submissions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "price_sub_insert_own" ON price_submissions;
CREATE POLICY "price_sub_insert_own" ON price_submissions FOR INSERT
  TO authenticated
  WITH CHECK (submitted_by = auth.uid());

DROP POLICY IF EXISTS "price_sub_read_own_or_admin" ON price_submissions;
CREATE POLICY "price_sub_read_own_or_admin" ON price_submissions FOR SELECT
  TO authenticated
  USING (submitted_by = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "price_sub_admin_update" ON price_submissions;
CREATE POLICY "price_sub_admin_update" ON price_submissions FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "price_sub_admin_delete" ON price_submissions;
CREATE POLICY "price_sub_admin_delete" ON price_submissions FOR DELETE
  TO authenticated USING (public.is_admin());

-- ── Consensus trigger ──────────────────────────────────────
-- BEFORE INSERT: derive the deterministic match key, then check
-- the group for >= 3 pending entries from >= 3 distinct users
-- whose prices agree within 10%. On consensus, flip the whole
-- pending group to community_verified (a flag for the admin, NOT
-- an automatic write into estimation_prices).
CREATE OR REPLACE FUNCTION price_submissions_consensus()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
  v_users integer;
  v_min   numeric;
  v_max   numeric;
BEGIN
  NEW.match_group := lower(trim(NEW.market)) || '|' ||
                     lower(trim(NEW.region)) || '|' ||
                     lower(trim(NEW.item_name)) || '|' ||
                     lower(trim(NEW.unit));

  SELECT count(*), count(DISTINCT submitted_by), min(price), max(price)
    INTO v_count, v_users, v_min, v_max
    FROM price_submissions
   WHERE match_group = NEW.match_group AND status = 'pending';

  IF v_count >= 3 AND v_users >= 3 AND v_max <= v_min * 1.1 THEN
    UPDATE price_submissions
       SET status = 'community_verified', updated_at = now()
     WHERE match_group = NEW.match_group AND status = 'pending';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "price_submissions_consensus_trg" ON price_submissions;
CREATE TRIGGER "price_submissions_consensus_trg"
  BEFORE INSERT ON price_submissions
  FOR EACH ROW EXECUTE FUNCTION price_submissions_consensus();

-- ── Grants (match the engine-table grants convention) ──────
GRANT SELECT, INSERT ON TABLE public.feedback_suggestions TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON TABLE public.feedback_suggestions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.price_submissions TO authenticated;
