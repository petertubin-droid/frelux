-- =========================================================
-- Migration: 20261025160000_procurement_status_guard_hardening.sql
--
-- Release-check finding (2026-10-25 live release check,
-- supabase/tests/release-check-quotes-procurement.sql):
-- the direct-status-edit guard keyed on the transaction-scoped
-- GUC 'fre.procurement_event_id' stays set after the event
-- trigger applies its UPDATE, so a direct status edit issued
-- later in the same transaction bypassed the guard entirely.
-- The status could be tampered without any trail event.
--
-- Hardening (defense in depth):
-- 1. The event-apply trigger clears its GUC immediately after
--    the one UPDATE it performs.
-- 2. The guard additionally requires pg_trigger_depth() > 0:
--    only an UPDATE issued from inside a trigger function may
--    change the status; every client-issued statement runs at
--    trigger depth 0 and is rejected regardless of GUC state.
-- 3. Revoke UPDATE/DELETE table privileges on the trail from
--    authenticated (grant hygiene; RLS and the immutability
--    trigger remain the primary guards).
--
-- No existing data is modified; behavior of legitimate
-- trail-driven transitions is unchanged.
-- =========================================================

-- 1. Apply trigger: scope the marker to exactly its own UPDATE.
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
  -- Mark this statement as trail-driven so the direct-update
  -- block trigger permits exactly this one status change, then
  -- clear the marker so it never outlives this UPDATE.
  PERFORM set_config('fre.procurement_event_id', NEW.id::text, true);
  UPDATE public.procurement_records
     SET status = NEW.to_status, updated_at = now()
   WHERE id = NEW.record_id;
  PERFORM set_config('fre.procurement_event_id', '', true);
  RETURN NEW;
END; $$;

-- 2. Guard: trigger depth + marker, not the marker alone.
CREATE OR REPLACE FUNCTION public.block_direct_procurement_status()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    -- The only legitimate status change is the single UPDATE
    -- issued from inside the event-apply trigger, which runs
    -- at trigger depth >= 1 with the event marker set. Every
    -- client-issued statement runs at depth 0.
    IF pg_trigger_depth() <= 1 THEN
      RAISE EXCEPTION
        'procurement status can only change through an audit trail event';
    END IF;
    IF NULLIF(current_setting('fre.procurement_event_id', true), '') IS NULL THEN
      RAISE EXCEPTION
        'procurement status can only change through an audit trail event';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

-- 3. Grant hygiene on the append-only trail.
REVOKE UPDATE, DELETE ON TABLE public.procurement_events FROM authenticated;
