-- Teaching status (audit fix H-1, 2026-09-11) introduced the
-- 'owner-asserted' status in the engine's Fact type, but the
-- table's CHECK constraint was never widened on Frelukx —
-- every chat-taught fact insert failed (and the fallback UPDATE
-- missed too), so owner teaching silently never persisted.
-- Widen the constraint to match the Fact union.
ALTER TABLE public.frelux_archie_native_facts
  DROP CONSTRAINT frelux_archie_native_facts_status_check;

ALTER TABLE public.frelux_archie_native_facts
  ADD CONSTRAINT frelux_archie_native_facts_status_check
  CHECK (status IN ('candidate', 'validated', 'uncertain', 'derived', 'owner-asserted'));
