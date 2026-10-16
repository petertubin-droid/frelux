-- =====================================================================
-- Engine #12 (RBAC & clearance): FORCE Row Level Security on every
-- public table that had RLS enabled but NOT forced (66 tables).
--
-- RLS "enabled" alone lets the TABLE OWNER bypass all policies. Every
-- earlier Frelux engine (predictive, compliance, IoT, sync, escrow)
-- was already forced; this closes the gap on the remaining catalog,
-- lexicon, gateway and workspace-adjacent tables so the whole public
-- schema now has one uniform posture: owner included, RLS is law.
--
-- The table list was generated FROM the live database (not transcribed)
-- and an idempotent verification query at the bottom proves the final
-- state: zero public tables remain with RLS enabled-but-not-forced.
-- =====================================================================

DO $$
DECLARE
  target_table text;
BEGIN
  -- Derive the targets from the preview/live schema rather than assuming
  -- every environment has the same set of legacy and optional tables.
  FOR target_table IN
    SELECT c.relname
    FROM pg_class AS c
    JOIN pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
      AND c.relrowsecurity
      AND NOT c.relforcerowsecurity
  LOOP
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', target_table);
  END LOOP;
END;
$$;

-- Verification: no public table may keep enabled-not-forced RLS.
-- (Fails the migration if any survivor remains.)
DO $$
DECLARE
  survivor text;
BEGIN
  SELECT tablename INTO survivor
  FROM pg_tables
  WHERE schemaname = 'public'
    AND rowsecurity = true
    AND EXISTS (
      SELECT 1 FROM pg_class
      WHERE pg_class.oid = pg_tables.tablename::regclass
        AND relrowsecurity = true
        AND relforcerowsecurity = false
    )
  LIMIT 1;
  IF survivor IS NOT NULL THEN
    RAISE EXCEPTION 'RLS still not forced on public.%', survivor;
  END IF;
END;
$$;
