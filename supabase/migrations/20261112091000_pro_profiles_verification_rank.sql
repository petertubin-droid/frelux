-- =========================================================
-- Pro Connect directory ranking.
--
-- searchProfessionals sorted with .order("verification_status",
-- { ascending: false }) on the assumption that the reversed
-- alphabet reads verified > pending > unverified. It does not:
-- descending gives verified > unverified > suspended > pending,
-- so an unverified profile outranks a pending application.
-- Ranking is a business rule, so it belongs in the database as a
-- generated column the query can order on directly (and index),
-- not in a client-side re-sort that would only rank the page you
-- happen to be reading.
-- =========================================================

ALTER TABLE public.pro_profiles
  ADD COLUMN IF NOT EXISTS verification_rank integer
  GENERATED ALWAYS AS (
    CASE verification_status
      WHEN 'verified' THEN 3
      WHEN 'pending' THEN 2
      WHEN 'suspended' THEN 1
      ELSE 0
    END
  ) STORED;

COMMENT ON COLUMN public.pro_profiles.verification_rank IS
  'Directory ordering: verified 3 > pending 2 > suspended 1 > unverified 0. Order by this, never by verification_status text.';

CREATE INDEX IF NOT EXISTS idx_pro_profiles_verification_rank
  ON public.pro_profiles (verification_rank DESC, rating_avg DESC);
