-- ============================================================================
-- FRELUX Enterprise Readiness: Workspaces, RBAC, Invitations, Site Logs & Audit
-- Migration: 20261017000000_enterprise_workspaces_rbac.sql
-- ============================================================================

-- 1. WORKSPACES TABLE
CREATE TABLE IF NOT EXISTS public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id ON public.workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_slug ON public.workspaces(slug);

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- 2. WORKSPACE MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (
    role IN (
      'owner',
      'project_manager',
      'contractor',
      'foreman',
      'architect',
      'quantity_surveyor',
      'finance_officer',
      'viewer'
    )
  ),
  title text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'revoked')),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_workspace_member UNIQUE (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_ws_user ON public.workspace_members(workspace_id, user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_role ON public.workspace_members(role);

ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- 3. WORKSPACE INVITATIONS TABLE
CREATE TABLE IF NOT EXISTS public.workspace_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (
    role IN (
      'project_manager',
      'contractor',
      'foreman',
      'architect',
      'quantity_surveyor',
      'finance_officer',
      'viewer'
    )
  ),
  title text,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workspace_invitations_token ON public.workspace_invitations(token);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_ws_email ON public.workspace_invitations(workspace_id, lower(email));

ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;

-- 4. LINK CONTRACTOR PROJECTS TO WORKSPACES
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'contractor_projects'
      AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE public.contractor_projects
      ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_contractor_projects_workspace ON public.contractor_projects(workspace_id);

-- 5. DAILY SITE LOGS (Field Material Usage & Mobile Logs for Foremen)
CREATE TABLE IF NOT EXISTS public.project_site_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.contractor_projects(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  shift text NOT NULL DEFAULT 'day' CHECK (shift IN ('day', 'night', 'weekend')),
  weather_condition text,
  temperature_celsius numeric,
  workers_count integer NOT NULL DEFAULT 0,
  work_performed text NOT NULL,
  material_usage jsonb NOT NULL DEFAULT '[]'::jsonb,
  equipment_on_site text,
  safety_incidents text,
  delays_issues text,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_site_logs_project_date ON public.project_site_logs(project_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_site_logs_workspace ON public.project_site_logs(workspace_id);

ALTER TABLE public.project_site_logs ENABLE ROW LEVEL SECURITY;

-- 6. WORKSPACE AUDIT / ACTIVITY LOGS
CREATE TABLE IF NOT EXISTS public.workspace_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.contractor_projects(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ws_activity_ws_time ON public.workspace_activity_logs(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ws_activity_proj_time ON public.workspace_activity_logs(project_id, created_at DESC) WHERE project_id IS NOT NULL;

ALTER TABLE public.workspace_activity_logs ENABLE ROW LEVEL SECURITY;

-- 7. HELPER FUNCTIONS FOR SECURITY AND ACCESS CONTROL
CREATE OR REPLACE FUNCTION public.get_workspace_user_role(target_ws_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.workspace_members
  WHERE workspace_id = target_ws_id
    AND user_id = auth.uid()
    AND status = 'active'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_member(target_ws_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members
    WHERE workspace_id = target_ws_id
      AND user_id = auth.uid()
      AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_owner(target_ws_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspaces
    WHERE id = target_ws_id
      AND owner_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_workspace(target_ws_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members
    WHERE workspace_id = target_ws_id
      AND user_id = auth.uid()
      AND status = 'active'
      AND role IN ('owner', 'project_manager')
  );
$$;

-- 8. DEFAULT WORKSPACE ENSURE FUNCTION
CREATE OR REPLACE FUNCTION public.ensure_user_default_workspace(target_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workspace_id uuid;
  v_user_name text;
BEGIN
  -- Check existing owner workspace
  SELECT id INTO v_workspace_id
  FROM public.workspaces
  WHERE owner_id = target_user_id
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_workspace_id IS NOT NULL THEN
    RETURN v_workspace_id;
  END IF;

  -- Lookup user name/email for friendly workspace naming
  SELECT coalesce(full_name, split_part(email, '@', 1), 'Personal') INTO v_user_name
  FROM public.profiles
  WHERE id = target_user_id;

  IF v_user_name IS NULL OR length(trim(v_user_name)) = 0 THEN
    v_user_name := 'Personal';
  END IF;

  -- Create primary workspace
  INSERT INTO public.workspaces (name, owner_id)
  VALUES (v_user_name || ' Workspace', target_user_id)
  RETURNING id INTO v_workspace_id;

  -- Add owner membership
  INSERT INTO public.workspace_members (workspace_id, user_id, role, status)
  VALUES (v_workspace_id, target_user_id, 'owner', 'active')
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  RETURN v_workspace_id;
END;
$$;

-- 9. ROW LEVEL SECURITY POLICIES

-- WORKSPACES POLICIES
DROP POLICY IF EXISTS "Members can view workspaces" ON public.workspaces;
CREATE POLICY "Members can view workspaces"
  ON public.workspaces FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid() OR public.is_workspace_member(id)
  );

DROP POLICY IF EXISTS "Authenticated users can create workspaces" ON public.workspaces;
CREATE POLICY "Authenticated users can create workspaces"
  ON public.workspaces FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
  );

DROP POLICY IF EXISTS "Owners can update workspaces" ON public.workspaces;
CREATE POLICY "Owners can update workspaces"
  ON public.workspaces FOR UPDATE
  TO authenticated
  USING (
    owner_id = auth.uid() OR public.get_workspace_user_role(id) = 'owner'
  )
  WITH CHECK (
    owner_id = auth.uid() OR public.get_workspace_user_role(id) = 'owner'
  );

DROP POLICY IF EXISTS "Owners can delete workspaces" ON public.workspaces;
CREATE POLICY "Owners can delete workspaces"
  ON public.workspaces FOR DELETE
  TO authenticated
  USING (
    owner_id = auth.uid()
  );

-- WORKSPACE MEMBERS POLICIES
DROP POLICY IF EXISTS "Members can view membership" ON public.workspace_members;
CREATE POLICY "Members can view membership"
  ON public.workspace_members FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR public.is_workspace_member(workspace_id)
  );

DROP POLICY IF EXISTS "Admins can add workspace members" ON public.workspace_members;
CREATE POLICY "Admins can add workspace members"
  ON public.workspace_members FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_manage_workspace(workspace_id) OR (
      -- Allows self-insert when owner creating initial membership
      user_id = auth.uid() AND EXISTS (
        SELECT 1 FROM public.workspaces WHERE id = workspace_id AND owner_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Admins can update member roles" ON public.workspace_members;
CREATE POLICY "Admins can update member roles"
  ON public.workspace_members FOR UPDATE
  TO authenticated
  USING (
    public.can_manage_workspace(workspace_id)
  )
  WITH CHECK (
    public.can_manage_workspace(workspace_id)
  );

DROP POLICY IF EXISTS "Admins can remove members" ON public.workspace_members;
CREATE POLICY "Admins can remove members"
  ON public.workspace_members FOR DELETE
  TO authenticated
  USING (
    public.can_manage_workspace(workspace_id) OR user_id = auth.uid()
  );

-- WORKSPACE INVITATIONS POLICIES
DROP POLICY IF EXISTS "Members can view invitations" ON public.workspace_invitations;
CREATE POLICY "Members can view invitations"
  ON public.workspace_invitations FOR SELECT
  TO authenticated
  USING (
    public.can_manage_workspace(workspace_id)
    OR lower(email) = lower(auth.jwt() ->> 'email')
  );

DROP POLICY IF EXISTS "Managers can create invitations" ON public.workspace_invitations;
CREATE POLICY "Managers can create invitations"
  ON public.workspace_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_manage_workspace(workspace_id)
    AND invited_by = auth.uid()
  );

DROP POLICY IF EXISTS "Managers or recipient can update invitations" ON public.workspace_invitations;
CREATE POLICY "Managers or recipient can update invitations"
  ON public.workspace_invitations FOR UPDATE
  TO authenticated
  USING (
    public.can_manage_workspace(workspace_id)
    OR lower(email) = lower(auth.jwt() ->> 'email')
  );

DROP POLICY IF EXISTS "Managers can delete invitations" ON public.workspace_invitations;
CREATE POLICY "Managers can delete invitations"
  ON public.workspace_invitations FOR DELETE
  TO authenticated
  USING (
    public.can_manage_workspace(workspace_id)
  );

-- PROJECT SITE LOGS POLICIES
DROP POLICY IF EXISTS "Members can view site logs" ON public.project_site_logs;
CREATE POLICY "Members can view site logs"
  ON public.project_site_logs FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id))
    OR EXISTS (
      SELECT 1 FROM public.contractor_projects cp
      WHERE cp.id = project_id AND (cp.user_id = auth.uid() OR (cp.workspace_id IS NOT NULL AND public.is_workspace_member(cp.workspace_id)))
    )
  );

DROP POLICY IF EXISTS "Authorized field members can create site logs" ON public.project_site_logs;
CREATE POLICY "Authorized field members can create site logs"
  ON public.project_site_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (
      workspace_id IS NULL
      OR public.get_workspace_user_role(workspace_id) IN ('owner', 'project_manager', 'contractor', 'foreman')
    )
  );

DROP POLICY IF EXISTS "Authors or managers can update site logs" ON public.project_site_logs;
CREATE POLICY "Authors or managers can update site logs"
  ON public.project_site_logs FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR (workspace_id IS NOT NULL AND public.can_manage_workspace(workspace_id))
  );

DROP POLICY IF EXISTS "Managers can delete site logs" ON public.project_site_logs;
CREATE POLICY "Managers can delete site logs"
  ON public.project_site_logs FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR (workspace_id IS NOT NULL AND public.can_manage_workspace(workspace_id))
  );

-- WORKSPACE ACTIVITY LOGS POLICIES
DROP POLICY IF EXISTS "Members can view activity" ON public.workspace_activity_logs;
CREATE POLICY "Members can view activity"
  ON public.workspace_activity_logs FOR SELECT
  TO authenticated
  USING (
    public.is_workspace_member(workspace_id)
  );

DROP POLICY IF EXISTS "Members can record activity" ON public.workspace_activity_logs;
CREATE POLICY "Members can record activity"
  ON public.workspace_activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    actor_id = auth.uid() AND public.is_workspace_member(workspace_id)
  );

-- UPDATE CONTRACTOR PROJECTS POLICIES FOR WORKSPACE COLLABORATION
DROP POLICY IF EXISTS "Users can CRUD own contractor projects" ON public.contractor_projects;

CREATE POLICY "Users and workspace members can view contractor projects"
  ON public.contractor_projects FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id))
  );

CREATE POLICY "Users and authorized members can insert contractor projects"
  ON public.contractor_projects FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      workspace_id IS NULL
      OR public.get_workspace_user_role(workspace_id) IN ('owner', 'project_manager', 'contractor', 'quantity_surveyor')
    )
  );

CREATE POLICY "Owners, PMs, and creators can update contractor projects"
  ON public.contractor_projects FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      workspace_id IS NOT NULL
      AND public.get_workspace_user_role(workspace_id) IN ('owner', 'project_manager')
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR (
      workspace_id IS NOT NULL
      AND public.get_workspace_user_role(workspace_id) IN ('owner', 'project_manager')
    )
  );

CREATE POLICY "Only project creators or workspace owners can delete contractor projects"
  ON public.contractor_projects FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      workspace_id IS NOT NULL
      AND public.get_workspace_user_role(workspace_id) = 'owner'
    )
  );
