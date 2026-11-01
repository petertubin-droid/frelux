-- =========================================================
-- Recover agent actions left in `executed`
-- Migration: 20261101120000_recover_interrupted_agent_executions.sql
--
-- `executed` records that a write began. When the process doing it dies,
-- nothing records a result and the row stays in `executed` for good. It does
-- not block other work and the next run refuses to double-write, but no sweep
-- ever resolved it, so the thread shows an action that neither failed nor
-- finished.
--
-- This function resolves those rows to `failed` after a generous quiet window
-- (30 minutes, far longer than any write here takes). It does not claim to know
-- whether the write landed: nobody recorded that. Marking it failed is the
-- honest state, and the reason is written to the row's execution_result so the
-- record explains itself later.
--
-- `executed` to `failed` is an allowed lifecycle transition, so this sweep
-- follows the same state machine the application enforces.
--
-- Runs from pg_cron or the recover-agent-executions edge function. Service role
-- only: it writes across every user's actions.
-- =========================================================

CREATE OR REPLACE FUNCTION public.recover_interrupted_agent_executions(
  p_quiet_minutes integer DEFAULT 30
)
RETURNS TABLE(recovered_id uuid, started_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_cutoff timestamptz := now() - make_interval(mins => GREATEST(p_quiet_minutes, 1));
BEGIN
  RETURN QUERY
  WITH stale AS (
    SELECT a.id,
           COALESCE(a.executed_at, a.updated_at, a.created_at) AS started
    FROM public.project_agent_actions a
    WHERE a.state = 'executed'
      AND COALESCE(a.executed_at, a.updated_at, a.created_at) < v_cutoff
    FOR UPDATE SKIP LOCKED
  ),
  marked AS (
    UPDATE public.project_agent_actions a
    SET state = 'failed',
        updated_at = now(),
        execution_result = COALESCE(a.execution_result, '{}'::jsonb) || jsonb_build_object(
          'recovered', true,
          'recovered_at', now(),
          'recovery_note',
          'Execution started at ' || s.started || ' and recorded no result. '
          || 'Whether the write landed is not known, so the action is marked '
          || 'failed rather than assumed done. Check the record before '
          || 'preparing a replacement.'
        )
    FROM stale s
    WHERE a.id = s.id
    RETURNING a.id
  )
  SELECT s.id, s.started FROM stale s WHERE s.id IN (SELECT id FROM marked);
END;
$function$;

COMMENT ON FUNCTION public.recover_interrupted_agent_executions(integer) IS
  'Resolves agent actions stuck in executed past the quiet window to failed, recording why. Service role only.';

REVOKE ALL ON FUNCTION public.recover_interrupted_agent_executions(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recover_interrupted_agent_executions(integer) TO service_role;
