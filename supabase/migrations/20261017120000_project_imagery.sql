-- =========================================================
-- Engine-1A GIS milestone 4: licensed imagery connectors with
-- license tracking.
--
-- project_imagery: per-project records of the licensed imagery
-- in use. Satellite providers (Esri World Imagery) require a
-- registered record before their tiles render; drone imagery
-- is registered here with license, capture date, coverage and
-- an optional user-hosted XYZ tile URL. Expired licenses are
-- refused at render time by checkImageryLicense().
-- =========================================================

CREATE TABLE IF NOT EXISTS public.project_imagery (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          uuid NOT NULL REFERENCES public.contractor_projects(id) ON DELETE CASCADE,
  user_id             uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  provider_id         text NOT NULL,
  name                text NOT NULL,
  license_name        text NOT NULL,
  license_url         text,
  attribution         text,
  captured_on         date,
  coverage_note       text,
  tile_url_template   text,
  license_expires_on  date,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CHECK (provider_id IN ('osm-standard', 'esri-world-imagery', 'custom')),
  CHECK (provider_id <> 'custom' OR (captured_on IS NOT NULL AND tile_url_template LIKE '%{z}%'))
);

CREATE INDEX IF NOT EXISTS idx_project_imagery_project ON public.project_imagery(project_id);

ALTER TABLE public.project_imagery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_imagery FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_imagery_owner_all" ON public.project_imagery;
CREATE POLICY "project_imagery_owner_all" ON public.project_imagery
  FOR ALL TO authenticated
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

COMMENT ON TABLE public.project_imagery IS
  'Per-project licensed imagery records (satellite basemap usage + drone/hosted imagery registration) with license tracking. checkImageryLicense() refuses missing or expired licenses at render time.';
