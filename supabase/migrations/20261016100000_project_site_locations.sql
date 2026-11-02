-- =========================================================
-- GEOSPATIAL / GIS — milestone 2 (engine #2 of the 1A audit):
-- project/site coordinate capture with EXPLICIT CRS metadata.
--
-- Design (additive; mirrors the workflow engine's RLS pattern):
--   * one site location row per contractor project (UNIQUE),
--   * the pin and optional boundary polygon are ALWAYS stored
--     normalized to WGS-84 (EPSG:4326) degrees — CHECK-enforced,
--   * the CRS the coordinates were captured in is recorded as
--     provenance (source_crs); EPSG:3857 inputs are converted
--     client-side before storage, never stored raw metres,
--   * site_area_m2 is computed with the disclosed spherical
--     formula (~0.5% vs ellipsoid); an accuracy_note explains
--     the measurement basis so nothing is silently certified,
--   * owner-scoped RLS through contractor_projects.user_id.
-- =========================================================

CREATE TABLE IF NOT EXISTS public.project_site_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.contractor_projects(id) ON DELETE CASCADE,
  -- Normalized pin: always WGS-84 degrees.
  lat double precision NOT NULL CHECK (lat >= -90 AND lat <= 90),
  lon double precision NOT NULL CHECK (lon >= -180 AND lon <= 180),
  -- Provenance: the CRS the coordinates were captured in.
  source_crs text NOT NULL DEFAULT 'EPSG:4326'
    CHECK (source_crs IN ('EPSG:4326', 'EPSG:3857')),
  -- Optional boundary: [{ "lat": .., "lon": .. }, ...] WGS-84 degrees, >= 3 vertices enforced client-side.
  polygon jsonb,
  -- Spherical area in m² (disclosed accuracy), NULL when no polygon.
  site_area_m2 double precision,
  accuracy_note text,
  created_date timestamptz NOT NULL DEFAULT now(),
  updated_date timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (project_id)
);

CREATE INDEX IF NOT EXISTS idx_project_site_locations_project
  ON public.project_site_locations(project_id);

ALTER TABLE public.project_site_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_site_locations FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users CRUD own project site location" ON public.project_site_locations;
CREATE POLICY "Users CRUD own project site location"
  ON public.project_site_locations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.contractor_projects p
      WHERE p.id = project_site_locations.project_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contractor_projects p
      WHERE p.id = project_site_locations.project_id
        AND p.user_id = auth.uid()
    )
  );

-- Keep updated_date honest on modification.
CREATE OR REPLACE FUNCTION public.touch_project_site_location()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_date := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_project_site_location ON public.project_site_locations;
CREATE TRIGGER trg_touch_project_site_location
  BEFORE UPDATE ON public.project_site_locations
  FOR EACH ROW EXECUTE FUNCTION public.touch_project_site_location();
