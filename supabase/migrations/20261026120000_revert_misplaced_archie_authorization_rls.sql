-- ============================================================================
-- REVERT: misdirected ARCHIE authorization RLS loosening
-- (companion to the 2026-10-19 split of 20261026110000)
--
-- The original 20261026110000 section 2 loosened
-- public.archie_global_authorizations so ANY authenticated user
-- could INSERT/UPDATE authorization rows whose granted_by CHECK
-- was widened to OWNER/ADMIN/SYSTEM/AUTO. Because ARCHIE's
-- runtime honors OWNER-granted rows, this is a privilege
-- escalation path. ARCHIE's schema belongs to the ARCHIE
-- project — this reversion restores the admin-only posture here
-- wherever that loosened version already applied, and is a
-- safe no-op wherever the table does not exist.
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'archie_global_authorizations'
  ) THEN
    -- Restore the OWNER-only granted_by contract
    ALTER TABLE public.archie_global_authorizations
      DROP CONSTRAINT IF EXISTS archie_global_authorizations_granted_by_check;
    ALTER TABLE public.archie_global_authorizations
      ADD CONSTRAINT archie_global_authorizations_granted_by_check
      CHECK (granted_by IN ('OWNER'));

    -- Restore admin-only RLS (matching the ARCHIE project's posture)
    -- Drop BOTH the loosened policy names (auth_*) and the
    -- original names (owner_*) before re-creating — the preview
    -- DB may carry either (they coexist by name).
    DROP POLICY IF EXISTS "auth_read_authorizations" ON public.archie_global_authorizations;
    DROP POLICY IF EXISTS "auth_write_authorizations" ON public.archie_global_authorizations;
    DROP POLICY IF EXISTS "auth_update_authorizations" ON public.archie_global_authorizations;
    DROP POLICY IF EXISTS "owner_read_authorizations" ON public.archie_global_authorizations;
    DROP POLICY IF EXISTS "owner_write_authorizations" ON public.archie_global_authorizations;
    DROP POLICY IF EXISTS "owner_revoke_authorizations" ON public.archie_global_authorizations;

    CREATE POLICY "owner_read_authorizations"
      ON public.archie_global_authorizations FOR SELECT
      TO authenticated USING (is_current_user_admin());
    CREATE POLICY "owner_write_authorizations"
      ON public.archie_global_authorizations FOR INSERT
      TO authenticated WITH CHECK (is_current_user_admin());
    CREATE POLICY "owner_revoke_authorizations"
      ON public.archie_global_authorizations FOR UPDATE
      TO authenticated USING (is_current_user_admin()) WITH CHECK (is_current_user_admin());

    -- If the loosened version minted any non-OWNER grants, purge them
    DELETE FROM public.archie_global_authorizations
      WHERE granted_by <> 'OWNER';
  END IF;
END $$;
