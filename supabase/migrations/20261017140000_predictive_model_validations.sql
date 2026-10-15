-- =========================================================
-- Engine #3 "Predictive analytics & AI" milestone 4 (2026-10-15):
-- safety outputs decision-support only + independent-validation gate.
--
-- predictive_model_validations holds INDEPENDENT validation records
-- for predictive models (starting with the safety-risk model).
-- The gate is structural: the application itself can NEVER
-- self-certify — INSERT/UPDATE/DELETE are admin-only (RLS), so a
-- validation record can only be created by an administrator
-- recording an external/independent review. Users read the status.
--
-- Until a validation record exists for a model scope, every
-- safety output renders as DECISION SUPPORT ONLY with the fixed
-- pending-validation disclosure. Nothing in the app can flip
-- that label by writing to this table as a normal user.
-- =========================================================

CREATE TABLE IF NOT EXISTS public.predictive_model_validations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_scope      text NOT NULL,
  method           text NOT NULL,
  validator_name   text NOT NULL,
  validated_on     date NOT NULL,
  scope_summary    text NOT NULL,
  limitations      text NOT NULL,
  created_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CHECK (model_scope IN ('safety_risk', 'schedule_delay', 'cost_overrun'))
);

ALTER TABLE public.predictive_model_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictive_model_validations FORCE ROW LEVEL SECURITY;

-- Everyone authenticated may READ the validation status (the
-- disclosure depends on it); only admins may write.
DROP POLICY IF EXISTS "predictive_model_validations_read" ON public.predictive_model_validations;
CREATE POLICY "predictive_model_validations_read" ON public.predictive_model_validations
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "predictive_model_validations_admin_write" ON public.predictive_model_validations;
CREATE POLICY "predictive_model_validations_admin_write" ON public.predictive_model_validations
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

COMMENT ON TABLE public.predictive_model_validations IS
  'Independent validation records for engine-3 predictive models. Writes are admin-only by RLS: the app cannot self-certify. Absence of a safety_risk record keeps all safety outputs in decision-support-only mode with the pending-validation disclosure.';
