-- ============================================================================
-- FRELUX ENGINE #7 (M4) — INDEPENDENTLY REVIEWED SAFETY THRESHOLDS
--
-- Safety alerts are ONLY ever evaluated against thresholds that a
-- qualified, named reviewer has approved. Design guarantees:
--   * every row ships PENDING; a pending threshold is disclosed and
--     NEVER drives an alert
--   * admin-only writes via RLS (mirrors compliance_reviews /
--     predictive_model_validations / withholding_rules) so the app
--     can NEVER self-certify a safety threshold
--   * an approved row must name its reviewer and review date
--   * the threshold must cite its basis (standard / specification /
--     engineering judgment) — no uncited thresholds
--   * metric must be a registered telemetry metric (mirror of
--     src/lib/iot/telemetry-validation.ts METRIC_REGISTRY; a
--     registry-sync test fails the suite if the two drift)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.iot_safety_thresholds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- mirror of METRIC_REGISTRY metric names (sync-tested)
  metric text NOT NULL CHECK (metric IN (
    'concrete_temp_c', 'ambient_temp_c', 'humidity_pct',
    'concrete_maturity_index', 'vibration_mm_s',
    'gps_lat_deg', 'gps_lng_deg', 'equipment_hours'
  )),
  -- optional scoping: NULL = applies to any device type / market
  device_type text,
  market_code text,
  threshold_value numeric NOT NULL,
  threshold_unit text NOT NULL,
  -- which side of the value is unsafe
  direction text NOT NULL DEFAULT 'above'
    CHECK (direction IN ('above', 'below')),
  -- cited basis for the threshold (standard, spec, or named engineer)
  basis text NOT NULL,
  source_url text,
  -- expert-review gate: pending rows are disclosed as UNREVIEWED and
  -- never evaluated into alerts. Only an admin can set 'approved'.
  review_status text NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending', 'approved', 'rejected')),
  reviewer_name text,
  reviewer_credentials text,
  review_notes text,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (market_code IS NULL OR (market_code = upper(market_code) AND char_length(market_code) = 2)),
  CHECK (device_type IS NULL OR device_type IN (
    'concrete_maturity_sensor', 'weather_station', 'vibration_monitor',
    'gps_tracker', 'generic_telemetry'
  )),
  CONSTRAINT iot_safety_thresholds_approved_requires_reviewer CHECK (
    review_status <> 'approved' OR (reviewer_name IS NOT NULL AND reviewed_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_iot_safety_thresholds_metric
  ON public.iot_safety_thresholds(metric);

ALTER TABLE public.iot_safety_thresholds ENABLE ROW LEVEL SECURITY;

-- Reference data: readable by everyone; alerts must be auditable by
-- any device owner. Writes are admin-only so the app can never
-- manufacture its own safety thresholds.
DROP POLICY IF EXISTS "iot_safety_thresholds_public_read" ON public.iot_safety_thresholds;
CREATE POLICY "iot_safety_thresholds_public_read"
  ON public.iot_safety_thresholds
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "iot_safety_thresholds_admin_write" ON public.iot_safety_thresholds;
CREATE POLICY "iot_safety_thresholds_admin_write"
  ON public.iot_safety_thresholds
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- This project's default privileges do NOT grant service_role access
-- to public tables; nothing reads this table as service role today,
-- but grant SELECT defensively for future edge-function alert runs.
GRANT SELECT ON public.iot_safety_thresholds TO service_role;
