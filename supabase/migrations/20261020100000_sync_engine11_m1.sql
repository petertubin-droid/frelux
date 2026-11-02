-- =========================================================
-- Engine #11 M1 — Durable sync: trust boundary + device identity
-- =========================================================
-- The offline field queue (20261005090000) syncs captures into
-- field_capture_log with an anonymous-insert model. Two honest
-- gaps closed here:
--
--  1. ATTRIBUTION TRUST: the old insert policy allowed anyone
--     (anonymous included) to set created_by to ANY user, which
--     would plant rows into another artisan's capture view
--     (owner_read is created_by = auth.uid()). Inserts are now
--     constrained: authenticated users may only insert rows
--     attributed to themselves; anonymous inserts must stay
--     unattributed (created_by IS NULL). Anonymous work still
--     syncs — it simply never claims an owner.
--
--  2. DEVICE IDENTITY: captures now record the stable
--     client-generated device UUID (device-identity.ts), so
--     multi-device work is distinguishable without any personal
--     data. Device loss/reinstall = a new device_id; already-
--     synced captures stay attributed to the user account.
--
--  3. PAYLOAD SANITY: a hard CHECK keeps any capture payload
--     (photos as data URLs included) inside 2 MiB so a runaway
--     attachment can never balloon a jsonb row.
-- =========================================================

-- ─────────────────────────────────────────────
-- 1. device identity column
-- ─────────────────────────────────────────────
ALTER TABLE field_capture_log
  ADD COLUMN IF NOT EXISTS device_id uuid;

CREATE INDEX IF NOT EXISTS field_capture_log_device_idx
  ON field_capture_log (device_id, captured_at DESC);

-- ─────────────────────────────────────────────
-- 2. payload size guard (2 MiB, mirrors client cap)
-- ─────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'field_capture_payload_size'
      AND conrelid = 'field_capture_log'::regclass
  ) THEN
    ALTER TABLE field_capture_log
      ADD CONSTRAINT field_capture_payload_size
      CHECK (octet_length(payload::text) <= 2097152);
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 3. insert policies: honest attribution only
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "field_capture_public_insert" ON field_capture_log;

-- Anonymous field work may sync without an account, but it may
-- never claim an owner.
DROP POLICY IF EXISTS "field_capture_anon_insert" ON field_capture_log;
CREATE POLICY "field_capture_anon_insert" ON field_capture_log
  FOR INSERT TO anon WITH CHECK (created_by IS NULL);

-- A signed-in artisan may only attribute captures to themselves.
DROP POLICY IF EXISTS "field_capture_auth_insert" ON field_capture_log;
CREATE POLICY "field_capture_auth_insert" ON field_capture_log
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

COMMENT ON TABLE field_capture_log IS 'Field captures synced from the offline queue: measurements, materials used, progress notes and photo references recorded on site with no connectivity. Client-generated UUID primary key makes sync idempotent — a retry after a dropped connection never double-records. Inserts are attribution-honest: authenticated users may only attribute to themselves, anonymous inserts stay unattributed; authenticated artisans read their own, admins read all, admin-only delete.';
