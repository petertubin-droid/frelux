-- =========================================================
-- INTERNATIONAL PHASE C: country dimension on Pro-Connect
-- =========================================================

-- Pros get a market on their profile so the directory can group
-- and filter by country later. Existing rows stay NG.
ALTER TABLE public.pro_profiles
  ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'NG';

COMMENT ON COLUMN public.pro_profiles.country IS
  'ISO 3166-1 alpha-2 market this professional operates in (NG default).';

-- Fast filtering of seeded service locations by market
CREATE INDEX IF NOT EXISTS idx_pro_locations_country
  ON public.pro_locations (country);
