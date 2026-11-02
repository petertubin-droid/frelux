-- =========================================================
-- Engine #3 "Predictive analytics & AI" milestone 1 (2026-10-15):
-- outcome-label schema + historical project-outcome dataset.
--
-- project_outcomes holds completed-project records with the
-- deterministic OUTCOME LABELS (delay_days, cost_overrun_pct,
-- safety_incident_count) plus the covariates a back-test can
-- train on (market, type, finish quality, size, stories, dates,
-- budget/final amounts). Labels are DERIVED in the app from raw
-- facts (planned vs actual end; budget vs final), never typed in
-- by hand — the app computes and stores them together so the
-- back-test harness (M2) reads an honest, auditable dataset.
--
-- RLS: owner-scoped. The dataset is per-account; nothing is
-- inferred across accounts.
-- =========================================================

CREATE TABLE IF NOT EXISTS public.project_outcomes (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id            uuid REFERENCES public.contractor_projects(id) ON DELETE SET NULL,
  market_code           text NOT NULL,
  project_type          text NOT NULL,
  finish_quality        text,
  size_m2               numeric CHECK (size_m2 IS NULL OR size_m2 > 0),
  stories               integer CHECK (stories IS NULL OR stories >= 1),
  planned_start_date    date,
  planned_end_date      date,
  actual_end_date       date NOT NULL,
  budgeted_amount       numeric CHECK (budgeted_amount IS NULL OR budgeted_amount >= 0),
  budgeted_currency     text NOT NULL DEFAULT 'XXX',
  final_amount          numeric CHECK (final_amount IS NULL OR final_amount >= 0),
  delay_days            integer,
  cost_overrun_pct      numeric,
  safety_incident_count integer NOT NULL DEFAULT 0 CHECK (safety_incident_count >= 0),
  rfi_count             integer CHECK (rfi_count IS NULL OR rfi_count >= 0),
  weather_delay_days    integer CHECK (weather_delay_days IS NULL OR weather_delay_days >= 0),
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  CHECK (market_code IN ('NG','US','GB','CA','AU','DE','IN','GH','KE','ZA','JP','FR','BR','SA','AE','CN','ID','MX','KR','IT')),
  CHECK (budgeted_currency ~ '^[A-Z]{3}$'),
  CHECK (planned_end_date IS NULL OR actual_end_date IS NULL OR planned_end_date <= actual_end_date + 365)
);

CREATE INDEX IF NOT EXISTS idx_project_outcomes_user ON public.project_outcomes(user_id);
CREATE INDEX IF NOT EXISTS idx_project_outcomes_market ON public.project_outcomes(market_code);
CREATE INDEX IF NOT EXISTS idx_project_outcomes_actual_end ON public.project_outcomes(actual_end_date);

ALTER TABLE public.project_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_outcomes FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_outcomes_owner_all" ON public.project_outcomes;
CREATE POLICY "project_outcomes_owner_all" ON public.project_outcomes
  FOR ALL TO authenticated
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

COMMENT ON TABLE public.project_outcomes IS
  'Historical completed-project outcome dataset (engine-3 M1). Outcome labels delay_days / cost_overrun_pct are derived deterministically from raw facts by prepareProjectOutcome(); safety_incident_count is recorded. Feeds the M2 back-test harness; nothing here authorizes live prediction claims without the M3 data-quality gate.';
