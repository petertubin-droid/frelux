-- =========================================================
-- INTERNATIONAL PHASE A: country on marketplace + pro locations
-- =========================================================
-- Additive country columns so listings, products and pro service
-- locations can belong to other markets. Defaults keep every
-- existing row and behaviour identical (NG flagship market).

ALTER TABLE public.marketplace_listings
  ADD COLUMN IF NOT EXISTS location_country text NOT NULL DEFAULT 'NG';

ALTER TABLE public.marketplace_products
  ADD COLUMN IF NOT EXISTS location_country text NOT NULL DEFAULT 'NG';

ALTER TABLE public.pro_locations
  ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'NG';

COMMENT ON COLUMN public.marketplace_listings.location_country IS
  'ISO 3166-1 alpha-2 market of the listing location (NG default).';
COMMENT ON COLUMN public.marketplace_products.location_country IS
  'ISO 3166-1 alpha-2 market of the product location (NG default).';
COMMENT ON COLUMN public.pro_locations.country IS
  'ISO 3166-1 alpha-2 market of this service location (NG default).';

CREATE INDEX IF NOT EXISTS idx_ml_location_country
  ON public.marketplace_listings (location_country, location_state);
CREATE INDEX IF NOT EXISTS idx_products_location_country
  ON public.marketplace_products (location_country, location_state);
