-- ============================================================
-- FRELUX takeoff sets.
--
-- A takeoff is the measured schedule behind a quotation: rooms, walls,
-- openings and floor dimensions, plus the bill the engine derived from
-- them. Storing the schedule rather than only the totals means a
-- contractor can reopen it, correct a dimension and re-measure, and the
-- stored warnings show what the engine could not measure.
--
-- The schedule and the bill are jsonb because they are documents, not
-- relational data: their shape is owned by src/lib/takeoff and changes
-- with the engine. project_id keeps the ownership gate relational.
--
-- RLS: authenticated users reach only their own projects, anon nothing.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.project_takeoffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.contractor_projects(id) ON DELETE CASCADE,

  name text NOT NULL,
  -- The measured schedule (rooms, walls, openings, floors).
  schedule jsonb NOT NULL,
  -- Which scopes were measured, in the order the contractor chose them.
  scopes text[] NOT NULL DEFAULT '{}',
  -- Material and waste overrides used for this takeoff.
  specs jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- The derived bill, kept so a saved takeoff reads without recomputation.
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  totals jsonb NOT NULL DEFAULT '[]'::jsonb,
  assumed_line_count integer NOT NULL DEFAULT 0,
  warnings text[] NOT NULL DEFAULT '{}',

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT project_takeoffs_name_not_blank CHECK (length(btrim(name)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_project_takeoffs_project_id
  ON public.project_takeoffs(project_id, updated_at DESC);

ALTER TABLE public.project_takeoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_takeoffs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can CRUD own project takeoffs" ON public.project_takeoffs;
CREATE POLICY "Users can CRUD own project takeoffs"
  ON public.project_takeoffs FOR ALL
  TO authenticated
  USING (
    project_id IN (SELECT id FROM public.contractor_projects WHERE user_id = auth.uid())
  )
  WITH CHECK (
    project_id IN (SELECT id FROM public.contractor_projects WHERE user_id = auth.uid())
  );

CREATE OR REPLACE TRIGGER trg_project_takeoffs_updated_at
  BEFORE UPDATE ON public.project_takeoffs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- A table privilege is a separate gate from row level security: PostgREST
-- checks GRANT first and answers 42501 before any policy runs.
REVOKE ALL ON public.project_takeoffs FROM anon;
REVOKE ALL ON public.project_takeoffs FROM PUBLIC;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_takeoffs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.project_takeoffs TO service_role;

DO $$
BEGIN
  IF NOT has_table_privilege('authenticated', 'public.project_takeoffs', 'INSERT') THEN
    RAISE EXCEPTION 'authenticated cannot write takeoffs';
  END IF;
  IF has_table_privilege('anon', 'public.project_takeoffs', 'SELECT') THEN
    RAISE EXCEPTION 'anon must not be able to read project takeoffs';
  END IF;
END $$;
