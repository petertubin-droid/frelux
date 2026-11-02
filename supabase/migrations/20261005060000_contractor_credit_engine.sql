-- =========================================================
-- Contractor Credit-Score Engine (Future Engine 13 —
-- verified job history as a trust signal)
-- =========================================================
-- Computes a deterministic 0–100 trust score for a contractor
-- from admin-verified job statistics, so clients and lenders
-- can check a contractor's record. Deterministic math:
--
--   reliability_pct = on_time_jobs / verified_jobs × 100
--   accuracy_pct    = 100 − avg_estimate_error_pct
--   volume_pct      = min(verified_jobs / jobs_reference, 1) × 100
--   base_score      = on_time_w × reliability + accuracy_w × accuracy
--                     + volume_w × volume        (weights sum ≤ 1)
--   penalty         = min(disputes × dispute_penalty, base_score)
--   score           = base_score − penalty       (0–100)
--
-- Band: Excellent ≥ excellent_threshold, Strong ≥ strong_threshold,
-- otherwise Building.
--
-- Philosophy (unchanged): stats are admin-entered from verifiable
-- job records (each profile needs a verification reference). The
-- engine REFUSES to score a contractor with zero verified jobs —
-- an unverified history is "insufficient history", never a zero.
-- =========================================================

-- ─────────────────────────────────────────────
-- 1. contractor_credit_profiles
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contractor_credit_profiles (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_name      text NOT NULL,
  registration_number  text,                        -- CAC / guild registration, for lookup
  verified_jobs        integer NOT NULL CHECK (verified_jobs >= 0),
  on_time_jobs         integer NOT NULL CHECK (on_time_jobs >= 0),
  dispute_count        integer NOT NULL CHECK (dispute_count >= 0),
  avg_estimate_error_pct numeric NOT NULL CHECK (avg_estimate_error_pct >= 0 AND avg_estimate_error_pct <= 100),
  description          text,
  verification_reference text NOT NULL,             -- audited job records, warranty hashes, lender file
  effective_date       date NOT NULL DEFAULT CURRENT_DATE,
  is_active            boolean NOT NULL DEFAULT true,
  sort_order           integer NOT NULL DEFAULT 0,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contractor_credit_on_time_within_verified
    CHECK (on_time_jobs <= verified_jobs)
);

-- One active profile per contractor registration
CREATE UNIQUE INDEX IF NOT EXISTS contractor_credit_profiles_name_active_uniq
  ON contractor_credit_profiles (contractor_name)
  WHERE is_active = true;

ALTER TABLE contractor_credit_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_credit_profiles FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contractor_credit_profiles_public_read" ON contractor_credit_profiles;
CREATE POLICY "contractor_credit_profiles_public_read" ON contractor_credit_profiles
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "contractor_credit_profiles_admin_write" ON contractor_credit_profiles;
CREATE POLICY "contractor_credit_profiles_admin_write" ON contractor_credit_profiles
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS "contractor_credit_profiles_set_updated_at" ON contractor_credit_profiles;
CREATE TRIGGER "contractor_credit_profiles_set_updated_at"
  BEFORE UPDATE ON contractor_credit_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE contractor_credit_profiles IS 'Admin-verified contractor job statistics backing the Credit-Score Engine. Every profile needs a verification reference (audited job records, warranty certificate hashes). The engine refuses to score zero verified jobs — insufficient history is never a zero score.';

-- ─────────────────────────────────────────────
-- 2. Engine calc rules (admin-editable via
--    Admin → Estimation Config → Calc Rules)
-- ─────────────────────────────────────────────
INSERT INTO estimation_calc_rules (rule_key, calculator_type, rule_value, rule_status, description, is_active)
VALUES
  ('on_time_weight', 'credit_score',
   '{"value": 0.35}'::jsonb, 'verified_frelux',
   'Weight of the on-time reliability component in the credit score. All component weights must sum to 1 or less.', true),
  ('accuracy_weight', 'credit_score',
   '{"value": 0.35}'::jsonb, 'verified_frelux',
   'Weight of the estimate-accuracy component (100 minus average estimate error) in the credit score.', true),
  ('volume_weight', 'credit_score',
   '{"value": 0.2}'::jsonb, 'verified_frelux',
   'Weight of the verified-jobs volume component in the credit score.', true),
  ('verified_jobs_reference', 'credit_score',
   '{"value": 50}'::jsonb, 'verified_frelux',
   'Number of verified jobs that counts as a full volume component (a contractor with this many verified jobs gets the full volume weight).', true),
  ('dispute_penalty_points', 'credit_score',
   '{"value": 10}'::jsonb, 'verified_frelux',
   'Points deducted per recorded dispute, capped at the base score so the score never goes below zero.', true),
  ('strong_threshold', 'credit_score',
   '{"value": 70}'::jsonb, 'verified_frelux',
   'Score at or above which a contractor is rated Strong.', true),
  ('excellent_threshold', 'credit_score',
   '{"value": 90}'::jsonb, 'verified_frelux',
   'Score at or above which a contractor is rated Excellent.', true),
  ('rounding_decimals', 'credit_score',
   '{"value": 1}'::jsonb, 'verified_frelux',
   'Decimal places for the reported score.', true)
ON CONFLICT (rule_key, calculator_type) DO NOTHING;

-- No seed profiles. Contractor stats are admin-entered from
-- verifiable job records — never guessed.
