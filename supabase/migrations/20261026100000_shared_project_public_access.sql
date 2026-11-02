-- =========================================================
-- Migration: 20261026100000_shared_project_public_access.sql
--
-- Live Project Sharing: Anonymous & cross-user access to
-- shared projects via active shareable_links.
--
-- Unblocks anonymous viewers and external guests from being
-- rejected by owner-only RLS when viewing a valid shared link.
-- =========================================================

-- 1. Ensure anon and authenticated roles have SELECT table privilege
GRANT SELECT ON public.user_projects TO anon, authenticated;

-- 2. Add public/shared RLS policy on user_projects
DROP POLICY IF EXISTS "user_proj_shared_select" ON public.user_projects;
CREATE POLICY "user_proj_shared_select" ON public.user_projects FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shareable_links sl
      WHERE sl.resource_type = 'project'
        AND sl.resource_id = public.user_projects.id
        AND sl.is_active = true
        AND (sl.expires_at IS NULL OR sl.expires_at > now())
    )
  );

-- 3. Dedicated SECURITY DEFINER lookup RPC for shared projects
CREATE OR REPLACE FUNCTION public.get_public_shared_project(p_link_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link record;
  v_project record;
BEGIN
  SELECT * INTO v_link
  FROM public.shareable_links
  WHERE id = p_link_id
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now());

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_link.resource_type = 'project' THEN
    SELECT id, name, description, project_type, project_data, created_at, updated_at
    INTO v_project
    FROM public.user_projects
    WHERE id = v_link.resource_id;

    IF FOUND THEN
      RETURN to_jsonb(v_project);
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_shared_project(uuid) TO anon, authenticated;
