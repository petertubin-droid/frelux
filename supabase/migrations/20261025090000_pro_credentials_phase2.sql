-- =========================================================
-- FRELUX PRO CREDENTIALS — PHASE 2: AUDITABLE CREDENTIAL
-- VERIFICATION (workforce credential verification, slice 1)
-- Date: 2026-10-25
--
-- Extends — does not rebuild — the Phase 26 pro_credentials
-- workflow per roadmap Phase 2:
--   1. Jurisdiction (country + subnational scope), issuer
--      registry identifier, credential class/scope, issued date,
--      evidence type/source, verification method/result/timestamp
--      and insurance/safety-training evidence columns.
--   2. Precise statuses added to verification_status. LEGACY
--      ROWS KEEP THEIR EXACT VALUE: 'unverified'/'pending'/
--      'verified'/'rejected'/'expired' are all still valid and
--      are NOT remapped. Legacy 'verified' is in particular NOT
--      promoted to verified_by_source (registry-verified):
--      the distinction is explicit in the new columns.
--   3. Append-only review/event history (pro_credential_events):
--      submissions, correction requests, verification attempts,
--      decisions, expiry, suspension, revocation, appeals. UPDATE
--      and DELETE are refused by trigger — the audit trail is
--      immutable. Status changes on pro_credentials are logged
--      automatically.
--   4. credential_verification_sources: jurisdiction-specific
--      verification-source configuration (permitted lookup type,
--      registry URL/API or manual review procedure, allowed
--      credential types, freshness expectations, escalation
--      owner). A DB gate refuses active rows missing any of it.
--   5. Owners can no longer mutate verification outcomes:
--      a trigger refuses non-admin changes to the protected
--      verification fields, closing the Phase 26 gap where the
--      owner UPDATE policy allowed changing verification_status.
--   6. The public view now exposes ONLY jurisdiction-scoped
--      status, method and last-checked date (never registration
--      identifiers, documents, or notes), distinguishing
--      document-reviewed from registry-verified.
-- =========================================================

-- ---------------------------------------------------------
-- 1. PRECISE STATUSES (legacy values preserved)
-- ---------------------------------------------------------
ALTER TABLE pro_credentials DROP CONSTRAINT IF EXISTS pro_credentials_verification_status_check;
ALTER TABLE pro_credentials
  ADD CONSTRAINT pro_credentials_verification_status_check
  CHECK (verification_status IN (
    -- legacy (kept verbatim; never remapped)
    'unverified', 'pending', 'verified', 'rejected', 'expired',
    -- phase 2 precise statuses
    'submitted',            -- created by the worker, awaiting review
    'pending_review',       -- under active review
    'verified_by_source',   -- confirmed against the issuing registry/authority
    'verified_by_reviewer', -- document reviewed by an accountable human reviewer
    'suspended',            -- temporarily inactive
    'revoked',              -- withdrawn by the authority/reviewer
    'unable_to_verify'      -- source unavailable or evidence inconclusive
  ));

-- ---------------------------------------------------------
-- 2. CREDENTIAL MODEL COLUMNS
-- ---------------------------------------------------------
ALTER TABLE pro_credentials
  ADD COLUMN IF NOT EXISTS country_code text,
  ADD COLUMN IF NOT EXISTS subnational_scope text,
  ADD COLUMN IF NOT EXISTS credential_class text
    CHECK (credential_class IS NULL OR credential_class IN (
      'trade_registration', 'professional_license', 'safety_training',
      'insurance', 'identification', 'other')),
  ADD COLUMN IF NOT EXISTS credential_scope text,
  ADD COLUMN IF NOT EXISTS issued_at date,
  ADD COLUMN IF NOT EXISTS registry_identifier text,
  ADD COLUMN IF NOT EXISTS registry_url text,
  ADD COLUMN IF NOT EXISTS evidence_type text
    CHECK (evidence_type IS NULL OR evidence_type IN (
      'registry_record', 'document_upload', 'third_party_api', 'human_review')),
  ADD COLUMN IF NOT EXISTS evidence_source text,
  ADD COLUMN IF NOT EXISTS verification_method text
    CHECK (verification_method IS NULL OR verification_method IN (
      'registry_lookup', 'manual_review', 'none')),
  ADD COLUMN IF NOT EXISTS verification_result text
    CHECK (verification_result IS NULL OR verification_result IN (
      'match', 'mismatch', 'not_found', 'error', 'inconclusive')),
  ADD COLUMN IF NOT EXISTS verification_checked_at timestamptz,
  -- separate insurance / safety-training evidence (where relevant)
  ADD COLUMN IF NOT EXISTS insurance_provider text,
  ADD COLUMN IF NOT EXISTS insurance_policy_ref text,
  ADD COLUMN IF NOT EXISTS insurance_expiry date,
  ADD COLUMN IF NOT EXISTS safety_training_type text,
  ADD COLUMN IF NOT EXISTS safety_training_expiry date;

COMMENT ON COLUMN pro_credentials.country_code IS 'ISO 3166-1 alpha-2 jurisdiction the credential is issued in; NULL on legacy rows.';
COMMENT ON COLUMN pro_credentials.subnational_scope IS 'State/province the credential is scoped to, when the credential is subnational.';
COMMENT ON COLUMN pro_credentials.registry_identifier IS 'Identifier of the issuing authority registry (e.g. COREN, CORBON), not a personal registration number.';
COMMENT ON COLUMN pro_credentials.verification_method IS 'registry_lookup = confirmed against the authority; manual_review = document reviewed by an accountable human; NULL on legacy rows.';
COMMENT ON COLUMN pro_credentials.insurance_policy_ref IS 'Policy reference; NEVER exposed on public surfaces.';

CREATE INDEX IF NOT EXISTS idx_pro_credentials_country ON pro_credentials(country_code);
CREATE INDEX IF NOT EXISTS idx_pro_credentials_class ON pro_credentials(credential_class);

-- ---------------------------------------------------------
-- 3. APPEND-ONLY EVENT HISTORY
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS pro_credential_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id uuid NOT NULL REFERENCES pro_credentials(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'submission', 'correction_requested', 'verification_attempt',
    'decision', 'expiry', 'suspension', 'revocation', 'appeal')),
  actor uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role text NOT NULL CHECK (actor_role IN ('worker', 'reviewer', 'admin', 'system')),
  method text,
  result text,
  reason text,
  notes_private text,
  metadata jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credential_events_credential ON pro_credential_events(credential_id);
CREATE INDEX IF NOT EXISTS idx_credential_events_type ON pro_credential_events(event_type);

ALTER TABLE pro_credential_events ENABLE ROW LEVEL SECURITY;

-- The profile owner can read the event history of their credentials
DROP POLICY IF EXISTS "read_own_credential_events" ON pro_credential_events;
CREATE POLICY "read_own_credential_events"
  ON pro_credential_events FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM pro_credentials c
    JOIN pro_profiles p ON p.id = c.profile_id
    WHERE c.id = pro_credential_events.credential_id AND p.user_id = auth.uid()
  ));

-- Admin can read the full audit trail
DROP POLICY IF EXISTS "admin_read_credential_events" ON pro_credential_events;
CREATE POLICY "admin_read_credential_events"
  ON pro_credential_events FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Workers append events (appeals, corrections) for their own credentials
DROP POLICY IF EXISTS "create_own_credential_events" ON pro_credential_events;
CREATE POLICY "create_own_credential_events"
  ON pro_credential_events FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM pro_credentials c
    JOIN pro_profiles p ON p.id = c.profile_id
    WHERE c.id = pro_credential_events.credential_id AND p.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "admin_create_credential_events" ON pro_credential_events;
CREATE POLICY "admin_create_credential_events"
  ON pro_credential_events FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Hard immutability: any UPDATE or DELETE raises, whoever the actor.
CREATE OR REPLACE FUNCTION pro_credential_events_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'pro_credential_events is append-only: event % cannot be altered', OLD.id;
END;
$$;

DROP TRIGGER IF EXISTS trg_credential_events_immutable ON pro_credential_events;
CREATE TRIGGER trg_credential_events_immutable
  BEFORE UPDATE OR DELETE ON pro_credential_events
  FOR EACH ROW EXECUTE FUNCTION pro_credential_events_immutable();

-- Automatic audit: every credential status change is logged by the
-- system, and owners cannot mutate verification outcomes.
CREATE OR REPLACE FUNCTION log_credential_status_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  is_admin_actor boolean;
  is_owner boolean;
BEGIN
  SELECT public.is_admin() INTO is_admin_actor;
  SELECT EXISTS (
    SELECT 1 FROM pro_profiles WHERE id = NEW.profile_id AND user_id = auth.uid()
  ) INTO is_owner;

  IF is_owner AND NOT COALESCE(is_admin_actor, false)
     AND (NEW.verification_status IS DISTINCT FROM OLD.verification_status
          OR NEW.verified_by IS DISTINCT FROM OLD.verified_by
          OR NEW.verified_at IS DISTINCT FROM OLD.verified_at
          OR NEW.verification_method IS DISTINCT FROM OLD.verification_method
          OR NEW.verification_result IS DISTINCT FROM OLD.verification_result
          OR NEW.verification_checked_at IS DISTINCT FROM OLD.verification_checked_at) THEN
    RAISE EXCEPTION 'Workers cannot change verification outcomes on their own credentials';
  END IF;

  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
    INSERT INTO pro_credential_events
      (credential_id, event_type, actor_role, reason, metadata)
    VALUES (
      NEW.id,
      CASE NEW.verification_status
        WHEN 'suspended' THEN 'suspension'
        WHEN 'revoked' THEN 'revocation'
        WHEN 'rejected' THEN 'decision'
        WHEN 'expired' THEN 'expiry'
        ELSE 'decision'
      END,
      CASE WHEN COALESCE(is_admin_actor, false) THEN 'admin'
           WHEN auth.uid() IS NULL THEN 'system'
           WHEN is_owner THEN 'worker'
           ELSE 'system' END,
      'Status changed from ' || COALESCE(OLD.verification_status, 'NULL') ||
        ' to ' || COALESCE(NEW.verification_status, 'NULL'),
      jsonb_build_object(
        'old_status', OLD.verification_status,
        'new_status', NEW.verification_status,
        'method', NEW.verification_method,
        'result', NEW.verification_result
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_credential_status ON pro_credentials;
CREATE TRIGGER trg_log_credential_status
  AFTER UPDATE ON pro_credentials
  FOR EACH ROW EXECUTE FUNCTION log_credential_status_change();

-- ---------------------------------------------------------
-- 4. JURISDICTION-SPECIFIC VERIFICATION SOURCES
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS credential_verification_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL,
  subnational_scope text,
  credential_class text NOT NULL,
  allowed_credential_types text[] NOT NULL DEFAULT '{}',
  lookup_type text NOT NULL CHECK (lookup_type IN (
    'registry_api', 'registry_manual_check', 'manual_review')),
  registry_name text,
  registry_url text,
  lookup_procedure text,
  freshness_days int CHECK (freshness_days IS NULL OR freshness_days > 0),
  escalation_owner text,
  escalation_contact text,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (country_code, subnational_scope, credential_class)
);

ALTER TABLE credential_verification_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_verification_sources" ON credential_verification_sources;
CREATE POLICY "admin_manage_verification_sources"
  ON credential_verification_sources FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "read_active_verification_sources" ON credential_verification_sources;
CREATE POLICY "read_active_verification_sources"
  ON credential_verification_sources FOR SELECT
  TO authenticated
  USING (is_active OR public.is_admin());

CREATE OR REPLACE FUNCTION credential_verification_source_gate()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_active THEN
    IF (NEW.lookup_type IN ('registry_api', 'registry_manual_check')
          AND COALESCE(NEW.registry_name, '') = '')
       OR (NEW.lookup_type IN ('registry_manual_check', 'manual_review')
          AND COALESCE(NEW.lookup_procedure, '') = '')
       OR COALESCE(NEW.escalation_owner, '') = ''
       OR COALESCE(NEW.escalation_contact, '') = ''
       OR NEW.freshness_days IS NULL THEN
      RAISE EXCEPTION 'Active credential verification sources require a named registry or review procedure, an escalation owner with contact, and a freshness expectation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_verification_source_gate ON credential_verification_sources;
CREATE TRIGGER trg_verification_source_gate
  BEFORE INSERT OR UPDATE ON credential_verification_sources
  FOR EACH ROW EXECUTE FUNCTION credential_verification_source_gate();

DROP TRIGGER IF EXISTS trg_verification_sources_updated ON credential_verification_sources;
CREATE TRIGGER trg_verification_sources_updated
  BEFORE UPDATE ON credential_verification_sources
  FOR EACH ROW EXECUTE FUNCTION update_pro_table_updated_at();

-- ---------------------------------------------------------
-- 5. PUBLIC VIEW — jurisdiction-scoped status only
-- ---------------------------------------------------------
-- Distinguishes document-reviewed from registry-verified and
-- exposes only jurisdiction-scoped status and last-checked date.
-- Never: registration numbers, document paths, policy refs, notes.
DROP VIEW IF EXISTS pro_credentials_public;
CREATE VIEW pro_credentials_public AS
SELECT
  c.id,
  c.profile_id,
  c.professional_body,
  c.credential_type,
  c.verification_status,
  -- explicit distinction for public surfaces; legacy 'verified' rows
  -- are never labeled registry-verified.
  CASE
    WHEN c.verification_status = 'verified_by_source' THEN 'registry_verified'
    WHEN c.verification_status = 'verified_by_reviewer' THEN 'document_reviewed'
    WHEN c.verification_status = 'verified' THEN 'document_reviewed'
    ELSE 'not_verified'
  END AS public_verification_label,
  c.country_code,
  c.subnational_scope,
  c.credential_class,
  c.expires_at,
  c.verified_at,
  c.verification_method,
  c.verification_checked_at,
  c.created_at
FROM pro_credentials c
WHERE c.verification_status IN
  ('verified_by_source', 'verified_by_reviewer', 'verified');

GRANT SELECT ON pro_credentials_public TO anon, authenticated;
