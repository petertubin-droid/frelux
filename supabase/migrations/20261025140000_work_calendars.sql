-- =========================================================
-- FRELUX Phase 3: evidence-backed work calendars
-- Migration 20261025140000
--
-- Jurisdiction-keyed, versioned calendar data. Planning
-- heuristics stay separate from these sourced operational
-- events. Missing coverage is disclosed, never substituted
-- with a neighbouring jurisdiction's calendar.
--
-- Data source for the seed: qppstudio.net worldwide public
-- holidays database (Nigeria), retrieved 2026-10-25. Entries
-- marked tentative are subject to Federal Government
-- declaration (Eid dates depend on moon sighting; observed
-- Mondays are conventions until gazetted), hence completeness
-- is 'partial', not 'full'.
-- =========================================================

CREATE TABLE IF NOT EXISTS public.work_calendars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL,
  subnational_scope text,
  effective_year int NOT NULL CHECK (effective_year BETWEEN 2020 AND 2100),
  timezone text NOT NULL,
  workweek_days int[] NOT NULL
    CHECK (array_length(workweek_days, 1) BETWEEN 1 AND 7),
  non_working_dates jsonb NOT NULL DEFAULT '[]'::jsonb,
  completeness text NOT NULL DEFAULT 'unknown'
    CHECK (completeness IN ('full', 'partial', 'unknown')),
  source text NOT NULL,
  source_url text,
  last_refreshed_at timestamptz NOT NULL DEFAULT now(),
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (country_code, subnational_scope, effective_year, version)
);

CREATE INDEX IF NOT EXISTS idx_work_calendars_lookup
  ON public.work_calendars (country_code, effective_year);

ALTER TABLE public.work_calendars ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_work_calendars" ON public.work_calendars;
CREATE POLICY "read_work_calendars"
  ON public.work_calendars FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "admin_write_work_calendars" ON public.work_calendars;
CREATE POLICY "admin_write_work_calendars"
  ON public.work_calendars FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Every non-working entry must be an object with a date and a
-- name; tentative, when present, must be a boolean.
CREATE OR REPLACE FUNCTION public.validate_non_working_dates()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  e jsonb;
BEGIN
  IF jsonb_typeof(NEW.non_working_dates) <> 'array' THEN
    RAISE EXCEPTION 'non_working_dates must be an array';
  END IF;
  FOR e IN SELECT * FROM jsonb_array_elements(NEW.non_working_dates) LOOP
    IF jsonb_typeof(e) <> 'object' OR NOT (e ? 'date') OR NOT (e ? 'name')
       OR (e ? 'tentative' AND jsonb_typeof(e->'tentative') <> 'boolean') THEN
      RAISE EXCEPTION 'invalid non-working date entry: %', e::text;
    END IF;
  END LOOP;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_validate_non_working_dates ON public.work_calendars;
CREATE TRIGGER trg_validate_non_working_dates
  BEFORE INSERT OR UPDATE ON public.work_calendars
  FOR EACH ROW EXECUTE FUNCTION public.validate_non_working_dates();

CREATE OR REPLACE FUNCTION public.touch_work_calendar_updated()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_touch_work_calendar ON public.work_calendars;
CREATE TRIGGER trg_touch_work_calendar
  BEFORE UPDATE ON public.work_calendars
  FOR EACH ROW EXECUTE FUNCTION public.touch_work_calendar_updated();

-- Seed: Nigeria 2026 (Africa/Lagos, Monday to Friday workweek)
INSERT INTO public.work_calendars
  (country_code, subnational_scope, effective_year, timezone,
   workweek_days, non_working_dates, completeness, source, source_url)
VALUES
  ('NG', NULL, 2026, 'Africa/Lagos', ARRAY[1,2,3,4,5],
   '[
     {"date":"2026-01-01","name":"New Year''s Day"},
     {"date":"2026-03-09","name":"Id el Fitri","tentative":true},
     {"date":"2026-03-10","name":"Id el Fitri Holiday","tentative":true},
     {"date":"2026-03-26","name":"Good Friday"},
     {"date":"2026-03-29","name":"Easter Monday"},
     {"date":"2026-05-01","name":"Labour Day"},
     {"date":"2026-05-03","name":"Labour Day Holiday","tentative":true},
     {"date":"2026-05-16","name":"Eid al Adha","tentative":true},
     {"date":"2026-05-17","name":"Eid al Adha Holiday","tentative":true},
     {"date":"2026-06-12","name":"Democracy Day"},
     {"date":"2026-06-14","name":"Democracy Day Holiday","tentative":true},
     {"date":"2026-08-14","name":"Eid el Maulud","tentative":true},
     {"date":"2026-10-01","name":"Independence Day"},
     {"date":"2026-12-25","name":"Christmas Day"},
     {"date":"2026-12-26","name":"Boxing Day"},
     {"date":"2026-12-28","name":"Boxing Day Holiday","tentative":true}
   ]'::jsonb,
   'partial',
   'qppstudio.net worldwide public holidays database (Nigeria)',
   'https://www.qppstudio.net/public-holidays/nigeria.htm')
ON CONFLICT (country_code, subnational_scope, effective_year, version)
DO NOTHING;
