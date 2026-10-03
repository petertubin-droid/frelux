-- =========================================================
-- Offline-First Field Engine (Future Engine 17)
-- =========================================================
-- Artisans can already run every calculator offline (service
-- worker shell + config cache + local projects). What was
-- impossible: recording WORK done in the field — measurements
-- taken on site, materials actually used, progress notes — and
-- getting it into the database when connectivity returns.
--
-- This migration adds the server side of that flow:
--  * field_capture_log — the synced field captures. The client
--    generates the UUID and it IS the primary key, so a retry
--    after a flaky connection can never create a duplicate row
--    (sync is idempotent by construction). Anonymous insert so
--    an artisan without an account can still sync their work;
--    authenticated users can read their own captures, admins
--    can read everything.
--  * Sync behaviour rules in estimation_calc_rules
--    (calculator_type 'offline_field') so capacity, retention,
--    batching and auto-sync are admin-configurable like every
--    other engine.
-- =========================================================

-- ─────────────────────────────────────────────
-- 1. field_capture_log
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS field_capture_log (
  id            uuid PRIMARY KEY,          -- client-generated: idempotent sync
  created_by    uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  device_label  text NOT NULL DEFAULT 'This device',
  project_label text NOT NULL DEFAULT 'Untitled job',
  entry_kind    text NOT NULL CHECK (entry_kind IN (
                  'measurement', 'material_used', 'progress_note', 'photo_reference')),
  payload       jsonb NOT NULL,
  captured_at   timestamptz NOT NULL,      -- when it happened in the field
  synced_at     timestamptz NOT NULL DEFAULT now(), -- when it reached the server
  queue_queued_at   timestamptz,          -- diagnostics: when it entered the offline queue
  queue_last_attempt timestamptz          -- diagnostics: previous failed sync attempts
);

CREATE INDEX IF NOT EXISTS field_capture_log_owner_idx
  ON field_capture_log (created_by, captured_at DESC);
CREATE INDEX IF NOT EXISTS field_capture_log_kind_idx
  ON field_capture_log (entry_kind, captured_at DESC);

ALTER TABLE field_capture_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_capture_log FORCE ROW LEVEL SECURITY;

-- Public visitors may sync their field work without an account
-- (same anonymous-insert model as conversational_parse_log).
DROP POLICY IF EXISTS "field_capture_public_insert" ON field_capture_log;
CREATE POLICY "field_capture_public_insert" ON field_capture_log
  FOR INSERT TO public WITH CHECK (true);

-- An authenticated artisan reads their own captures.
DROP POLICY IF EXISTS "field_capture_owner_read" ON field_capture_log;
CREATE POLICY "field_capture_owner_read" ON field_capture_log
  FOR SELECT TO authenticated USING (created_by = auth.uid());

-- Admins see every capture (site-wide field work).
DROP POLICY IF EXISTS "field_capture_admin_read" ON field_capture_log;
CREATE POLICY "field_capture_admin_read" ON field_capture_log
  FOR SELECT TO authenticated USING (public.is_admin());

-- Captures are append-only from the field: no update, no delete
-- except admins curating spam/mistakes.
DROP POLICY IF EXISTS "field_capture_admin_delete" ON field_capture_log;
CREATE POLICY "field_capture_admin_delete" ON field_capture_log
  FOR DELETE TO authenticated USING (public.is_admin());

COMMENT ON TABLE field_capture_log IS 'Field captures synced from the offline queue: measurements, materials used, progress notes and photo references recorded on site with no connectivity. Client-generated UUID primary key makes sync idempotent — a retry after a dropped connection never double-records. Anonymous insert; artisans read their own; admin-only delete.';

-- ─────────────────────────────────────────────
-- 2. Sync rules — admin-configurable behaviour
-- ─────────────────────────────────────────────
INSERT INTO estimation_calc_rules (rule_key, calculator_type, rule_value, rule_status, description, is_active)
VALUES
  ('auto_sync', 'offline_field',
   '{"value": true}'::jsonb, 'verified_frelux',
   'Whether the Field Sync page tries to sync the queue automatically when connectivity returns (true) or only on explicit Sync-now taps.', true),
  ('max_queue', 'offline_field',
   '{"value": 100}'::jsonb, 'verified_frelux',
   'Maximum offline captures kept on the device. When full the OLDEST capture is evicted and the UI says which one — never a silent loss.', true),
  ('retention_days', 'offline_field',
   '{"value": 90}'::jsonb, 'verified_frelux',
   'Days an unsynced capture stays in the offline queue before it is pruned. Pruning happens before capacity eviction.', true),
  ('sync_batch', 'offline_field',
   '{"value": 20}'::jsonb, 'verified_frelux',
   'How many captures one sync run attempts, oldest-first. The report always states how many remain.', true)
ON CONFLICT (rule_key, calculator_type) DO NOTHING;
