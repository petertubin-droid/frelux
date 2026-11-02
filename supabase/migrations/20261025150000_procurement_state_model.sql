-- =========================================================
-- FRELUX Phase 3: procurement state model + audit trail
-- Migration 20261025150000
--
-- Auditable states: listed, quote_requested, quoted, approved,
-- purchase_ordered, dispatched, in_transit, customs_hold,
-- delivered, partial_delivery, exception, cancelled.
-- Every transition is recorded in an append-only event that
-- snapshots actor, source, line items, quantities/units,
-- supplier and destination at the moment of transition.
-- The event trail is the only path that changes a record's
-- status: direct status updates are rejected by the database.
-- =========================================================

CREATE TABLE IF NOT EXISTS public.procurement_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Optional user-entered project label; no project entity is
  -- fabricated. A real FK is added when projects exist.
  project_ref text,
  title text NOT NULL,
  supplier text NOT NULL,
  destination text NOT NULL,
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'listed'
    CHECK (status IN ('listed','quote_requested','quoted','approved',
      'purchase_ordered','dispatched','in_transit','customs_hold',
      'delivered','partial_delivery','exception','cancelled')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_procurement_records_status
  ON public.procurement_records (status);
CREATE INDEX IF NOT EXISTS idx_procurement_records_owner
  ON public.procurement_records (created_by);

CREATE TABLE IF NOT EXISTS public.procurement_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL REFERENCES public.procurement_records(id)
    ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role text NOT NULL
    CHECK (actor_role IN ('owner','admin','system')),
  source text NOT NULL DEFAULT 'app'
    CHECK (source IN ('app','import','api')),
  -- Snapshot of the state at transition time.
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  supplier text NOT NULL,
  destination text NOT NULL,
  notes text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_procurement_events_record
  ON public.procurement_events (record_id, occurred_at);

-- Line items must be objects with description, quantity and unit.
-- Quantities are plain numbers; nothing is inferred here.
CREATE OR REPLACE FUNCTION public.validate_procurement_line_items()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  e jsonb;
BEGIN
  IF jsonb_typeof(NEW.line_items) <> 'array' THEN
    RAISE EXCEPTION 'line_items must be an array';
  END IF;
  FOR e IN SELECT * FROM jsonb_array_elements(NEW.line_items) LOOP
    IF jsonb_typeof(e) <> 'object' OR NOT (e ? 'description')
       OR NOT (e ? 'quantity') OR NOT (e ? 'unit')
       OR jsonb_typeof(e->'quantity') <> 'number' THEN
      RAISE EXCEPTION 'invalid line item: %', e::text;
    END IF;
  END LOOP;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_validate_proc_record_lines ON public.procurement_records;
CREATE TRIGGER trg_validate_proc_record_lines
  BEFORE INSERT OR UPDATE OF line_items ON public.procurement_records
  FOR EACH ROW EXECUTE FUNCTION public.validate_procurement_line_items();

-- Deterministic state machine, enforced at the database level.
-- The event insert is the only path that changes status.
CREATE OR REPLACE FUNCTION public.procurement_transition_allowed(
  p_from text, p_to text
) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT (p_from, p_to) IN (
    ('listed','quote_requested'), ('listed','cancelled'),
    ('quote_requested','quoted'), ('quote_requested','cancelled'),
    ('quoted','approved'), ('quoted','quote_requested'),
    ('quoted','cancelled'),
    ('approved','purchase_ordered'), ('approved','cancelled'),
    ('purchase_ordered','dispatched'), ('purchase_ordered','exception'),
    ('purchase_ordered','cancelled'),
    ('dispatched','in_transit'), ('dispatched','exception'),
    ('in_transit','customs_hold'), ('in_transit','partial_delivery'),
    ('in_transit','delivered'), ('in_transit','exception'),
    ('customs_hold','in_transit'), ('customs_hold','exception'),
    ('partial_delivery','in_transit'), ('partial_delivery','delivered'),
    ('partial_delivery','exception'), ('partial_delivery','cancelled'),
    ('exception','purchase_ordered'), ('exception','dispatched'),
    ('exception','in_transit'), ('exception','delivered'),
    ('exception','cancelled')
  );
$$;

-- Validate and apply an event insert.
CREATE OR REPLACE FUNCTION public.apply_procurement_event()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_record public.procurement_records;
BEGIN
  SELECT * INTO v_record FROM public.procurement_records
    WHERE id = NEW.record_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'procurement record % not found', NEW.record_id;
  END IF;
  -- Creation echo: the automatic first event (from NULL to
  -- listed) is valid only on a record that is still listed.
  IF NEW.from_status IS NULL THEN
    IF NEW.to_status <> 'listed' OR v_record.status <> 'listed' THEN
      RAISE EXCEPTION
        'transition rejected: an initial event is only valid at creation';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.from_status IS DISTINCT FROM v_record.status THEN
    RAISE EXCEPTION
      'transition rejected: record is % but the event claims %',
      v_record.status, NEW.from_status;
  END IF;
  IF NOT public.procurement_transition_allowed(NEW.from_status, NEW.to_status) THEN
    RAISE EXCEPTION
      'transition rejected: % -> % is not an auditable procurement transition',
      NEW.from_status, NEW.to_status;
  END IF;
  -- Mark this transaction as trail-driven so the direct-update
  -- block trigger permits exactly this one status change.
  PERFORM set_config('fre.procurement_event_id', NEW.id::text, true);
  -- Apply the transition.
  UPDATE public.procurement_records
     SET status = NEW.to_status, updated_at = now()
   WHERE id = NEW.record_id;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_apply_procurement_event ON public.procurement_events;
CREATE TRIGGER trg_apply_procurement_event
  BEFORE INSERT ON public.procurement_events
  FOR EACH ROW EXECUTE FUNCTION public.apply_procurement_event();

-- Hard immutability: the trail is append-only for everyone.
CREATE OR REPLACE FUNCTION public.procurement_events_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION
    'procurement_events is append-only: event % cannot be altered', OLD.id;
END; $$;

DROP TRIGGER IF EXISTS trg_procurement_events_immutable ON public.procurement_events;
CREATE TRIGGER trg_procurement_events_immutable
  BEFORE UPDATE OR DELETE ON public.procurement_events
  FOR EACH ROW EXECUTE FUNCTION public.procurement_events_immutable();

-- Block direct status edits on records: the trail is the only path.
CREATE OR REPLACE FUNCTION public.block_direct_procurement_status()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND current_setting('fre.procurement_event_id', true) IS NULL THEN
    RAISE EXCEPTION
      'procurement status can only change through an audit trail event';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_block_direct_procurement_status
  ON public.procurement_records;
CREATE TRIGGER trg_block_direct_procurement_status
  BEFORE UPDATE OF status ON public.procurement_records
  FOR EACH ROW EXECUTE FUNCTION public.block_direct_procurement_status();

-- Automatic first trail entry: creation at 'listed'.
CREATE OR REPLACE FUNCTION public.log_procurement_creation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.procurement_events
    (record_id, from_status, to_status, actor_id, actor_role,
     source, line_items, supplier, destination, notes)
  VALUES (NEW.id, NULL, 'listed',
    CASE WHEN auth.uid() IS NOT NULL THEN auth.uid() ELSE NEW.created_by END,
    CASE WHEN public.is_admin() THEN 'admin'
         WHEN auth.uid() IS NOT NULL THEN 'owner'
         ELSE 'system' END,
    'app', NEW.line_items, NEW.supplier, NEW.destination,
    'Record created');
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_log_procurement_creation
  ON public.procurement_records;
CREATE TRIGGER trg_log_procurement_creation
  AFTER INSERT ON public.procurement_records
  FOR EACH ROW EXECUTE FUNCTION public.log_procurement_creation();

ALTER TABLE public.procurement_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procurement_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_own_procurement_records" ON public.procurement_records;
CREATE POLICY "read_own_procurement_records"
  ON public.procurement_records FOR SELECT
  TO authenticated
  USING (created_by = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "create_own_procurement_records" ON public.procurement_records;
CREATE POLICY "create_own_procurement_records"
  ON public.procurement_records FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "update_own_procurement_records" ON public.procurement_records;
CREATE POLICY "update_own_procurement_records"
  ON public.procurement_records FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() OR public.is_admin())
  WITH CHECK (created_by = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "delete_own_procurement_records" ON public.procurement_records;
CREATE POLICY "delete_own_procurement_records"
  ON public.procurement_records FOR DELETE
  TO authenticated
  USING (created_by = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "read_procurement_events" ON public.procurement_events;
CREATE POLICY "read_procurement_events"
  ON public.procurement_events FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.procurement_records r
    WHERE r.id = record_id
      AND (r.created_by = auth.uid() OR public.is_admin())
  ));

DROP POLICY IF EXISTS "insert_procurement_events" ON public.procurement_events;
CREATE POLICY "insert_procurement_events"
  ON public.procurement_events FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.procurement_records r
    WHERE r.id = record_id
      AND (r.created_by = auth.uid() OR public.is_admin())
  ));

-- Access grants: RLS above restricts what each role can touch;
-- service_role bypasses RLS but still needs table privileges.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.procurement_records
  TO authenticated, service_role;
GRANT SELECT, INSERT ON public.procurement_events
  TO authenticated, service_role;

-- =========================================================
-- Retention: a record can be deleted by its owner or an admin
-- through a guarded function; the trail dies with the record
-- but can never be edited.
-- =========================================================

CREATE OR REPLACE FUNCTION public.procurement_events_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Append-only, except when the parent record is being deleted
  -- via the guarded path (retention: the trail dies with the
  -- record, but can never be edited).
  IF TG_OP = 'DELETE'
     AND current_setting('fre.procurement_delete_record', true)
          IS NOT DISTINCT FROM OLD.record_id::text THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION
    'procurement_events is append-only: event % cannot be altered', OLD.id;
END; $$;

CREATE OR REPLACE FUNCTION public.delete_procurement_record(p_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_owner uuid;
BEGIN
  SELECT created_by INTO v_owner FROM public.procurement_records
    WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'procurement record % not found', p_id;
  END IF;
  IF NOT (public.is_admin() OR v_owner = auth.uid()) THEN
    RAISE EXCEPTION 'only the record owner or an admin may delete it';
  END IF;
  PERFORM set_config('fre.procurement_delete_record', p_id::text, true);
  DELETE FROM public.procurement_records WHERE id = p_id;
  RETURN true;
END; $$;

REVOKE ALL ON FUNCTION public.delete_procurement_record(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_procurement_record(uuid)
  TO authenticated, service_role;
