/*
# Security hardening: enable RLS on the archie scheduler tables

The 20260916040000_archie_scheduler migration created
archie_scheduler_runs / archie_scheduler_state / archie_scheduler_tokens
with FORCE ROW LEVEL SECURITY but never ENABLEd RLS, so no policies
applied (FORCE alone does nothing). Anon and authenticated hold no
grants on these tables today, so the grants were the only gate —
defense in depth requires RLS to actually be on.

The scheduler runs through the service role, which bypasses RLS, so
enabling it here changes nothing for the scheduler itself.

1. Enable RLS on all three tables.
2. Add admin-only explicit policies (same pattern as the rest of the
   platform) so the intent is recorded in the policy set, not just the
   absence of grants.
*/

ALTER TABLE public.archie_scheduler_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archie_scheduler_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archie_scheduler_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "archie_scheduler_runs_admin" ON public.archie_scheduler_runs;
CREATE POLICY "archie_scheduler_runs_admin"
ON public.archie_scheduler_runs FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "archie_scheduler_state_admin" ON public.archie_scheduler_state;
CREATE POLICY "archie_scheduler_state_admin"
ON public.archie_scheduler_state FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "archie_scheduler_tokens_admin" ON public.archie_scheduler_tokens;
CREATE POLICY "archie_scheduler_tokens_admin"
ON public.archie_scheduler_tokens FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());
