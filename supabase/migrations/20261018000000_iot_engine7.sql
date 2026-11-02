-- ============================================================================
-- FRELUX Engine #7: IoT & telematics — M1
-- Migration: 20261018000000_iot_engine7.sql
-- ============================================================================
-- Authenticated device onboarding + strict telemetry ingestion.
-- Gates from the handoff board, all enforced here:
--   * consent: a device row only ingests while consent_granted_at is
--     set and the device is active (checked by the ingest function)
--   * authenticated device identity: telemetry rows are written ONLY
--     by the service role through the iot-ingest edge function, keyed
--     by a per-device API key stored hashed. There is NO client INSERT
--     policy — no unauthenticated or app-user feed path exists.
--   * validated signals: metric/unit pairs and plausible ranges are
--     constrained in code (src/lib/iot/telemetry-validation.ts +
--     the iot-ingest function) and quality-flagged here.
--   * retention control: per-device retention_days, default 90.
-- ============================================================================

-- ============================================================
-- 1. iot_devices
-- ============================================================
CREATE TABLE IF NOT EXISTS public.iot_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  -- device class registry (mirrored in code; keep in sync)
  device_type text NOT NULL CHECK (device_type IN (
    'concrete_maturity_sensor',
    'weather_station',
    'vibration_monitor',
    'gps_tracker',
    'generic_telemetry'
  )),
  provider text,
  market_code text NOT NULL
    CHECK (market_code = upper(market_code) AND char_length(market_code) = 2),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'retired')),
  -- SHA-256 hex hash of the device API key; the raw key is shown once
  -- at registration and never stored
  api_key_hash text NOT NULL CHECK (char_length(api_key_hash) = 64),
  consent_granted_at timestamptz,
  consent_scope text,
  retention_days integer NOT NULL DEFAULT 90
    CHECK (retention_days BETWEEN 1 AND 3650),
  last_seen_at timestamptz,
  created_date timestamptz NOT NULL DEFAULT now(),
  updated_date timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.iot_devices IS
  'Engine #7 IoT: registered project devices. Owner-scoped; ingestion is consent-gated and service-role-only.';

-- ============================================================
-- 2. iot_telemetry
--    No INSERT/UPDATE/DELETE policies for app users: rows are only
--    written by the service-role iot-ingest edge function.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.iot_telemetry (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  device_id uuid NOT NULL REFERENCES public.iot_devices(id) ON DELETE CASCADE,
  recorded_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  metric text NOT NULL CHECK (metric IN (
    'concrete_temp_c',
    'ambient_temp_c',
    'humidity_pct',
    'concrete_maturity_index',
    'vibration_mm_s',
    'gps_lat_deg',
    'gps_lng_deg',
    'equipment_hours'
  )),
  value double precision NOT NULL,
  unit text NOT NULL CHECK (unit IN (
    'celsius', 'percent', 'celsius_hours', 'mm_s', 'degrees', 'hours'
  )),
  -- valid: passed all checks; suspect: out-of-plausible-range but
  -- stored for review; invalid readings are rejected, never stored
  quality_flag text NOT NULL DEFAULT 'valid'
    CHECK (quality_flag IN ('valid', 'suspect')),
  notes text
);

CREATE INDEX IF NOT EXISTS iot_telemetry_device_recorded_idx
  ON public.iot_telemetry (device_id, recorded_at DESC);

COMMENT ON TABLE public.iot_telemetry IS
  'Engine #7 IoT: validated device readings. Service-role inserts only via the iot-ingest edge function; owners read their own devices'' data.';

-- ============================================================
-- 3. Row-level security — FORCED everywhere
-- ============================================================
ALTER TABLE public.iot_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iot_devices FORCE ROW LEVEL SECURITY;
ALTER TABLE public.iot_telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iot_telemetry FORCE ROW LEVEL SECURITY;

-- devices: owner CRUD
CREATE POLICY "owner reads own devices" ON public.iot_devices
  FOR SELECT USING (auth.uid() = owner);
CREATE POLICY "owner inserts own devices" ON public.iot_devices
  FOR INSERT WITH CHECK (auth.uid() = owner);
CREATE POLICY "owner updates own devices" ON public.iot_devices
  FOR UPDATE USING (auth.uid() = owner)
  WITH CHECK (auth.uid() = owner);
CREATE POLICY "owner deletes own devices" ON public.iot_devices
  FOR DELETE USING (auth.uid() = owner);

-- telemetry: owner read-only through the device owner
CREATE POLICY "owner reads own device telemetry" ON public.iot_telemetry
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.iot_devices d
      WHERE d.id = device_id AND d.owner = auth.uid()
    )
  );
-- deliberately NO INSERT / UPDATE / DELETE policies for app users:
-- ingestion happens exclusively through the service-role edge
-- function after device-key + consent + validation checks

-- ============================================================
-- 4. Explicit grants for the service role (the ingest function)
--    This project's default privileges do NOT include
--    SELECT/INSERT for service_role on public tables, so the
--    grants are explicit and scoped to exactly these two tables.
--    (Mirror of the migration's live fixup, applied 2026-10-15.)
-- ============================================================
GRANT SELECT, UPDATE ON TABLE public.iot_devices TO service_role;
GRANT SELECT, INSERT ON TABLE public.iot_telemetry TO service_role;
