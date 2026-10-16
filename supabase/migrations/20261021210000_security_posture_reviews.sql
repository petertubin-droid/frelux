-- =====================================================================
-- Engine #12 (RBAC & clearance) M4: security_posture_reviews
--
-- Independent-review gate, same pattern as compliance_reviews,
-- predictive_model_validations and iot_safety_thresholds:
--  - platform admins write review records (is_admin() RLS policy)
--  - an APPROVED record REQUIRES reviewer name, review date and the
--    findings it rests on (no drive-by approvals)
--  - the app reads but can NEVER self-certify; zero approved rows =
--    everything is disclosed as "not independently reviewed"
--  - REJECTED records are surfaced as honest "found deficient" notes
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.security_posture_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The audited surface: e.g. 'database_rls', 'rpc_escalation',
  -- 'workspace_rbac', 'storage_policies', 'edge_functions', 'auth_flows'
  surface text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  -- What the reviewer actually examined and found (required to approve)
  findings text,
  reviewer_name text,
  reviewed_at timestamptz,
  -- Optional pointer to the report/evidence backing the review
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS security_posture_reviews_surface_key
  ON public.security_posture_reviews (surface);

ALTER TABLE public.security_posture_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_posture_reviews FORCE ROW LEVEL SECURITY;

-- Public read: the honest review state must be visible to any caller,
-- exactly like construction_standards and iot_safety_thresholds.
DROP POLICY IF EXISTS "security_posture_reviews_public_read" ON public.security_posture_reviews;
CREATE POLICY "security_posture_reviews_public_read"
  ON public.security_posture_reviews FOR SELECT
  TO anon, authenticated
  USING (true);

-- Admin-only writes: only a platform admin may record a review verdict.
DROP POLICY IF EXISTS "security_posture_reviews_admin_write" ON public.security_posture_reviews;
CREATE POLICY "security_posture_reviews_admin_write"
  ON public.security_posture_reviews FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- An approval is never valid without the reviewer, the date and the
-- findings it rests on. Rejected reviews must state why.
ALTER TABLE public.security_posture_reviews
  ADD CONSTRAINT security_posture_review_approval_requires_reviewer
  CHECK (
    status <> 'approved'
    OR (reviewer_name IS NOT NULL AND length(trim(reviewer_name)) > 0
        AND reviewed_at IS NOT NULL
        AND findings IS NOT NULL AND length(trim(findings)) > 0)
  );

ALTER TABLE public.security_posture_reviews
  ADD CONSTRAINT security_posture_review_rejection_requires_findings
  CHECK (
    status <> 'rejected'
    OR (findings IS NOT NULL AND length(trim(findings)) > 0)
  );

-- Engine #12 audit baseline: the 2026-10-21 internal audit is recorded
-- as PENDING independent review. The app reports it as unreviewed.
INSERT INTO public.security_posture_reviews (surface, status, findings)
VALUES
  ('database_rls', 'pending',
   'Internal audit 2026-10-21 (docs/rbac-threat-model.md): all public tables RLS-forced; migration 20261021100000; verification query returned 0 survivors.'),
  ('rpc_escalation', 'pending',
   'Internal audit 2026-10-21: promote_to_admin + seed_reward_catalogue client EXEC revoked; 4 admin RPCs hardened with auth.uid() caller guards; migration 20261021200000.'),
  ('workspace_rbac', 'pending',
   'Internal audit 2026-10-21: 8-role matrix mirrored and sync-tested; manager mutations gated client+server side; suspended/revoked members refused by status; audit rows on every mutation.')
ON CONFLICT (surface) DO NOTHING;

-- service_role needs explicit access on this project (known gap pattern)
GRANT SELECT ON public.security_posture_reviews TO service_role;
