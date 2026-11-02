-- =========================================================
-- Warranty & Dispute Engine (Future Engine 14)
-- =========================================================
-- Purpose: snapshot the exact configuration behind every
-- estimate so any later claim or dispute can be replayed
-- deterministically. A warranty certificate freezes:
--   * the estimate's inputs, calculated quantities, and
--     per-line price snapshots (estimate_snapshot jsonb)
--   * a deterministic config_hash so tampering is detectable
--   * the warranty period that was configured AT ISSUE TIME
--     (warranty_months is copied onto the record — the admin
--     can change the rule later without rewriting history)
-- The engine also replays the stored line math
-- (quantity x snapshot price) against the stored totals and
-- reports any mismatch as a dispute flag — never a repair.
-- =========================================================

CREATE TABLE IF NOT EXISTS warranty_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  estimate_id uuid NOT NULL REFERENCES estimation_estimates (id) ON DELETE CASCADE,
  certificate_ref text NOT NULL UNIQUE,
  currency text NOT NULL DEFAULT 'NGN',
  estimate_snapshot jsonb NOT NULL,
  config_hash text NOT NULL,
  warranty_months integer NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'expired', 'disputed', 'void')),
  dispute_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS warranty_records_estimate_id_idx ON warranty_records (estimate_id);
CREATE INDEX IF NOT EXISTS warranty_records_user_id_idx ON warranty_records (user_id);

ALTER TABLE warranty_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranty_records FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "warranty_records_owner_read" ON warranty_records;
CREATE POLICY "warranty_records_owner_read" ON warranty_records
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "warranty_records_owner_write" ON warranty_records;
CREATE POLICY "warranty_records_owner_write" ON warranty_records
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP TRIGGER IF EXISTS "warranty_records_set_updated_at" ON warranty_records;
CREATE TRIGGER "warranty_records_set_updated_at"
  BEFORE UPDATE ON warranty_records
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE warranty_records IS 'Warranty & Dispute Engine: frozen, hash-verified configuration snapshots behind issued warranty certificates. Replays are deterministic; mismatches are flagged, never repaired.';

-- Admin-editable rules (Estimation Config -> Calc Rules)
INSERT INTO estimation_calc_rules (rule_key, calculator_type, rule_value, rule_status, description, is_active)
VALUES
  ('warranty_months', 'warranty',
   '{"value": 12}'::jsonb, 'verified_frelux',
   'Default warranty period in months applied when a certificate is issued. Copied onto the record at issue time so later rule changes never rewrite history.', true),
  ('rounding_decimals', 'warranty',
   '{"value": 2}'::jsonb, 'verified_frelux',
   'Decimal places for replayed line totals in dispute verification.', true)
ON CONFLICT (rule_key, calculator_type) DO NOTHING;
