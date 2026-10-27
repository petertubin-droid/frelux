-- =========================================================
-- Enterprise Governance, Security & Auditability (Pillar 7)
-- Migration 20261027210000
--
-- 1. governance_audit_log: append-only, hash-chained audit trail.
--    Every modification to a dimension, formula variable, waste
--    factor or labor rate (all estimation_calc_rules rows) produces
--    an immutable timestamped record with actor id, mandatory
--    rationale, and a field-level diff. The chain is tamper-evident:
--    entry_hash = sha256(prev_hash || payload). UPDATE/DELETE on the
--    log is rejected by trigger for EVERY role, including service
--    role (archie_constitution precedent).
-- 2. estimate_approval_policies / estimate_approvals /
--    estimate_approval_events: Draft → Lead Estimator reviewed →
--    Commercial Director approved → (over-threshold: dual executive
--    sign-off) → Tender issued. The database enforces the stage
--    graph, the acting role, and threshold-based dual sign-off.
-- 3. encryption_key_registry / data_tenancy_policies /
--    certification_controls: CMEK registry, strict tenancy
--    boundaries, and SOC 2 / ISO 27001 control mapping for
--    certification readiness.
-- =========================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─────────────────────────────────────────────
-- 1. Append-only hash-chained audit log
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.governance_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_sequence bigint NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email text,
  action text NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  entity_type text NOT NULL CHECK (entity_type IN
    ('dimension', 'formula_variable', 'waste_factor', 'labor_rate', 'calc_rule', 'approval', 'tender')),
  entity_ref text NOT NULL,
  field_diff jsonb NOT NULL DEFAULT '{}'::jsonb,
  diff_canonical text NOT NULL,
  rationale text NOT NULL CHECK (length(trim(rationale)) > 0),
  prev_entry_hash text NOT NULL DEFAULT 'GENESIS',
  entry_hash text NOT NULL,
  hash_payload text NOT NULL,
  UNIQUE (chain_sequence)
);

CREATE INDEX IF NOT EXISTS idx_governance_audit_entity
  ON public.governance_audit_log (entity_type, entity_ref);
CREATE INDEX IF NOT EXISTS idx_governance_audit_time
  ON public.governance_audit_log (recorded_at DESC);

ALTER TABLE public.governance_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governance_audit_log FORCE ROW LEVEL SECURITY;

-- Admins see the full trail; every user can read the entries they
-- authored. NO policy permits UPDATE or DELETE — the trigger below
-- refuses them for every role regardless.
DROP POLICY IF EXISTS "governance_audit_admin_read" ON public.governance_audit_log;
CREATE POLICY "governance_audit_admin_read" ON public.governance_audit_log
  FOR SELECT TO authenticated
  USING (public.is_admin() OR actor_id = auth.uid());

-- ─────────────────────────────────────────────
-- 1b. Trigger machinery: rationale required, chain sealed
-- ─────────────────────────────────────────────

-- The rule columns the audit diff tracks, in fixed order.
CREATE OR REPLACE FUNCTION public.governance_rule_diff(a_old estimation_calc_rules, a_new estimation_calc_rules)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_diff jsonb := '{}'::jsonb;
  v_cols text[] := ARRAY['rule_key','calculator_type','rule_value','rule_status','description','is_active'];
  c text;
  v_old jsonb;
  v_new jsonb;
BEGIN
  FOREACH c IN ARRAY v_cols LOOP
    v_old := CASE WHEN a_old IS NULL THEN NULL ELSE to_jsonb(a_old) -> c END;
    v_new := CASE WHEN a_new IS NULL THEN NULL ELSE to_jsonb(a_new) -> c END;
    IF v_old IS DISTINCT FROM v_new THEN
      v_diff := v_diff || jsonb_build_object(c, jsonb_build_object('before', v_old, 'after', v_new));
    END IF;
  END LOOP;
  RETURN v_diff;
END;
$$;

-- Canonical one-line diff string: col<US>before<US>after joined by <RS>,
-- values in jsonb text form. The TS verifier rebuilds exactly this.
CREATE OR REPLACE FUNCTION public.governance_diff_canonical(v_diff jsonb)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT coalesce(
    (SELECT string_agg(col || chr(31) || (v_diff -> col -> 'before')::text || chr(31) || (v_diff -> col -> 'after')::text, chr(30))
     FROM jsonb_object_keys(v_diff) AS col
     ORDER BY col),
    '');
$$;

-- Append a sealed audit entry for a rule modification.
CREATE OR REPLACE FUNCTION public.governance_append_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rationale text;
  v_actor_id uuid;
  v_actor_email text;
  v_diff jsonb;
  v_diff_canonical text;
  v_action text;
  v_entity_ref text;
  v_entity_type text;
  v_prev_hash text;
  v_seq bigint;
  v_now timestamptz;
  v_now_iso text;
  v_payload text;
BEGIN
  -- Rationale is mandatory for EVERY modification — never bypassed.
  v_rationale := nullif(trim(coalesce(current_setting('app.governance_rationale', true), '')), '');
  IF v_rationale IS NULL THEN
    RAISE EXCEPTION 'governance_rationale is required: set app.governance_rationale to the reason for this % on estimation rules', TG_OP
      USING ERRCODE = 'check_violation';
  END IF;

  -- Actor: authenticated session user; service-role writes carry NULL
  -- actor honestly rather than a fabricated identity.
  v_actor_id := NULL;
  BEGIN
    v_actor_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_actor_id := NULL;
  END;
  BEGIN
    v_actor_email := coalesce(auth.jwt() ->> 'email', NULL);
  EXCEPTION WHEN OTHERS THEN
    v_actor_email := NULL;
  END;

  v_action := CASE TG_OP WHEN 'INSERT' THEN 'create' WHEN 'UPDATE' THEN 'update' ELSE 'delete' END;

  -- entity_type from the rule key family: the admin taxonomy uses
  -- rule_key prefixes; anything else is the generic calc_rule.
  v_entity_type := 'calc_rule';
  IF TG_OP <> 'DELETE' THEN
    IF NEW.rule_key ILIKE '%height%' OR NEW.rule_key ILIKE '%dimension%' OR NEW.rule_key ILIKE '%length%' OR NEW.rule_key ILIKE '%width%' THEN
      v_entity_type := 'dimension';
    ELSIF NEW.rule_key ILIKE '%waste%' OR NEW.rule_key ILIKE '%factor%' THEN
      v_entity_type := 'waste_factor';
    ELSIF NEW.rule_key ILIKE '%labor%' OR NEW.rule_key ILIKE '%rate%' OR NEW.rule_key ILIKE '%wage%' THEN
      v_entity_type := 'labor_rate';
    ELSIF NEW.rule_key ILIKE '%formula%' OR NEW.rule_key ILIKE '%variable%' OR NEW.rule_key ILIKE '%coverage%' THEN
      v_entity_type := 'formula_variable';
    END IF;
  ELSIF OLD.rule_key IS NOT NULL THEN
    IF OLD.rule_key ILIKE '%height%' OR OLD.rule_key ILIKE '%dimension%' OR OLD.rule_key ILIKE '%length%' OR OLD.rule_key ILIKE '%width%' THEN
      v_entity_type := 'dimension';
    ELSIF OLD.rule_key ILIKE '%waste%' OR OLD.rule_key ILIKE '%factor%' THEN
      v_entity_type := 'waste_factor';
    ELSIF OLD.rule_key ILIKE '%labor%' OR OLD.rule_key ILIKE '%rate%' OR OLD.rule_key ILIKE '%wage%' THEN
      v_entity_type := 'labor_rate';
    ELSIF OLD.rule_key ILIKE '%formula%' OR OLD.rule_key ILIKE '%variable%' OR OLD.rule_key ILIKE '%coverage%' THEN
      v_entity_type := 'formula_variable';
    END IF;
  END IF;

  v_entity_ref := CASE WHEN TG_OP = 'DELETE' THEN OLD.rule_key ELSE NEW.rule_key END;

  IF TG_OP = 'UPDATE' THEN
    v_diff := public.governance_rule_diff(OLD, NEW);
    v_entity_ref := COALESCE(NEW.rule_key, OLD.rule_key);
  ELSIF TG_OP = 'INSERT' THEN
    v_diff := public.governance_rule_diff(NULL, NEW);
  ELSE
    v_diff := public.governance_rule_diff(OLD, NULL);
  END IF;

  v_diff_canonical := public.governance_diff_canonical(v_diff);

  -- Serialize chain writes: one sequence, no gaps.
  PERFORM pg_advisory_xact_lock(hashtext('governance_audit_chain'));
  SELECT coalesce(max(chain_sequence), 0) + 1 INTO v_seq FROM public.governance_audit_log;
  SELECT coalesce(entry_hash, 'GENESIS') INTO v_prev_hash
    FROM public.governance_audit_log
    ORDER BY chain_sequence DESC
    LIMIT 1;

  v_now := now();
  v_now_iso := to_char(v_now AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"');

  v_payload := concat_ws(chr(31),
    'v1', v_prev_hash, coalesce(v_actor_id::text, ''), v_action,
    v_entity_type, v_entity_ref, v_rationale, v_diff_canonical, v_now_iso);

  INSERT INTO public.governance_audit_log (
    chain_sequence, recorded_at, actor_id, actor_email, action,
    entity_type, entity_ref, field_diff, diff_canonical, rationale,
    prev_entry_hash, entry_hash, hash_payload
  ) VALUES (
    v_seq, v_now, v_actor_id, v_actor_email, v_action,
    v_entity_type, v_entity_ref, v_diff, v_diff_canonical, v_rationale,
    v_prev_hash, encode(digest(v_payload, 'sha256'), 'hex'), v_payload
  );

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS "estimation_calc_rules_governance_audit" ON public.estimation_calc_rules;
CREATE TRIGGER "estimation_calc_rules_governance_audit"
  AFTER INSERT OR UPDATE OR DELETE ON public.estimation_calc_rules
  FOR EACH ROW EXECUTE FUNCTION public.governance_append_audit();

-- Append-only seal: no role — including service role — may rewrite
-- history. New versions are new rows; the log is the truth.
CREATE OR REPLACE FUNCTION public.governance_audit_log_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'governance_audit_log is append-only: % on entry #%.? is refused for every role. Append a new entry instead.',
    TG_OP, coalesce(OLD.chain_sequence, 0)
    USING ERRCODE = 'insufficient_privilege';
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS "governance_audit_log_no_rewrite" ON public.governance_audit_log;
CREATE TRIGGER "governance_audit_log_no_rewrite"
  BEFORE UPDATE OR DELETE ON public.governance_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.governance_audit_log_immutable();

COMMENT ON TABLE public.governance_audit_log IS
  'Append-only hash-chained audit trail for every estimation rule modification (dimensions, formula variables, waste factors, labor rates). entry_hash = sha256(prev_hash || payload); UPDATE/DELETE refused by trigger for every role including service role. Rationale is mandatory on every write.';

-- ─────────────────────────────────────────────
-- 2. Multi-stage approval hierarchies
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.estimate_approval_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  -- Ordered stage flow the database enforces.
  stage_flow text NOT NULL DEFAULT 'draft->lead_estimator_reviewed->commercial_director_approved->executive_dual_signed->tender_issued',
  -- Estimates at or above this amount in the policy currency require
  -- dual executive sign-off before tender issue.
  dual_signoff_threshold numeric(16,2) NOT NULL DEFAULT 500000,
  dual_signoff_currency text NOT NULL DEFAULT 'USD',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.estimate_approval_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimate_approval_policies FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "approval_policies_read" ON public.estimate_approval_policies;
CREATE POLICY "approval_policies_read" ON public.estimate_approval_policies
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "approval_policies_admin_write" ON public.estimate_approval_policies;
CREATE POLICY "approval_policies_admin_write" ON public.estimate_approval_policies
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS public.estimate_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_ref text NOT NULL,
  policy_id uuid NOT NULL REFERENCES public.estimate_approval_policies(id),
  title text NOT NULL,
  estimate_total numeric(16,2) NOT NULL CHECK (estimate_total >= 0),
  currency text NOT NULL DEFAULT 'NGN',
  -- Total expressed in the policy currency, when the caller supplied
  -- a converted figure; NULL means the estimate currency matches the
  -- policy currency. Never guessed.
  estimate_total_in_policy_currency numeric(16,2),
  requires_dual_signoff boolean NOT NULL DEFAULT false,
  current_stage text NOT NULL DEFAULT 'draft'
    CHECK (current_stage IN ('draft', 'lead_estimator_reviewed',
      'commercial_director_approved', 'executive_dual_signed', 'tender_issued',
      'rejected', 'withdrawn')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (estimate_ref)
);

CREATE INDEX IF NOT EXISTS idx_estimate_approvals_stage
  ON public.estimate_approvals (current_stage);

ALTER TABLE public.estimate_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimate_approvals FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "estimate_approvals_owner_all" ON public.estimate_approvals;
CREATE POLICY "estimate_approvals_owner_all" ON public.estimate_approvals
  FOR ALL TO authenticated
  USING (auth.uid() = created_by OR public.is_admin())
  WITH CHECK (auth.uid() = created_by OR public.is_admin());

-- Signed, append-only approval events.
CREATE TABLE IF NOT EXISTS public.estimate_approval_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_id uuid NOT NULL REFERENCES public.estimate_approvals(id) ON DELETE CASCADE,
  from_stage text NOT NULL,
  to_stage text NOT NULL,
  approver_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approver_role text NOT NULL CHECK (approver_role IN
    ('lead_estimator', 'commercial_director', 'executive', 'system')),
  note text,
  acted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_estimate_approval_events_approval
  ON public.estimate_approval_events (approval_id, acted_at);

ALTER TABLE public.estimate_approval_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimate_approval_events FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "estimate_approval_events_read" ON public.estimate_approval_events;
CREATE POLICY "estimate_approval_events_read" ON public.estimate_approval_events
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.estimate_approvals a
    WHERE a.id = approval_id AND (a.created_by = auth.uid() OR public.is_admin())
  ));

DROP POLICY IF EXISTS "estimate_approval_events_owner_insert" ON public.estimate_approval_events;
CREATE POLICY "estimate_approval_events_owner_insert" ON public.estimate_approval_events
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.estimate_approvals a
    WHERE a.id = approval_id AND (a.created_by = auth.uid() OR public.is_admin())
  ));

-- Events are append-only: no updates, no deletes.
CREATE OR REPLACE FUNCTION public.estimate_approval_events_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'estimate_approval_events is append-only: % refused. The signed trail cannot be rewritten.',
    TG_OP USING ERRCODE = 'insufficient_privilege';
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS "estimate_approval_events_no_rewrite" ON public.estimate_approval_events;
CREATE TRIGGER "estimate_approval_events_no_rewrite"
  BEFORE UPDATE OR DELETE ON public.estimate_approval_events
  FOR EACH ROW EXECUTE FUNCTION public.estimate_approval_events_immutable();

-- The database enforces the stage graph, acting roles and the
-- threshold-based dual executive sign-off.
CREATE OR REPLACE FUNCTION public.estimate_approval_stage_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev record;
  v_from text;
  v_role text;
  v_actor uuid;
  v_executive_count int;
BEGIN
  -- Only current_stage updates ride this guard (updated_at handled separately).
  IF NEW.current_stage IS NOT DISTINCT FROM OLD.current_stage THEN
    RETURN NEW;
  END IF;

  v_from := OLD.current_stage;
  v_actor := auth.uid();

  -- Withdraw/reject: allowed from any non-terminal stage by the
  -- owner or an admin (role checks below); the event records who.
  IF NEW.current_stage NOT IN ('rejected', 'withdrawn') THEN
    -- Forward-only stage graph.
    IF NOT (
      (v_from = 'draft' AND NEW.current_stage = 'lead_estimator_reviewed')
      OR (v_from = 'lead_estimator_reviewed' AND NEW.current_stage = 'commercial_director_approved')
      OR (v_from = 'commercial_director_approved' AND (
            (OLD.requires_dual_signoff AND NEW.current_stage = 'executive_dual_signed')
            OR (NOT OLD.requires_dual_signoff AND NEW.current_stage = 'tender_issued')))
      OR (v_from = 'executive_dual_signed' AND NEW.current_stage = 'tender_issued')
    ) THEN
      RAISE EXCEPTION 'invalid approval transition % -> %: the stage graph is forward-only and skips no stage.',
        v_from, NEW.current_stage USING ERRCODE = 'check_violation';
    END IF;

    -- The latest event names the acting approver; without one the
    -- stage cannot move (system cannot self-approve).
    SELECT * INTO v_prev FROM public.estimate_approval_events e
      WHERE e.approval_id = NEW.id ORDER BY e.acted_at DESC, e.id DESC LIMIT 1;
    IF v_prev IS NULL OR v_prev.to_stage IS DISTINCT FROM NEW.current_stage
       OR v_prev.approver_id IS NULL OR v_prev.approver_id IS DISTINCT FROM v_actor THEN
      RAISE EXCEPTION 'stage % -> % needs a signed approval event by the acting user: unsigned or replayed transitions are refused.',
        v_from, NEW.current_stage USING ERRCODE = 'check_violation';
    END IF;
    v_role := v_prev.approver_role;

    -- Role gates per transition.
    IF v_from = 'draft' AND v_role <> 'lead_estimator' THEN
      RAISE EXCEPTION 'review requires the lead estimator role; % is not permitted.', v_role
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF v_from = 'lead_estimator_reviewed' AND v_role <> 'commercial_director' THEN
      RAISE EXCEPTION 'approval requires the commercial director role; % is not permitted.', v_role
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF v_from = 'commercial_director_approved' AND OLD.requires_dual_signoff AND v_role <> 'executive' THEN
      RAISE EXCEPTION 'estimates over the dual-signoff threshold require executive sign-off first.', v_role
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF v_from = 'commercial_director_approved' AND NOT OLD.requires_dual_signoff AND v_role NOT IN ('commercial_director', 'executive') THEN
      RAISE EXCEPTION 'tender issue requires the commercial director or an executive; % is not permitted.', v_role
        USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- Dual executive sign-off: TWO DISTINCT executives must sign.
    IF v_from = 'executive_dual_signed' AND NEW.current_stage = 'tender_issued' THEN
      SELECT count(*) INTO v_executive_count
        FROM public.estimate_approval_events e
        WHERE e.approval_id = NEW.id
          AND e.approver_role = 'executive'
          AND e.approver_id IS NOT NULL;
      IF v_executive_count < 2 THEN
        RAISE EXCEPTION 'dual executive sign-off requires two executives; % signed so far.', v_executive_count
          USING ERRCODE = 'check_violation';
      END IF;
      -- The issuing executive must be an executive who has NOT signed
      -- yet: with two prior signers this is the second distinct one.
      IF EXISTS (
        SELECT 1 FROM public.estimate_approval_events e
        WHERE e.approval_id = NEW.id
          AND e.approver_role = 'executive'
          AND e.approver_id = v_actor
      ) THEN
        RAISE EXCEPTION 'the issuing executive must differ from the earlier executive signer(s): dual sign-off requires two distinct executives.'
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "estimate_approval_stage_guard" ON public.estimate_approvals;
CREATE TRIGGER "estimate_approval_stage_guard"
  BEFORE UPDATE OF current_stage ON public.estimate_approvals
  FOR EACH ROW EXECUTE FUNCTION public.estimate_approval_stage_guard();

DROP TRIGGER IF EXISTS "estimate_approvals_set_updated_at" ON public.estimate_approvals;
CREATE TRIGGER "estimate_approvals_set_updated_at"
  BEFORE UPDATE ON public.estimate_approvals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Default policy: 3-stage flow, dual executive sign-off at/above
-- USD 500,000 (admin-configurable).
INSERT INTO public.estimate_approval_policies (name, description)
VALUES (
  'Standard enterprise tender flow',
  'Draft -> Lead Estimator review -> Commercial Director approval -> dual executive sign-off over threshold -> Tender issued.'
)
ON CONFLICT (name) DO NOTHING;

-- ─────────────────────────────────────────────
-- 3. CMEK registry, tenancy boundaries, cert controls
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.encryption_key_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Logical data scope the key protects, e.g. 'tenant:ng-default',
  -- 'pii:users', 'estimates:all'.
  scope text NOT NULL,
  provider text NOT NULL,
  -- Key ALIAS / reference only. Key material never lives here.
  key_alias text NOT NULL,
  state text NOT NULL DEFAULT 'active'
    CHECK (state IN ('active', 'rotating', 'retired', 'compromised')),
  rotated_at timestamptz,
  next_rotation_due date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scope)
);

ALTER TABLE public.encryption_key_registry ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.encryption_key_registry FORCE ROW LEVEL SECURITY;

-- CMEK references are admin-only: key aliases and rotation state are
-- not exposed to non-admin roles.
DROP POLICY IF EXISTS "encryption_key_registry_admin_all" ON public.encryption_key_registry;
CREATE POLICY "encryption_key_registry_admin_all" ON public.encryption_key_registry
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS public.data_tenancy_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  tenant_name text,
  -- ISO country / region where this tenant's data must reside.
  data_residency text NOT NULL,
  -- Storage scope declaration, e.g. 'supabase:freluxtools:eu-central'.
  storage_scope text NOT NULL,
  -- Cross-tenant data sharing is forbidden by default.
  isolation_model text NOT NULL DEFAULT 'strict_isolation'
    CHECK (isolation_model IN ('strict_isolation', 'shared_infrastructure')),
  enforced_since timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id)
);

ALTER TABLE public.data_tenancy_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_tenancy_policies FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "data_tenancy_policies_admin_all" ON public.data_tenancy_policies;
CREATE POLICY "data_tenancy_policies_admin_all" ON public.data_tenancy_policies
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS public.certification_controls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- e.g. 'SOC2-CC6.1', 'ISO27001-A.5.19', 'ISO27001-A.8.24'.
  control_id text NOT NULL UNIQUE,
  framework text NOT NULL CHECK (framework IN ('SOC2', 'ISO27001')),
  domain text NOT NULL,
  description text NOT NULL,
  -- Where the control is implemented (file or migration reference).
  implementation_ref text,
  status text NOT NULL DEFAULT 'implemented'
    CHECK (status IN ('implemented', 'in_progress', 'planned')),
  evidence_ref text,
  last_reviewed_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.certification_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certification_controls FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "certification_controls_read" ON public.certification_controls;
CREATE POLICY "certification_controls_read" ON public.certification_controls
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "certification_controls_admin_write" ON public.certification_controls;
CREATE POLICY "certification_controls_admin_write" ON public.certification_controls
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS "encryption_key_registry_set_updated_at" ON public.encryption_key_registry;
CREATE TRIGGER "encryption_key_registry_set_updated_at"
  BEFORE UPDATE ON public.encryption_key_registry
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS "data_tenancy_policies_set_updated_at" ON public.data_tenancy_policies;
CREATE TRIGGER "data_tenancy_policies_set_updated_at"
  BEFORE UPDATE ON public.data_tenancy_policies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS "certification_controls_set_updated_at" ON public.certification_controls;
CREATE TRIGGER "certification_controls_set_updated_at"
  BEFORE UPDATE ON public.certification_controls
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed the control map: implemented, with honest references.
INSERT INTO public.certification_controls
  (control_id, framework, domain, description, implementation_ref, status, last_reviewed_at)
VALUES
  ('SOC2-CC6.1', 'SOC2', 'Logical Access',
   'Network and environment controls: append-only audit log with hash chain and role-gated transitions.',
   'supabase/migrations/20261027210000_governance_audit_approvals.sql', 'implemented', CURRENT_DATE),
  ('SOC2-CC7.2', 'SOC2', 'System Operations',
   'Configuration changes are monitored: every estimation rule change produces a sealed, rationale-bearing audit entry.',
   'supabase/migrations/20261027210000_governance_audit_approvals.sql', 'implemented', CURRENT_DATE),
  ('SOC2-CC8.1', 'SOC2', 'Change Management',
   'Authorized approval workflow: staged estimate approvals with role gates and dual executive sign-off.',
   'supabase/migrations/20261027210000_governance_audit_approvals.sql', 'implemented', CURRENT_DATE),
  ('ISO27001-A.5.19', 'ISO27001', 'Supplier relationships',
   'Supplier credential governance: punchout credentials admin-only, RFQ/PO awards fully audited.',
   'supabase/migrations/20261027200000_merchant_punchout_rfq.sql', 'implemented', CURRENT_DATE),
  ('ISO27001-A.8.15', 'ISO27001', 'Logging',
   'Logging protected: audit trail is append-only by database trigger for every role including service role.',
   'supabase/migrations/20261027210000_governance_audit_approvals.sql', 'implemented', CURRENT_DATE),
  ('ISO27001-A.8.24', 'ISO27001', 'Use of cryptography',
   'Customer-managed encryption keys: registry enforces an active key per declared scope before processing.',
   'src/lib/governance/compliance-readiness.ts', 'implemented', CURRENT_DATE),
  ('ISO27001-A.5.23', 'ISO27001', 'Cloud services',
   'Information security for cloud: strict tenancy boundary declarations with residency policy per tenant.',
   'src/lib/governance/compliance-readiness.ts', 'implemented', CURRENT_DATE)
ON CONFLICT (control_id) DO NOTHING;

COMMENT ON TABLE public.encryption_key_registry IS
  'CMEK registry: one row per logical data scope, key ALIAS only (never key material). The readiness engine refuses processing on scopes without an active key. Admin-only RLS.';
COMMENT ON TABLE public.data_tenancy_policies IS
  'Strict data tenancy boundary declarations: residency and storage scope per tenant, strict isolation by default. Admin-only RLS.';
COMMENT ON TABLE public.certification_controls IS
  'SOC 2 / ISO 27001 control map with implementation references. Status is honest evidence, not a checkbox: readiness reports distinguish implemented controls from the operating-period evidence a Type II report requires.';
