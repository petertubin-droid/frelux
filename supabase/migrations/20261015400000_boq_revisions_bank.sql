-- =========================================================
-- Wave 1.2: Editable Digital BOQ — revision history,
-- version stamping, bank-submittable tier foundation.
-- =========================================================
-- 1. boq_quote_revisions — append-only revision snapshots.
--    Every save stores the exact items/totals/rates that
--    produced that version; a BOQ is replayable at any rev.
-- 2. boq_quotes.revision — current version stamp (v1...).
-- 3. currency default: ISO "XXX" (no currency) instead of a
--    single-market NGN default — callers must pass the
--    project/quote's own currency (i18n mandate).
-- =========================================================

CREATE TABLE IF NOT EXISTS boq_quote_revisions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id        uuid NOT NULL REFERENCES boq_quotes(id) ON DELETE CASCADE,
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  version         integer NOT NULL CHECK (version >= 1),
  quote_ref       text NOT NULL,
  items           jsonb NOT NULL,
  totals          jsonb NOT NULL,
  rates_snapshot  jsonb NOT NULL,
  note            text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (quote_id, version)
);

ALTER TABLE boq_quote_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE boq_quote_revisions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "boq_revisions_owner_read" ON boq_quote_revisions;
CREATE POLICY "boq_revisions_owner_read" ON boq_quote_revisions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "boq_revisions_owner_insert" ON boq_quote_revisions;
CREATE POLICY "boq_revisions_owner_insert" ON boq_quote_revisions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE INDEX IF NOT EXISTS boq_quote_revisions_quote_idx
  ON boq_quote_revisions (quote_id, version);

COMMENT ON TABLE boq_quote_revisions IS
  'Append-only revision history for BOQ quotes. Each row is the exact snapshot of items, totals and rates that produced that version.';

-- Version stamp on the parent quote
ALTER TABLE boq_quotes ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 1;

-- No silent single-market currency default (was NGN)
ALTER TABLE boq_quotes ALTER COLUMN currency SET DEFAULT 'XXX';
