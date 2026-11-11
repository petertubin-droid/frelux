-- Allow professionals to describe service coverage in markets without a verified
-- FRELUX city/area registry. This is display text only, not geocoded data.
ALTER TABLE public.pro_profiles
  ADD COLUMN IF NOT EXISTS service_area_text text;

ALTER TABLE public.pro_profiles
  DROP CONSTRAINT IF EXISTS pro_profiles_service_area_text_length_check;
ALTER TABLE public.pro_profiles
  ADD CONSTRAINT pro_profiles_service_area_text_length_check
  CHECK (service_area_text IS NULL OR char_length(service_area_text) <= 160);

COMMENT ON COLUMN public.pro_profiles.service_area_text IS
  'User-entered, non-geocoded service coverage text. Do not use for distance calculations.';
